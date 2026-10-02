// Aporte de una persona SIN cuenta, desde el enlace público de una campaña (/c/[token]).
// Lo llaman POST /api/c/[token]/aportes (enviar) y la página /c/[token] (cuántos le quedan).
//
// Reglas (decididas el 2026-10-01, dominio.md § 6 y puntos abiertos 7 y 18):
//   - Solo con un enlace VIGENTE de una campaña ACTIVA que permita aportes sin cuenta
//     (campanas.permite_anonimos). Sin enlace no hay forma de aportar sin cuenta: la
//     persona anónima no ve ni toca nada más del sistema.
//   - El aporte no lleva datos personales: user_id NULL, participante "Anónimo", sin correo,
//     sin nombre de archivo y la foto sin metadatos (lib/aportes/imagen.ts).
//   - Cuota por dispositivo: la misma cuota por persona de la campaña, contada por una cookie
//     anónima (lib/aportes/anonimato.ts). En la BD solo va su sha256 (aportes.anonimo_id).
//   - Red: se guarda el HMAC de la IP (aportes.ip_hmac), nunca la IP. Sirve para el bloqueo
//     global de lib/aportes/sanciones-anonimas.ts.
//   - Tope por IP en memoria (TOPE_POR_IP_POR_HORA) contra quien borre la cookie para
//     inundar la campaña.
//   - Espera entre aportes (ESPERA_ENTRE_APORTES_SEGUNDOS) por dispositivo, en cualquier
//     campaña: frena a quien manda uno tras otro. Se mide con aportes.submitted_at.
//   - Un dispositivo bloqueado en la campaña o en la plataforma no puede aportar.

import { randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "@/lib/db";
import { LARGO_MAXIMO_DESCRIPCION, errorDeArchivo, guardarFotoDelAporte, insertarAporteConCuota } from "@/lib/aportes/comun";
import { hashDeDispositivo, hmacDeIp } from "@/lib/aportes/anonimato";
import { bloqueoDelDispositivo } from "@/lib/aportes/sanciones-anonimas";
import { registrarAuditoria } from "@/lib/auditoria";
import { respuestasValidas } from "@/lib/campanas/checklist";
import { buscarEnlacePorToken } from "@/lib/campanas/enlaces";

// TODO(dominio): valor elegido sin consulta. Aportes anónimos por IP en una hora, sumando
// todas las campañas. Holgado para varias personas en la misma red (escuela, oficina).
export const TOPE_POR_IP_POR_HORA = 20;
const VENTANA_MS = 60 * 60 * 1000;

// TODO(dominio): valor elegido sin consulta (2026-10-01). Segundos mínimos entre dos aportes
// sin cuenta del mismo dispositivo, en cualquier campaña.
export const ESPERA_ENTRE_APORTES_SEGUNDOS = 60;

/**
 * Ventana en memoria, como el límite de /root: se reinicia con cada despliegue y no se
 * comparte entre instancias. Basta para frenar abuso; la cuota por dispositivo sí persiste.
 * Las IPs vencidas se podan como mucho una vez por minuto, para que el Map no crezca sin fin.
 */
const enviosPorIp = new Map<string, { n: number; desde: number }>();
let ultimaPoda = 0;

function podarVencidas(ahora: number): void {
  if (ahora - ultimaPoda < 60_000) return;
  ultimaPoda = ahora;
  for (const [ip, registro] of enviosPorIp) {
    if (ahora - registro.desde > VENTANA_MS) enviosPorIp.delete(ip);
  }
}

function topeAlcanzado(ip: string): boolean {
  const registro = enviosPorIp.get(ip);
  return Boolean(registro && Date.now() - registro.desde <= VENTANA_MS && registro.n >= TOPE_POR_IP_POR_HORA);
}

function contarEnvio(ip: string): void {
  const ahora = Date.now();
  podarVencidas(ahora);
  const registro = enviosPorIp.get(ip);
  if (!registro || ahora - registro.desde > VENTANA_MS) enviosPorIp.set(ip, { n: 1, desde: ahora });
  else registro.n += 1;
}

/** HMAC de la IP, o null si no se conoce (no hay que agrupar a todos los "desconocida"). */
export function ipHmacDe(ip: string): string | null {
  return ip && ip !== "desconocida" ? hmacDeIp(ip) : null;
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

/**
 * Segundos que le faltan a este dispositivo para poder enviar otro aporte (0 si ya puede).
 * Recibe el hash (aportes.anonimo_id). Se calcula en la BD para no depender del reloj de la app.
 */
export async function segundosDeEspera(
  anonimoId: string | null,
  client: Pick<PoolClient, "query"> = pool
): Promise<number> {
  if (!anonimoId) return 0;
  const { rows } = await client.query<{ faltan: number | null }>(
    `SELECT CEIL(EXTRACT(EPOCH FROM (MAX(submitted_at) + make_interval(secs => $2) - LOCALTIMESTAMP)))::int AS faltan
     FROM aportes WHERE anonimo_id = $1`,
    [anonimoId, ESPERA_ENTRE_APORTES_SEGUNDOS]
  );
  return Math.max(0, Number(rows[0]?.faltan ?? 0));
}

/**
 * Igual, pero contando el último aporte anónimo de la red (aportes.ip_hmac). Se aplica
 * solo a envíos SIN cookie: sin ella cada envío era un "dispositivo nuevo" y se saltaba
 * la espera. Quien ya tiene cookie no espera por lo que mandan otros en su red.
 */
async function segundosDeEsperaDeRed(ipHmac: string | null, client: Pick<PoolClient, "query"> = pool): Promise<number> {
  if (!ipHmac) return 0;
  const { rows } = await client.query<{ faltan: number | null }>(
    `SELECT CEIL(EXTRACT(EPOCH FROM (MAX(submitted_at) + make_interval(secs => $2) - LOCALTIMESTAMP)))::int AS faltan
     FROM aportes WHERE ip_hmac = $1`,
    [ipHmac, ESPERA_ENTRE_APORTES_SEGUNDOS]
  );
  return Math.max(0, Number(rows[0]?.faltan ?? 0));
}

function mensajeDeEspera(segundos: number): string {
  return `Espera ${segundos} ${segundos === 1 ? "segundo" : "segundos"} antes de enviar otro aporte.`;
}

/** Para /c/[token]: segundos de espera del dispositivo de la cookie (0 si no tiene). */
export async function esperaDelDispositivo(dispositivo: string | null): Promise<number> {
  return segundosDeEspera(dispositivo ? hashDeDispositivo(dispositivo) : null);
}

/** Lo que ve /c/[token] para decidir si muestra el formulario. */
export async function bloqueoParaLaPagina(campanaId: number, dispositivo: string | null, ip: string) {
  return bloqueoDelDispositivo({
    campanaId,
    anonimoId: dispositivo ? hashDeDispositivo(dispositivo) : null,
    ipHmac: ipHmacDe(ip),
  });
}

export const MENSAJE_BLOQUEADO = "No puedes enviar aportes sin cuenta a esta campaña.";

export type ResultadoDeAporteAnonimo =
  | { ok: true; restantes: number; esperaSegundos: number; dispositivo: string; dispositivoNuevo: boolean }
  | { ok: false; status: number; error: string; esperaSegundos?: number };

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
  if (!campana.permiteAnonimos) {
    return { ok: false, status: 403, error: "Esta campaña solo recibe aportes con cuenta." };
  }

  if (topeAlcanzado(entrada.ip)) {
    return { ok: false, status: 429, error: "Se enviaron demasiados aportes desde tu red. Intenta más tarde." };
  }

  const ipHmac = ipHmacDe(entrada.ip);
  const dispositivoNuevo = entrada.dispositivo === null;
  const dispositivo = entrada.dispositivo ?? randomBytes(32).toString("hex");
  const anonimoId = hashDeDispositivo(dispositivo);
  // Un dispositivo nuevo no puede estar bloqueado por cookie, pero su red sí.
  if (await bloqueoDelDispositivo({ campanaId: campana.id, anonimoId, ipHmac })) {
    return { ok: false, status: 403, error: MENSAJE_BLOQUEADO };
  }

  // Aviso rápido de la espera, antes de subir nada; la comprobación que cuenta va en la transacción.
  const faltan = Math.max(await segundosDeEspera(anonimoId), dispositivoNuevo ? await segundosDeEsperaDeRed(ipHmac) : 0);
  if (faltan > 0) return { ok: false, status: 429, error: mensajeDeEspera(faltan), esperaSegundos: faltan };

  const descripcion = entrada.descripcion.trim();
  if (!descripcion) return { ok: false, status: 400, error: "La descripción es obligatoria" };
  if (descripcion.length > LARGO_MAXIMO_DESCRIPCION) {
    return { ok: false, status: 400, error: "La descripción no puede superar 1000 caracteres" };
  }
  const errorArchivo = errorDeArchivo(entrada.archivo);
  if (errorArchivo || !(entrada.archivo instanceof File)) {
    return { ok: false, status: 400, error: errorArchivo ?? "El archivo es obligatorio" };
  }

  // Aviso rápido antes de subir nada; la comprobación que cuenta va dentro de la transacción.
  const MENSAJE_CUOTA = "Ya enviaste todos los aportes que permite esta campaña";
  if ((await aportesDelDispositivo(campana.id, dispositivo)) >= campana.cuotaPorPersona) {
    return { ok: false, status: 400, error: MENSAJE_CUOTA };
  }

  // Solo respuestas que existen en los checklists de la campaña ("Título: opción").
  const caracteristicas = respuestasValidas(entrada.caracteristicas, campana.secciones);
  const foto = await guardarFotoDelAporte(entrada.archivo, campana.id);
  if (!foto.ok) return { ok: false, status: 400, error: foto.error };

  const insertado = await insertarAporteConCuota({
    campaignId: campana.id,
    persona: `dispositivo:${anonimoId}`,
    cuota: campana.cuotaPorPersona,
    archivoSubido: foto.guardado.relativePath,
    comprobar: async (client) => {
      // Candado por dispositivo (el de la cuota es por campaña): dos envíos simultáneos a
      // campañas distintas tampoco se saltan la espera.
      await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [`espera:${anonimoId}`]);
      // Sin cookie, además un candado por red: varios envíos sin cookie a la vez esperan entre sí.
      if (dispositivoNuevo && ipHmac) {
        await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [`espera-red:${ipHmac}`]);
      }
      const segundos = Math.max(
        await segundosDeEspera(anonimoId, client),
        dispositivoNuevo ? await segundosDeEsperaDeRed(ipHmac, client) : 0
      );
      return segundos > 0 ? { error: mensajeDeEspera(segundos), esperaSegundos: segundos } : null;
    },
    contar: async (client) => {
      const { rows } = await client.query(
        `SELECT COUNT(*)::int AS n FROM aportes WHERE campaign_id = $1 AND anonimo_id = $2`,
        [campana.id, anonimoId]
      );
      return Number(rows[0]?.n ?? 0);
    },
    insertar: async (client) => {
      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO aportes (
          campaign_id, user_id, participant_name, participant_email, description,
          file_type, file_path, file_original_name, file_mime_type, file_size_bytes,
          caracteristicas, enlace_id, anonimo_id, ip_hmac
        ) VALUES ($1, NULL, 'Anónimo', NULL, $2, 'foto', $3, NULL, $4, $5, $6::jsonb, $7, $8, $9)
        RETURNING id`,
        // file_original_name va NULL: el nombre del archivo puede traer datos personales.
        [
          campana.id,
          descripcion,
          foto.guardado.relativePath,
          foto.guardado.mimeType,
          foto.guardado.sizeBytes,
          JSON.stringify(caracteristicas),
          enlace.id,
          anonimoId,
          ipHmac,
        ]
      );
      return rows[0].id;
    },
  });
  if (!insertado.ok) {
    return insertado.motivo === "espera"
      ? { ok: false, status: 429, error: insertado.error, esperaSegundos: insertado.esperaSegundos }
      : { ok: false, status: 400, error: MENSAJE_CUOTA };
  }
  contarEnvio(entrada.ip);

  // Sin IP en claro: el aporte ya guarda su HMAC.
  await registrarAuditoria({
    actor: { tipo: "anonimo" },
    accion: "aporte.anonimo_enviar",
    objetivo: { tipo: "aporte", id: insertado.fila },
    detalle: { campanaId: campana.id, enlaceId: enlace.id },
    guardarIp: false,
  });

  return {
    ok: true,
    restantes: campana.cuotaPorPersona - insertado.yaEnviados - 1,
    esperaSegundos: ESPERA_ENTRE_APORTES_SEGUNDOS,
    dispositivo,
    dispositivoNuevo,
  };
}
