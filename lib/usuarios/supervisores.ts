/**
 * Vigilancia del rol delegado. Quien concede el rol de Supervisor responde por
 * cómo se usa, así que aquí se ve qué ha decidido cada uno y se puede revertir.
 */

import { pool } from "@/lib/db";
import { ensureUsuariosTable } from "@/lib/db-schema";

export type TipoDeAccion =
  | "VETO_PARTICIPANTE"
  | "PAUSO_CAMPANA"
  | "NOMBRO_REVISOR"
  | "APLICO_STRIKE"
  | "RECHAZO_CAMPANA";

/** Mismos tonos que components/ui/Tag. */
export type TonoDeEtiqueta = "default" | "ok" | "warn" | "danger";

export type AccionDeSupervisor = {
  id: string;
  tipo: TipoDeAccion;
  /** Sobre qué o quién recayó, en texto para mostrar. */
  sobre: string;
  motivo: string;
  ejecutadaEn: Date;
  /** Si ya fue revertida, cuándo. Una acción revertida no se revierte de nuevo. */
  revertidaEn: Date | null;
  /** Contexto que necesita la pantalla de reversión. */
  contexto: {
    personaAfectada?: string;
    campana?: string;
    creadorDeCampana?: string;
    aportesPrevios?: number;
    fechaDeCierre?: string;
  };
};

export type Supervisor = {
  id: string;
  nombre: string;
  correo: string;
  /** No se guarda cuándo se asignó el rol todavía (ver rolDesde en directorio.ts): null si no se sabe. */
  desde: Date | null;
  campanasACargo: number;
  aportesValidados: number;
  accionesEnRango: number;
  revertidas: number;
  /** null si no hay ninguna acción registrada todavía. */
  ultimaActividad: Date | null;
};

export type ActividadDeSupervisor = Supervisor & {
  campanas: { id: string; nombre: string; estado: "ACTIVA" | "PAUSADA" | "FINALIZADA" }[];
  acciones: AccionDeSupervisor[];
};

export type ResumenDeSupervisores = {
  conRolActivo: number;
  campanasACargo: number;
  accionesEjecutadas: number;
  accionesRevertidas: number;
};

/* ── presentación ───────────────────────────────────────────────────────── */

export const ETIQUETA_DE_ACCION: Record<
  TipoDeAccion,
  { texto: string; tono: TonoDeEtiqueta }
> = {
  VETO_PARTICIPANTE: { texto: "Vetó participante", tono: "danger" },
  PAUSO_CAMPANA: { texto: "Pausó campaña", tono: "warn" },
  NOMBRO_REVISOR: { texto: "Nombró revisor", tono: "default" },
  APLICO_STRIKE: { texto: "Aplicó strike", tono: "warn" },
  RECHAZO_CAMPANA: { texto: "Rechazó campaña", tono: "default" },
};

export const ETIQUETA_DE_ESTADO_DE_CAMPANA: Record<
  "ACTIVA" | "PAUSADA" | "FINALIZADA",
  { texto: string; tono: TonoDeEtiqueta }
> = {
  ACTIVA: { texto: "Activa", tono: "ok" },
  PAUSADA: { texto: "Pausada", tono: "warn" },
  FINALIZADA: { texto: "Finalizada", tono: "default" },
};

export const CAUSALES_DE_REVERSION = [
  "Medida desproporcionada",
  "Motivo insuficiente",
  "Error de identificación",
  "Apelación procedente",
  "Fuera del alcance del rol",
];

/**
 * Qué cambia realmente al deshacer cada tipo de decisión. Es lo que se le
 * muestra al SuperUsuario antes de confirmar, y varía por tipo: no es lo mismo
 * levantar un veto que reactivar una campaña.
 *
 * Regla común a todas: revertir NO reevalúa el pasado. Los aportes ya validados
 * o rechazados se quedan como están.
 */
export function describirReversion(a: AccionDeSupervisor): {
  titulo: string;
  efecto: string;
  notificable: string | null;
} {
  const c = a.contexto;

  switch (a.tipo) {
    case "VETO_PARTICIPANTE":
      return {
        titulo: "Revertir un veto de participante",
        efecto: `${c.personaAfectada ?? "La persona"} vuelve a poder aportar en «${
          c.campana ?? "la campaña"
        }». Sus ${c.aportesPrevios ?? 0} aportes previos siguen como estaban: revertir el veto no reevalúa lo ya validado ni lo ya rechazado.`,
        notificable: c.personaAfectada
          ? `Notificar a ${c.personaAfectada} que puede volver a participar`
          : null,
      };

    case "PAUSO_CAMPANA":
      return {
        titulo: "Revertir una pausa de campaña",
        efecto: `«${c.campana ?? "La campaña"}» vuelve al estado Activa y reaparece en el catálogo público con su fecha de cierre original${
          c.fechaDeCierre ? `, el ${c.fechaDeCierre}` : ""
        }. Los ${c.aportesPrevios ?? 0} aportes recibidos se conservan y la meta no se recalcula.`,
        notificable: c.creadorDeCampana
          ? `Notificar a ${c.creadorDeCampana} que su campaña vuelve a estar activa`
          : null,
      };

    case "NOMBRO_REVISOR":
      return {
        titulo: "Revertir el nombramiento de un revisor",
        efecto: `${c.personaAfectada ?? "La persona"} deja de revisar aportes en «${
          c.campana ?? "la campaña"
        }». Las revisiones que ya hizo se mantienen: se le retira la facultad, no se anula su trabajo.`,
        notificable: c.personaAfectada
          ? `Notificar a ${c.personaAfectada} que ya no es revisor de esa campaña`
          : null,
      };

    case "APLICO_STRIKE":
      return {
        titulo: "Revertir un strike",
        efecto: `Se descuenta el strike del contador de ${
          c.personaAfectada ?? "la persona"
        }. Si el strike había desencadenado una suspensión, esta se levanta; el aporte que lo originó sigue rechazado.`,
        notificable: c.personaAfectada
          ? `Notificar a ${c.personaAfectada} que se retiró el strike`
          : null,
      };

    case "RECHAZO_CAMPANA":
      return {
        titulo: "Revertir el rechazo de una campaña",
        efecto: `«${c.campana ?? "La campaña"}» vuelve al estado En revisión y regresa a la cola de supervisión. No se activa sola: alguien tiene que volver a validarla.`,
        notificable: c.creadorDeCampana
          ? `Notificar a ${c.creadorDeCampana} que su campaña vuelve a revisión`
          : null,
      };
  }
}

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
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Mazatlan",
});

export const formatearFechaSup = (f: Date | null) => (f ? fechaCorta.format(f) : "sin registrar");
export const formatearFechaHoraSup = (f: Date | null) =>
  f ? fechaConHora.format(f) : "sin actividad registrada";

/*
 * ────────────────────────────────────────────────────────────────────────────
 * ESTADO DE CONEXIÓN
 *
 * listarSupervisores / obtenerResumenDeSupervisores / obtenerActividad ya leen
 * la tabla real `usuarios` (rol = "supervisor"): id, nombre y correo son
 * reales. `conRolActivo` es un COUNT() real.
 *
 * Lo que SIGUE en cero porque no existe la tabla de auditoría ni el modelo de
 * asignación que los sustenta (puntos abiertos de dominio.md: #1 quién asigna
 * Revisor de aportes, #2 qué es "Administrador de campaña", #12 reparto de
 * campañas a supervisores):
 *   - desde / ultimaActividad: no se guarda cuándo se asignó el rol ni hay
 *     ninguna acción registrada todavía → null.
 *   - campanasACargo: no existe asignación supervisor↔campaña en el esquema.
 *   - aportesValidados / accionesEnRango / revertidas: no hay tabla de
 *     auditoría; nadie ha "vetado", "pausado" ni "nombrado revisor" todavía
 *     porque esos flujos no están construidos en ninguna otra pantalla.
 *   - obtenerAccion: siempre null (no hay filas que buscar), así que
 *     /usuarios/supervisores/[id]/revertir/[accionId] da 404 — correcto,
 *     dado que no hay decisión que revertir.
 *
 * Antes de construir eso hace falta: (a) una tabla de auditoría genérica y
 * (b) los flujos reales que la alimenten (vetar participante, pausar/rechazar
 * campaña desde el rol Supervisor, nombrar revisor) — hoy campanas/route.ts
 * activa las campañas directo, sin pasar por "en_revision" ni por un
 * Supervisor. Construir eso es una tarea aparte, no un simple cambio de query.
 * ────────────────────────────────────────────────────────────────────────────
 */

type FilaSupervisorDB = {
  id: number;
  nombre: string;
  apellidos: string;
  email: string;
};

function supervisorDesdeDB(row: FilaSupervisorDB): Supervisor {
  return {
    id: String(row.id),
    nombre: `${row.nombre} ${row.apellidos}`.trim(),
    correo: row.email,
    desde: null,
    campanasACargo: 0,
    aportesValidados: 0,
    accionesEnRango: 0,
    revertidas: 0,
    ultimaActividad: null,
  };
}

export async function obtenerResumenDeSupervisores(): Promise<ResumenDeSupervisores> {
  try {
    await ensureUsuariosTable();

    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM usuarios WHERE role @> '["supervisor"]'::jsonb`,
    );

    return {
      conRolActivo: Number(result.rows[0]?.count ?? 0),
      campanasACargo: 0,
      accionesEjecutadas: 0,
      accionesRevertidas: 0,
    };
  } catch (error) {
    console.error("Error obteniendo resumen de supervisores", error);
    return { conRolActivo: 0, campanasACargo: 0, accionesEjecutadas: 0, accionesRevertidas: 0 };
  }
}

export async function listarSupervisores(q?: string): Promise<Supervisor[]> {
  const t = (q ?? "").trim();

  try {
    await ensureUsuariosTable();

    const condiciones = [`role @> '["supervisor"]'::jsonb`];
    const valores: string[] = [];
    if (t) {
      valores.push(`%${t}%`);
      condiciones.push(`(nombre ILIKE $1 OR apellidos ILIKE $1 OR email ILIKE $1)`);
    }

    const result = await pool.query<FilaSupervisorDB>(
      `SELECT id, nombre, apellidos, email FROM usuarios
       WHERE ${condiciones.join(" AND ")}
       ORDER BY id DESC`,
      valores,
    );

    return result.rows.map(supervisorDesdeDB);
  } catch (error) {
    console.error("Error listando supervisores", error);
    return [];
  }
}

export async function obtenerActividad(id: string): Promise<ActividadDeSupervisor | null> {
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) return null;

  try {
    await ensureUsuariosTable();

    const result = await pool.query<FilaSupervisorDB>(
      `SELECT id, nombre, apellidos, email FROM usuarios
       WHERE id = $1 AND role @> '["supervisor"]'::jsonb
       LIMIT 1`,
      [numericId],
    );
    const row = result.rows[0];
    if (!row) return null;

    // Sin tabla de auditoría ni asignación supervisor↔campaña (ver nota
    // arriba): de verdad no tiene campañas ni decisiones que mostrar.
    return { ...supervisorDesdeDB(row), campanas: [], acciones: [] };
  } catch (error) {
    console.error("Error obteniendo actividad de supervisor", error);
    return null;
  }
}

export async function obtenerAccion(
  supervisorId: string,
  accionId: string,
): Promise<AccionDeSupervisor | null> {
  // No existe tabla de auditoría todavía: ninguna acción de supervisor queda
  // registrada, así que no hay nada que buscar (ver nota arriba).
  void supervisorId;
  void accionId;
  return null;
}
