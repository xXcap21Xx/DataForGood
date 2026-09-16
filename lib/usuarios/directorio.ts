import { pool } from "@/lib/db";
import {
  nombreDeRolPrincipal,
  rolVigenteDesde,
  type RolAsignable,
} from "@/lib/usuarios/rol-asignable";
import type { TonoDeEtiqueta } from "@/lib/usuarios/supervisores";

export type { RolAsignable } from "@/lib/usuarios/rol-asignable";
export { CODIGO_DE_ROL, NOMBRE_DE_ROL, QUIEN_ASIGNA } from "@/lib/usuarios/rol-asignable";

/* ── modelo ─────────────────────────────────────────────────────────────── */

export type EstadoDeCuenta = "ACTIVA" | "CON_STRIKES" | "SUSPENDIDA" | "BANEADA";

export type FilaDeUsuario = {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  /** Aclaración bajo el rol, p. ej. "(y creador de campañas)". */
  rolDetalle?: string;
  estado: EstadoDeCuenta;
  strikes: number;
};

export type Usuario = FilaDeUsuario & {
  ubicacion: string | null;
  especialidad: string | null;
  registradoEn: Date;
  campanasCreadas: number;
  aportesEnviados: number;
  aportesAceptados: number;
  rolVigente: RolAsignable | null;
  rolDesde: Date | null;
  interesesDeclarados: { tema: string; campanas: number }[];
  historialDeStrikes: { motivo: string; fecha: Date; campana: string }[];
};

export type ReporteDeSancion = {
  id: string;
  campana: string;
  campanaId: string;
  creadorDeCampana: string;
  reportadoPor: string;
  reportadoEn: Date;
  motivoDelRechazo: string;
  aporte: {
    id: string;
    descripcion: string;
    archivo: string;
    enviadoEn: Date;
    ubicacion: string | null;
  };
};

export type TipoDeSancion = "STRIKE" | "BANEO_DE_CAMPANA" | "SUSPENSION_TEMPORAL";

export type SancionActiva = {
  id: string;
  usuarioId: string;
  usuario: string;
  desde: Date;
  etiqueta: string;
  tono: TonoDeEtiqueta;
  motivo: string;
};

/* ── etiquetas de presentación ──────────────────────────────────────────── */

/** Mismos tonos que components/sistema/Tag. */
export const ETIQUETA_DE_ESTADO: Record<
  EstadoDeCuenta,
  { texto: string; tono: TonoDeEtiqueta }
> = {
  ACTIVA: { texto: "Activo", tono: "ok" },
  CON_STRIKES: { texto: "Con strikes", tono: "warn" },
  SUSPENDIDA: { texto: "Suspendida", tono: "danger" },
  BANEADA: { texto: "Baneada", tono: "danger" },
};


/* ── formato ────────────────────────────────────────────────────────────── */

const fechaCorta = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Mazatlan",
});

const fechaConHora = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Mazatlan",
});

export const formatearFecha = (f: Date) => fechaCorta.format(f);
export const formatearFechaYHora = (f: Date) => fechaConHora.format(f);

/*
 * ────────────────────────────────────────────────────────────────────────────
 * ESTADO DE CONEXIÓN
 *
 * buscarUsuarios y obtenerUsuario ya leen la tabla real `usuarios` (la misma
 * que usan el registro y `/api/usuarios`). El nombre, correo, rol y fecha de
 * registro son reales; campañas creadas y aportes enviados/aceptados salen de
 * COUNT() reales contra `campanas` y `aportes`.
 *
 * Lo que SIGUE siendo de muestra, porque no existe tabla para eso todavía:
 *   - estado de cuenta más allá de "ACTIVA" (no hay strikes, suspensión ni
 *     baneo en la BD): toda cuenta real se reporta como ACTIVA con 0 strikes.
 *   - historialDeStrikes: siempre vacío.
 *   - rolDesde: no se guarda cuándo se asignó el rol, así que va en null.
 *   - interesesDeclarados: la columna `intereses` es una lista de strings, no
 *     tiene el conteo de campañas por tema del mockup, así que ese conteo
 *     queda en 0.
 *   - listarSancionesActivas / obtenerReporteDeSancion: sin tabla de
 *     sanciones, siguen devolviendo datos de muestra (ver más abajo).
 * ────────────────────────────────────────────────────────────────────────────
 */

export const POR_PAGINA = 20;

type FilaUsuarioDB = {
  id: number;
  nombre: string;
  apellidos: string;
  email: string;
  role: string[] | null;
};

function filaDesdeDB(row: FilaUsuarioDB): FilaDeUsuario {
  const roles = row.role ?? [];
  return {
    id: String(row.id),
    nombre: `${row.nombre} ${row.apellidos}`.trim(),
    correo: row.email,
    rol: nombreDeRolPrincipal(roles),
    estado: "ACTIVA",
    strikes: 0,
  };
}

export async function buscarUsuarios(opciones: {
  q?: string;
  rol?: string;
  estado?: string;
  pagina?: number;
}): Promise<{ filas: FilaDeUsuario[]; total: number; pagina: number }> {
  const pagina = Math.max(1, opciones.pagina ?? 1);
  const q = (opciones.q ?? "").trim();
  const rol = (opciones.rol ?? "").trim();
  const estado = (opciones.estado ?? "").trim();

  // Ninguna cuenta real puede tener otro estado todavía (ver nota arriba):
  // filtrar por algo distinto de ACTIVA siempre da una lista vacía.
  if (estado && estado !== "ACTIVA") {
    return { filas: [], total: 0, pagina };
  }

  const condiciones: string[] = [];
  const valores: Array<string | number> = [];

  if (q) {
    valores.push(`%${q}%`);
    const posicion = valores.length;
    condiciones.push(
      `(nombre ILIKE $${posicion} OR apellidos ILIKE $${posicion} OR email ILIKE $${posicion} OR CAST(id AS TEXT) = $${posicion + 1})`,
    );
    valores.push(q);
  }

  if (rol) {
    valores.push(JSON.stringify([rol]));
    condiciones.push(`role @> $${valores.length}::jsonb`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";

  const totalResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) FROM usuarios ${where}`,
    valores,
  );
  const total = Number(totalResult.rows[0]?.count ?? 0);

  const offset = (pagina - 1) * POR_PAGINA;
  const valoresConPaginacion = [...valores, POR_PAGINA, offset];
  const posicionLimit = valoresConPaginacion.length - 1;
  const posicionOffset = valoresConPaginacion.length;

  const result = await pool.query<FilaUsuarioDB>(
    `SELECT id, nombre, apellidos, email, role
     FROM usuarios
     ${where}
     ORDER BY id DESC
     LIMIT $${posicionLimit} OFFSET $${posicionOffset}`,
    valoresConPaginacion,
  );

  return { filas: result.rows.map(filaDesdeDB), total, pagina };
}

export async function obtenerUsuario(id: string): Promise<Usuario | null> {
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) return null;

  const result = await pool.query<
    FilaUsuarioDB & {
      state: string | null;
      city: string | null;
      specialty: string | null;
      intereses: string[] | null;
      created_at: string;
    }
  >(
    `SELECT id, nombre, apellidos, email, role, state, city, specialty, intereses, created_at
     FROM usuarios WHERE id = $1 LIMIT 1`,
    [numericId],
  );
  const row = result.rows[0];
  if (!row) return null;

  const [campanasResult, aportesResult] = await Promise.all([
    pool.query<{ count: string }>(`SELECT COUNT(*) FROM campanas WHERE creator_id = $1`, [
      numericId,
    ]),
    pool.query<{ total: string; aceptados: string }>(
      `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'aceptado') AS aceptados
       FROM aportes WHERE user_id = $1`,
      [numericId],
    ),
  ]);

  return {
    ...filaDesdeDB(row),
    ubicacion: row.city && row.state ? `${row.city}, ${row.state}` : row.city || row.state || null,
    especialidad: row.specialty || null,
    registradoEn: new Date(row.created_at),
    campanasCreadas: Number(campanasResult.rows[0]?.count ?? 0),
    aportesEnviados: Number(aportesResult.rows[0]?.total ?? 0),
    aportesAceptados: Number(aportesResult.rows[0]?.aceptados ?? 0),
    rolVigente: rolVigenteDesde(row.role ?? []),
    rolDesde: null,
    interesesDeclarados: (row.intereses ?? []).map((tema) => ({ tema, campanas: 0 })),
    historialDeStrikes: [],
  };
}

export async function obtenerReporteDeSancion(
  usuarioId: string,
): Promise<ReporteDeSancion | null> {
  if (usuarioId !== "8412") return null;

  return {
    id: "R-2841",
    campana: "Censo de árboles urbanos",
    campanaId: "17",
    creadorDeCampana: "Ana Ruiz",
    reportadoPor: "Diego Salas · revisor",
    reportadoEn: new Date("2026-08-14T16:48:00Z"),
    motivoDelRechazo: "Contenido fuera de tema",
    aporte: {
      id: "4903",
      descripcion: "Foto de mi perro en el parque, no encontré árboles cerca.",
      archivo: "IMG_2903.jpg",
      enviadoEn: new Date("2026-08-14T16:31:00Z"),
      ubicacion: "21.5041, −104.8946",
    },
  };
}

export async function listarSancionesActivas(): Promise<SancionActiva[]> {
  return [
    {
      id: "S-114",
      usuarioId: "3390",
      usuario: "Sofía Herrera",
      desde: new Date("2026-08-09T12:00:00Z"),
      etiqueta: "7 días",
      tono: "danger",
      motivo: "Envío masivo de aportes duplicados",
    },
    {
      id: "S-108",
      usuarioId: "5521",
      usuario: "Iván Torres",
      desde: new Date("2026-08-02T12:00:00Z"),
      etiqueta: "Permanente",
      tono: "danger",
      motivo: "Contenido inapropiado reiterado",
    },
    {
      id: "S-121",
      usuarioId: "6740",
      usuario: "Mara Ortiz",
      desde: new Date("2026-08-12T12:00:00Z"),
      etiqueta: "Advertencia",
      tono: "warn",
      motivo: "Aporte fuera del tema de campaña",
    },
  ];
}
