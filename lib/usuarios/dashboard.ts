import type { Pestana } from "@/components/sistema/subtabs";

/** Pestañas de la sección Usuarios. Las comparten las cuatro pantallas. */
export const PESTANAS_USUARIOS: Pestana[] = [
  { href: "/usuarios/dashboard", etiqueta: "Dashboard" },
  { href: "/usuarios", etiqueta: "Directorio" },
  { href: "/usuarios/supervisores", etiqueta: "Supervisores" },
  { href: "/usuarios/sanciones", etiqueta: "Sanciones" },
];

export type RangoDeFechas = "30d" | "90d" | "12m";

export type DashboardDeUsuarios = {
  totalRegistrados: number;
  altasDelMes: number;
  conAportesEnRango: number;
  cuentasRestringidas: number;
  altasPorMes: { etiqueta: string; valor: number }[];
  porRol: { etiqueta: string; valor: number }[];
  estadoDeCuenta: {
    activas: number;
    conStrikes: number;
    suspendidas: number;
    baneadas: number;
    correoSinVerificar: number;
  };
  /** Porcentaje del padrón que declaró cada temática. */
  interesesDeclarados: { etiqueta: string; porcentaje: number }[];
  porUbicacion: { etiqueta: string; valor: number }[];
  masActivos: {
    id: string;
    nombre: string;
    correo: string;
    aportesAprobados: number;
    campanas: number;
    /** Mismos tonos que components/ui/Tag. */
    estado: { texto: string; tono: "ok" | "warn" | "danger" };
  }[];
  cortadoEn: Date;
};

/*
 * ────────────────────────────────────────────────────────────────────────────
 * PENDIENTE DE CONECTAR
 *
 * Reemplaza el cuerpo de obtenerDashboardDeUsuarios por las consultas reales.
 * Son muchos agregados independientes: conviene lanzarlos en un Promise.all y,
 * si la pantalla se vuelve pesada, materializar los conteos por mes en una
 * vista o tabla de resumen en vez de recalcularlos en cada visita.
 *
 *   const [total, altas, activos, restringidas] = await Promise.all([
 *     db.select({ n: count() }).from(usuarios),
 *     db.select({ n: count() }).from(usuarios)
 *       .where(gte(usuarios.creadoEn, inicioDeMes)),
 *     db.selectDistinct({ id: aportes.usuarioId }).from(aportes)
 *       .where(gte(aportes.creadoEn, desde)),
 *     db.select({ n: count() }).from(usuarios)
 *       .where(inArray(usuarios.estado, ["SUSPENDIDA", "BANEADA"])),
 *   ]);
 *
 * "Con aportes en el rango" cuenta usuarios distintos, no aportes: si se hace
 * con count() sobre aportes, el número sale inflado.
 * ────────────────────────────────────────────────────────────────────────────
 */

const MUESTRA: DashboardDeUsuarios = {
  totalRegistrados: 1284,
  altasDelMes: 96,
  conAportesEnRango: 412,
  cuentasRestringidas: 23,
  altasPorMes: [
    { etiqueta: "mar", valor: 32 },
    { etiqueta: "abr", valor: 44 },
    { etiqueta: "may", valor: 57 },
    { etiqueta: "jun", valor: 66 },
    { etiqueta: "jul", valor: 80 },
    { etiqueta: "ago", valor: 96 },
  ],
  porRol: [
    { etiqueta: "Usuario común", valor: 1232 },
    { etiqueta: "Revisor de aportes", valor: 34 },
    { etiqueta: "Supervisor", valor: 12 },
    { etiqueta: "Creador de campañas", valor: 57 },
  ],
  estadoDeCuenta: {
    activas: 1261,
    conStrikes: 41,
    suspendidas: 17,
    baneadas: 6,
    correoSinVerificar: 48,
  },
  interesesDeclarados: [
    { etiqueta: "Medio ambiente", porcentaje: 38 },
    { etiqueta: "Movilidad", porcentaje: 21 },
    { etiqueta: "Educación", porcentaje: 17 },
    { etiqueta: "Cultura", porcentaje: 13 },
    { etiqueta: "Salud", porcentaje: 11 },
  ],
  porUbicacion: [
    { etiqueta: "Tepic", valor: 742 },
    { etiqueta: "Xalisco", valor: 201 },
    { etiqueta: "Compostela", valor: 143 },
    { etiqueta: "Bahía de Banderas", valor: 118 },
    { etiqueta: "Sin ubicación declarada", valor: 80 },
  ],
  masActivos: [
    {
      id: "1042",
      nombre: "Ana Ruiz",
      correo: "ana@correo.com",
      aportesAprobados: 412,
      campanas: 9,
      estado: { texto: "Activa", tono: "ok" },
    },
    {
      id: "1187",
      nombre: "Diego Salas",
      correo: "diego@correo.com",
      aportesAprobados: 288,
      campanas: 6,
      estado: { texto: "Activa", tono: "ok" },
    },
    {
      id: "8412",
      nombre: "Luis Márquez",
      correo: "luis@correo.com",
      aportesAprobados: 174,
      campanas: 4,
      estado: { texto: "2 strikes", tono: "warn" },
    },
  ],
  cortadoEn: new Date(),
};

export async function obtenerDashboardDeUsuarios(
  _rango: RangoDeFechas = "30d",
): Promise<DashboardDeUsuarios> {
  return MUESTRA;
}

export function formatearCorte(fecha: Date): string {
  const f = new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Mazatlan",
  }).format(fecha);

  return `Corte al ${f}`;
}
