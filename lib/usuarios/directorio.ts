import { pool } from "@/lib/db";
import {
  ensureAportesTable,
  ensureCampanasTable,
  ensureSancionesTable,
  ensureUsuariosTable,
} from "@/lib/db-schema";
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
 * buscarUsuarios y obtenerUsuario leen la tabla real `usuarios` (la misma que
 * usan el registro y `/api/usuarios`). Nombre, correo, rol, fecha de registro,
 * campañas creadas y aportes enviados/aceptados son reales. `estado`, `strikes`
 * y `historialDeStrikes` salen de la tabla real `sanciones` (ver
 * ensureSancionesTable en lib/db-schema.ts): un STRIKE nunca se borra (el
 * contador es para siempre, según acciones-usuarios.ts), y SUSPENDIDA/BANEADA
 * dependen de que haya una sanción de tipo SUSPENSION_TEMPORAL (sin vencer) o
 * BANEO_DE_CAMPANA todavía activa (`activa = true`, sin restaurar).
 *
 * Lo que SIGUE siendo de muestra, porque no existe tabla o flujo para eso:
 *   - rolDesde: no se guarda cuándo se asignó el rol, así que va en null.
 *   - interesesDeclarados: la columna `intereses` es una lista de strings, no
 *     tiene el conteo de campañas por tema del mockup, así que ese conteo
 *     queda en 0.
 *   - obtenerReporteDeSancion: no hay flujo de "reportar un aporte para
 *     sanción" en la app y ninguna pantalla la usa; se deja como estaba.
 *   - El TODO de acciones-usuarios.ts sigue abierto: al tercer STRIKE no hay
 *     escalamiento automático a BANEADA todavía (hay que aplicar el baneo a
 *     mano). El contador de strikes ya es real y visible.
 * ────────────────────────────────────────────────────────────────────────────
 */

export const POR_PAGINA = 20;

type FilaUsuarioDB = {
  id: number;
  nombre: string;
  apellidos: string;
  email: string;
  role: string[] | null;
  strikes: string | number;
  suspendida: boolean;
  baneada: boolean;
};

/** Subconsulta agregada: una fila por usuario con sus sanciones resumidas. */
export const RESUMEN_DE_SANCIONES = `
  LEFT JOIN (
    SELECT
      usuario_id,
      COUNT(*) FILTER (WHERE tipo = 'STRIKE') AS strikes,
      BOOL_OR(
        activa AND tipo = 'SUSPENSION_TEMPORAL'
        AND aplicada_en + (COALESCE(dias, 0) || ' days')::interval > NOW()
      ) AS suspendida,
      BOOL_OR(activa AND tipo = 'BANEO_DE_CAMPANA') AS baneada
    FROM sanciones
    GROUP BY usuario_id
  ) rs ON rs.usuario_id = u.id
`;

export function estadoDesdeSanciones(strikes: number, suspendida: boolean, baneada: boolean): EstadoDeCuenta {
  if (baneada) return "BANEADA";
  if (suspendida) return "SUSPENDIDA";
  if (strikes > 0) return "CON_STRIKES";
  return "ACTIVA";
}

function filaDesdeDB(row: FilaUsuarioDB): FilaDeUsuario {
  const roles = row.role ?? [];
  const strikes = Number(row.strikes ?? 0);
  return {
    id: String(row.id),
    nombre: `${row.nombre} ${row.apellidos}`.trim(),
    correo: row.email,
    rol: nombreDeRolPrincipal(roles),
    estado: estadoDesdeSanciones(strikes, Boolean(row.suspendida), Boolean(row.baneada)),
    strikes,
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
  const estado = (opciones.estado ?? "").trim() as EstadoDeCuenta | "";

  // En una BD recién levantada `usuarios`/`sanciones` todavía no existen (las
  // crea bajo demanda el registro y el panel de sanciones): sin este
  // try/catch, la primera visita al directorio tumba la página con
  // "relation ... does not exist" en vez de mostrar la lista vacía.
  try {
    await ensureUsuariosTable();
    await ensureSancionesTable();

    const condiciones: string[] = [];
    const valores: Array<string | number> = [];

    if (q) {
      valores.push(`%${q}%`);
      const posicion = valores.length;
      condiciones.push(
        `(u.nombre ILIKE $${posicion} OR u.apellidos ILIKE $${posicion} OR u.email ILIKE $${posicion} OR CAST(u.id AS TEXT) = $${posicion + 1})`,
      );
      valores.push(q);
    }

    if (rol) {
      valores.push(JSON.stringify([rol]));
      condiciones.push(`u.role @> $${valores.length}::jsonb`);
    }

    const condicionDeEstado: Record<EstadoDeCuenta, string> = {
      ACTIVA: "NOT COALESCE(rs.baneada, false) AND NOT COALESCE(rs.suspendida, false) AND COALESCE(rs.strikes, 0) = 0",
      CON_STRIKES: "NOT COALESCE(rs.baneada, false) AND NOT COALESCE(rs.suspendida, false) AND COALESCE(rs.strikes, 0) > 0",
      SUSPENDIDA: "NOT COALESCE(rs.baneada, false) AND COALESCE(rs.suspendida, false)",
      BANEADA: "COALESCE(rs.baneada, false)",
    };
    if (estado) {
      condiciones.push(condicionDeEstado[estado]);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";

    const totalResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*)
       FROM usuarios u
       ${RESUMEN_DE_SANCIONES}
       ${where}`,
      valores,
    );
    const total = Number(totalResult.rows[0]?.count ?? 0);

    const offset = (pagina - 1) * POR_PAGINA;
    const valoresConPaginacion = [...valores, POR_PAGINA, offset];
    const posicionLimit = valoresConPaginacion.length - 1;
    const posicionOffset = valoresConPaginacion.length;

    const result = await pool.query<FilaUsuarioDB>(
      `SELECT u.id, u.nombre, u.apellidos, u.email, u.role,
              COALESCE(rs.strikes, 0) AS strikes,
              COALESCE(rs.suspendida, false) AS suspendida,
              COALESCE(rs.baneada, false) AS baneada
       FROM usuarios u
       ${RESUMEN_DE_SANCIONES}
       ${where}
       ORDER BY u.id DESC
       LIMIT $${posicionLimit} OFFSET $${posicionOffset}`,
      valoresConPaginacion,
    );

    return { filas: result.rows.map(filaDesdeDB), total, pagina };
  } catch (error) {
    console.error("Error buscando usuarios", error);
    return { filas: [], total: 0, pagina };
  }
}

export async function obtenerUsuario(id: string): Promise<Usuario | null> {
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) return null;

  try {
    await ensureUsuariosTable();
    await ensureSancionesTable();

    const result = await pool.query<
      FilaUsuarioDB & {
        state: string | null;
        city: string | null;
        specialty: string | null;
        intereses: string[] | null;
        created_at: string;
      }
    >(
      `SELECT u.id, u.nombre, u.apellidos, u.email, u.role, u.state, u.city, u.specialty, u.intereses, u.created_at,
              COALESCE(rs.strikes, 0) AS strikes,
              COALESCE(rs.suspendida, false) AS suspendida,
              COALESCE(rs.baneada, false) AS baneada
       FROM usuarios u
       ${RESUMEN_DE_SANCIONES}
       WHERE u.id = $1
       LIMIT 1`,
      [numericId],
    );
    const row = result.rows[0];
    if (!row) return null;

    let historialDeStrikes: Usuario["historialDeStrikes"] = [];
    try {
      const strikesResult = await pool.query<{ detalle: string; aplicada_en: string }>(
        `SELECT detalle, aplicada_en FROM sanciones
         WHERE usuario_id = $1 AND tipo = 'STRIKE'
         ORDER BY aplicada_en DESC`,
        [numericId],
      );
      historialDeStrikes = strikesResult.rows.map((s) => ({
        motivo: s.detalle,
        fecha: new Date(s.aplicada_en),
        campana: "Sanción general",
      }));
    } catch (error) {
      console.error("Error listando historial de strikes", error);
    }

    // `campanas` y `aportes` las crea bajo demanda su propia ruta API: si
    // nadie las visitó todavía, no existen. Aseguramos ambas antes de
    // consultarlas y, si aun así fallan (conexión caída, etc.), la ficha
    // muestra 0 en vez de tumbar la página.
    let campanasCreadas = 0;
    let aportesEnviados = 0;
    let aportesAceptados = 0;

    try {
      await Promise.all([ensureCampanasTable(), ensureAportesTable()]);

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

      campanasCreadas = Number(campanasResult.rows[0]?.count ?? 0);
      aportesEnviados = Number(aportesResult.rows[0]?.total ?? 0);
      aportesAceptados = Number(aportesResult.rows[0]?.aceptados ?? 0);
    } catch (error) {
      console.error("Error contando campañas/aportes del usuario", error);
    }

    return {
      ...filaDesdeDB(row),
      ubicacion: row.city && row.state ? `${row.city}, ${row.state}` : row.city || row.state || null,
      especialidad: row.specialty || null,
      registradoEn: new Date(row.created_at),
      campanasCreadas,
      aportesEnviados,
      aportesAceptados,
      rolVigente: rolVigenteDesde(row.role ?? []),
      rolDesde: null,
      interesesDeclarados: (row.intereses ?? []).map((tema) => ({ tema, campanas: 0 })),
      historialDeStrikes,
    };
  } catch (error) {
    console.error("Error obteniendo usuario", error);
    return null;
  }
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

/**
 * Solo SUSPENSION_TEMPORAL (sin vencer) y BANEO_DE_CAMPANA cuentan como
 * "restricción vigente" con botón Restaurar: un STRIKE por sí solo no
 * restringe nada, solo suma al contador (se ve en la ficha del usuario).
 */
export async function listarSancionesActivas(): Promise<SancionActiva[]> {
  try {
    await ensureUsuariosTable();
    await ensureSancionesTable();

    const result = await pool.query<{
      id: number;
      tipo: string;
      detalle: string;
      dias: number | null;
      aplicada_en: string;
      nombre: string;
      apellidos: string;
      usuario_id: number;
    }>(
      `SELECT s.id, s.tipo, s.detalle, s.dias, s.aplicada_en, u.nombre, u.apellidos, u.id AS usuario_id
       FROM sanciones s
       JOIN usuarios u ON u.id = s.usuario_id
       WHERE s.activa = true
         AND s.tipo IN ('SUSPENSION_TEMPORAL', 'BANEO_DE_CAMPANA')
         AND (
           s.tipo <> 'SUSPENSION_TEMPORAL'
           OR s.aplicada_en + (COALESCE(s.dias, 0) || ' days')::interval > NOW()
         )
       ORDER BY s.aplicada_en DESC`,
    );

    return result.rows.map((row) => ({
      id: String(row.id),
      usuarioId: String(row.usuario_id),
      usuario: `${row.nombre} ${row.apellidos}`.trim(),
      desde: new Date(row.aplicada_en),
      etiqueta: row.tipo === "BANEO_DE_CAMPANA" ? "Permanente" : `${row.dias ?? 0} días`,
      tono: row.tipo === "BANEO_DE_CAMPANA" ? "danger" : "warn",
      motivo: row.detalle,
    }));
  } catch (error) {
    console.error("Error listando sanciones activas", error);
    return [];
  }
}
