// Aporte de una persona SIN cuenta, desde el enlace público de una campaña (/c/[token]).
// Lo llaman POST /api/c/[token]/aportes (enviar) y la página /c/[token] (cuántos le quedan).
//
// Reglas (decididas el 2026-10-01, dominio.md § 6 y punto abierto 7):
//   - Solo con un enlace VIGENTE de una campaña ACTIVA. Sin enlace no hay forma de aportar
//     sin cuenta: la persona anónima no ve ni toca nada más del sistema.
//   - El aporte no lleva datos personales: user_id NULL, participante "Anónimo", sin correo.
//   - Cuota por dispositivo: la misma cuota por persona de la campaña, contada por una cookie
//     anónima (anonimo_id). En la BD solo se guarda su sha256 (aportes.anonimo_id).
//   - Tope por IP en memoria (TOPE_POR_IP_POR_HORA) contra quien borre la cookie para
//     inundar la campaña. No se guarda la IP en la BD.

import { createHash, randomBytes } from "node:crypto";
import { pool } from "@/lib/db";
import { saveUploadedFile } from "@/lib/minio";
import { LARGO_MAXIMO_DESCRIPCION, errorDeArchivo, sumarAporteALaCampana } from "@/lib/aportes/comun";
import { respuestasValidas } from "@/lib/campanas/checklist";
import { buscarEnlacePorToken } from "@/lib/campanas/enlaces";

/** Cookie con el identificador del dispositivo (32 bytes aleatorios en hex). */
export const COOKIE_ANONIMO = "anonimo_id";
const FORMATO_DE_DISPOSITIVO = /^[a-f0-9]{64}$/;

// TODO(dominio): valor elegido sin consulta. Aportes anónimos por IP en una hora, sumando
// todas las campañas. Holgado para varias personas en la misma red (escuela, oficina).
export const TOPE_POR_IP_POR_HORA = 20;
const VENTANA_MS = 60 * 60 * 1000;

/**
 * Ventana en memoria, como el límite de /root: se reinicia con cada despliegue y no se
 * comparte entre instancias. Basta para frenar abuso; la cuota por dispositivo sí persiste.
 */
const enviosPorIp = new Map<string, { n: number; desde: number }>();

function topeAlcanzado(ip: string): boolean {
  const registro = enviosPorIp.get(ip);
  return Boolean(registro && Date.now() - registro.desde <= VENTANA_MS && registro.n >= TOPE_POR_IP_POR_HORA);
}

function contarEnvio(ip: string): void {
  const ahora = Date.now();
  const registro = enviosPorIp.get(ip);
  if (!registro || ahora - registro.desde > VENTANA_MS) enviosPorIp.set(ip, { n: 1, desde: ahora });
  else registro.n += 1;
}

function hashDeDispositivo(valor: string): string {
  return createHash("sha256").update(valor).digest("hex");
}

/** El identificador de la cookie si es válido; si no, null (hay que crear uno). */
export function dispositivoValido(valor: string | undefined | null): string | null {
  return valor && FORMATO_DE_DISPOSITIVO.test(valor) ? valor : null;
}

/** Aportes que este dispositivo ya envió a la campaña (0 si no tiene cookie). */
export async function aportesDelDispositivo(campanaId: number, dispositivo: string | null): Promise<number> {
  if (!dispositivo) return 0;
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM aportes WHERE campaign_id = $1 AND anonimo_id = $2`,
    [campanaId, hashDeDispositivo(dispositivo)]
  );
  return Number(rows[0]?.n ?? 0);
}

export type ResultadoDeAporteAnonimo =
  | { ok: true; restantes: number; dispositivo: string; dispositivoNuevo: boolean }
  | { ok: false; status: number; error: string };

export async function enviarAporteAnonimo(entrada: {
  token: string;
  dispositivo: string | null;
  ip: string;
  descripcion: string;
  caracteristicas: string[];
  archivo: FormDataEntryValue | null;
}): Promise<ResultadoDeAporteAnonimo> {
  const resultado = await buscarEnlacePorToken(entrada.token.toLowerCase());
  if (resultado.tipo === "inexistente") return { ok: false, status: 404, error: "Enlace no válido" };
  if (resultado.tipo !== "valido") return { ok: false, status: 410, error: "Este enlace ya no permite aportar" };
  const { campana, enlace } = resultado;
  if (campana.status !== "activa") return { ok: false, status: 409, error: "Esta campaña ya no está recibiendo aportes" };

  if (topeAlcanzado(entrada.ip)) {
    return { ok: false, status: 429, error: "Se enviaron demasiados aportes desde tu red. Intenta más tarde." };
  }

  const descripcion = entrada.descripcion.trim();
  if (!descripcion) return { ok: false, status: 400, error: "La descripción es obligatoria" };
  if (descripcion.length > LARGO_MAXIMO_DESCRIPCION) {
    return { ok: false, status: 400, error: "La descripción no puede superar 1000 caracteres" };
  }
  const errorArchivo = errorDeArchivo(entrada.archivo);
  if (errorArchivo || !(entrada.archivo instanceof File)) {
    return { ok: false, status: 400, error: errorArchivo ?? "El archivo es obligatorio" };
  }

  const dispositivoNuevo = entrada.dispositivo === null;
  const dispositivo = entrada.dispositivo ?? randomBytes(32).toString("hex");
  const yaEnviados = await aportesDelDispositivo(campana.id, dispositivo);
  if (yaEnviados >= campana.cuotaPorPersona) {
    return { ok: false, status: 400, error: "Ya enviaste todos los aportes que permite esta campaña" };
  }

  // Solo respuestas que existen en los checklists de la campaña ("Título: opción").
  const caracteristicas = respuestasValidas(entrada.caracteristicas, campana.secciones);
  const guardado = await saveUploadedFile(entrada.archivo, `campanas/${campana.id}`);

  await pool.query(
    `INSERT INTO aportes (
      campaign_id, user_id, participant_name, participant_email, description,
      file_type, file_path, file_original_name, file_mime_type, file_size_bytes,
      caracteristicas, enlace_id, anonimo_id
    ) VALUES ($1, NULL, 'Anónimo', NULL, $2, 'foto', $3, NULL, $4, $5, $6::jsonb, $7, $8)`,
    // file_original_name va NULL: el nombre del archivo puede traer datos personales.
    [
      campana.id,
      descripcion,
      guardado.relativePath,
      guardado.mimeType,
      guardado.sizeBytes,
      JSON.stringify(caracteristicas),
      enlace.id,
      hashDeDispositivo(dispositivo),
    ]
  );
  await sumarAporteALaCampana(campana.id, yaEnviados === 0);
  contarEnvio(entrada.ip);

  return { ok: true, restantes: campana.cuotaPorPersona - yaEnviados - 1, dispositivo, dispositivoNuevo };
}
