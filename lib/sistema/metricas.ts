import { pool } from "@/lib/db";

/**
 * Métricas del Panel del sistema (SCR-WEB-28). Los tres totales son de solo
 * lectura: el SuperUsuario consulta, no opera.
 */
export type MetricasDelSistema = {
  usuariosRegistrados: number;
  campanasActivas: number;
  aportesRecolectados: number;
  /** Si es false, el panel muestra el aviso de arranque de la plataforma. */
  haySupervisores: boolean;
};

// Las tablas las crean bajo demanda las rutas dueñas de cada una (usuarios,
// campanas, aportes). En una base recién levantada, antes de cualquier
// registro, todavía no existen: se cuenta como 0 en vez de tumbar el panel.
async function contarFilas(sql: string): Promise<number> {
  try {
    const { rows } = await pool.query(sql);
    return Number(rows[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

async function haySupervisoresActivos(): Promise<boolean> {
  try {
    const { rows } = await pool.query(
      `SELECT EXISTS (SELECT 1 FROM usuarios WHERE role @> '["supervisor"]'::jsonb) AS existe`
    );
    return Boolean(rows[0]?.existe);
  } catch {
    return false;
  }
}

export async function obtenerMetricasDelSistema(): Promise<MetricasDelSistema> {
  const [usuariosRegistrados, campanasActivas, aportesRecolectados, haySupervisores] =
    await Promise.all([
      contarFilas(`SELECT COUNT(*)::int AS n FROM usuarios`),
      contarFilas(`SELECT COUNT(*)::int AS n FROM campanas WHERE status = 'activa'`),
      contarFilas(`SELECT COUNT(*)::int AS n FROM aportes`),
      haySupervisoresActivos(),
    ]);

  return { usuariosRegistrados, campanasActivas, aportesRecolectados, haySupervisores };
}
