/**
 * Vigilancia del rol delegado. Quien concede el rol de Supervisor responde por
 * cómo se usa, así que aquí se ve qué ha decidido cada uno y se puede revertir.
 */

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
  desde: Date;
  campanasACargo: number;
  aportesValidados: number;
  accionesEnRango: number;
  revertidas: number;
  ultimaActividad: Date;
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

export const formatearFechaSup = (f: Date) => fechaCorta.format(f);
export const formatearFechaHoraSup = (f: Date) => fechaConHora.format(f);

/*
 * ────────────────────────────────────────────────────────────────────────────
 * PENDIENTE DE CONECTAR
 *
 * Todo esto sale de la tabla de auditoría, no de las tablas de negocio: lo que
 * se lista son decisiones registradas, no el estado actual de las campañas.
 *
 *   db.select().from(auditoria)
 *     .where(and(eq(auditoria.actorId, id), gte(auditoria.creadoEn, desde)))
 *     .orderBy(desc(auditoria.creadoEn))
 *
 * Dos cosas importantes:
 *
 * 1. El historial es de solo lectura. Una acción revertida NO se borra ni se
 *    edita: se marca con revertidaEn y se añade un registro nuevo de quién la
 *    revirtió y por qué. Si se borrara, la pantalla dejaría de servir para lo
 *    que existe.
 *
 * 2. "Acciones revertidas" cuenta reversiones, no acciones distintas. Si hace
 *    falta el otro número, es un count distinct sobre el id de la acción.
 * ────────────────────────────────────────────────────────────────────────────
 */

const SUPERVISORES: Supervisor[] = [
  {
    id: "1042",
    nombre: "Ana Ruiz",
    correo: "ana@correo.com",
    desde: new Date("2026-03-04T10:00:00Z"),
    campanasACargo: 6,
    aportesValidados: 412,
    accionesEnRango: 21,
    revertidas: 1,
    ultimaActividad: new Date("2026-08-14T17:02:00Z"),
  },
  {
    id: "2210",
    nombre: "Mara Ortega",
    correo: "mara@correo.com",
    desde: new Date("2026-04-19T10:00:00Z"),
    campanasACargo: 5,
    aportesValidados: 268,
    accionesEnRango: 17,
    revertidas: 0,
    ultimaActividad: new Date("2026-08-14T15:20:00Z"),
  },
  {
    id: "1187",
    nombre: "Diego Salas",
    correo: "diego@correo.com",
    desde: new Date("2026-06-02T10:00:00Z"),
    campanasACargo: 4,
    aportesValidados: 190,
    accionesEnRango: 9,
    revertidas: 1,
    ultimaActividad: new Date("2026-08-13T00:04:00Z"),
  },
  {
    id: "3301",
    nombre: "Ismael Curiel",
    correo: "ismael@correo.com",
    desde: new Date("2026-07-07T10:00:00Z"),
    campanasACargo: 3,
    aportesValidados: 96,
    accionesEnRango: 4,
    revertidas: 1,
    ultimaActividad: new Date("2026-08-11T21:38:00Z"),
  },
];

const ACCIONES: Record<string, AccionDeSupervisor[]> = {
  "1042": [
    {
      id: "2841",
      tipo: "VETO_PARTICIPANTE",
      sobre: "Mara Ortega · Fauna urbana en parques",
      motivo:
        "Aportes repetidos tras dos avisos. La misma fotografía enviada cuatro veces con distinta descripción.",
      ejecutadaEn: new Date("2026-08-14T17:02:00Z"),
      revertidaEn: null,
      contexto: {
        personaAfectada: "Mara Ortega",
        campana: "Fauna urbana en parques",
        aportesPrevios: 48,
      },
    },
    {
      id: "2836",
      tipo: "PAUSO_CAMPANA",
      sobre: "Murales del centro",
      motivo:
        "Sin aportes válidos en tres semanas. Conviene revisar la definición del tipo de dato antes de reanudar.",
      ejecutadaEn: new Date("2026-08-13T22:40:00Z"),
      revertidaEn: null,
      contexto: {
        campana: "Murales del centro",
        creadorDeCampana: "Mara Ortega",
        aportesPrevios: 27,
        fechaDeCierre: "30 sep",
      },
    },
    {
      id: "2820",
      tipo: "NOMBRO_REVISOR",
      sobre: "Diego Salas · Censo de árboles urbanos",
      motivo: "Constancia en la validación durante los últimos dos meses.",
      ejecutadaEn: new Date("2026-08-12T15:15:00Z"),
      revertidaEn: null,
      contexto: {
        personaAfectada: "Diego Salas",
        campana: "Censo de árboles urbanos",
      },
    },
    {
      id: "2809",
      tipo: "APLICO_STRIKE",
      sobre: "Luis Márquez · Huertos comunitarios",
      motivo: "Fotografía tomada fuera del área declarada de la campaña.",
      ejecutadaEn: new Date("2026-08-11T23:22:00Z"),
      revertidaEn: null,
      contexto: {
        personaAfectada: "Luis Márquez",
        campana: "Huertos comunitarios",
      },
    },
    {
      id: "2790",
      tipo: "RECHAZO_CAMPANA",
      sobre: "Ruido nocturno en el centro",
      motivo: "Meta desproporcionada al alcance declarado.",
      ejecutadaEn: new Date("2026-08-09T16:08:00Z"),
      revertidaEn: new Date("2026-08-10T18:00:00Z"),
      contexto: {
        campana: "Ruido nocturno en el centro",
        creadorDeCampana: "Luis Márquez",
      },
    },
  ],
};

const CAMPANAS: Record<
  string,
  { id: string; nombre: string; estado: "ACTIVA" | "PAUSADA" | "FINALIZADA" }[]
> = {
  "1042": [
    { id: "17", nombre: "Censo de árboles urbanos", estado: "ACTIVA" },
    { id: "21", nombre: "Huertos comunitarios", estado: "ACTIVA" },
    { id: "24", nombre: "Rutas ciclistas", estado: "ACTIVA" },
    { id: "26", nombre: "Murales del centro", estado: "PAUSADA" },
    { id: "29", nombre: "Fauna urbana en parques", estado: "PAUSADA" },
    { id: "12", nombre: "Mapa de bancas públicas", estado: "FINALIZADA" },
  ],
};

export async function obtenerResumenDeSupervisores(): Promise<ResumenDeSupervisores> {
  return {
    conRolActivo: 12,
    campanasACargo: 42,
    accionesEjecutadas: 64,
    accionesRevertidas: 3,
  };
}

export async function listarSupervisores(q?: string): Promise<Supervisor[]> {
  const t = (q ?? "").trim().toLowerCase();
  if (!t) return SUPERVISORES;
  return SUPERVISORES.filter((s) =>
    `${s.nombre} ${s.correo}`.toLowerCase().includes(t),
  );
}

export async function obtenerActividad(
  id: string,
): Promise<ActividadDeSupervisor | null> {
  const s = SUPERVISORES.find((x) => x.id === id);
  if (!s) return null;
  return { ...s, campanas: CAMPANAS[id] ?? [], acciones: ACCIONES[id] ?? [] };
}

export async function obtenerAccion(
  supervisorId: string,
  accionId: string,
): Promise<AccionDeSupervisor | null> {
  return (ACCIONES[supervisorId] ?? []).find((a) => a.id === accionId) ?? null;
}
