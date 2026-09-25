import { redirect } from "next/navigation";

import { pool } from "@/lib/db";
import { activateScheduledCampaigns, finalizeExpiredCampaigns, normalizeCampaignDate } from "@/lib/campaign-date";
import { hasRootSession } from "@/lib/rootSession";

/*
 * Datos del modo supervisor del SuperUsuario (/supervisar, dentro de
 * app/(panel)). Es una copia aislada de /supervision: solo responde con
 * sesión raíz (root_sessions), nunca con la sesión de un usuario, aunque
 * tenga rol de supervisor. El SuperUsuario solo supervisa: no tiene fila en
 * `usuarios`, así que no puede crear campañas, aportar ni revisar aportes.
 */

/** Guardia de cada página: el layout de (panel) ya la aplica, pero no basta solo. */
export async function exigirSesionRoot(): Promise<void> {
  if (!(await hasRootSession())) redirect("/root");
}

export type CampanaSupervisable = {
  id: string;
  name: string;
  creatorName: string;
  tag: string;
  status: string;
  latestSupervisionAction: string | null;
  /** libre: nadie la ha tomado; mia: la tomó el SuperUsuario; otro: la tomó un usuario supervisor. */
  supervision: "libre" | "mia" | "otro";
  currentContributions: number;
  goalContributions: number;
  participants: number;
  quotaPerUser: number;
  description: string;
  organizer: string;
  dataTypes: string[];
  locationColonia: string;
  locationCity: string;
  locationState: string;
  startDate: string | null;
  endDate: string | null;
};

function mapear(row: Record<string, unknown>): CampanaSupervisable {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    creatorName: String(row.creator_name ?? ""),
    tag: String(row.tag ?? row.tematica ?? ""),
    status: String(row.status ?? ""),
    latestSupervisionAction: row.latest_supervision_action ? String(row.latest_supervision_action) : null,
    supervision: row.supervisado_por_root ? "mia" : row.supervisor_id != null ? "otro" : "libre",
    currentContributions: Number(row.current_contributions ?? 0),
    goalContributions: Number(row.goal_contributions ?? 0),
    participants: Number(row.participants ?? 0),
    quotaPerUser: Number(row.quota_per_user ?? 0),
    description: String(row.description ?? ""),
    organizer: String(row.organizer ?? ""),
    dataTypes: Array.isArray(row.data_types) ? row.data_types.map(String) : [],
    locationColonia: String(row.location_colonia ?? ""),
    locationCity: String(row.location_city ?? ""),
    locationState: String(row.location_state ?? ""),
    startDate: normalizeCampaignDate(row.start_date),
    endDate: normalizeCampaignDate(row.end_date),
  };
}

const ULTIMA_ACCION_ROOT = `
  LEFT JOIN LATERAL (
    SELECT cs.accion
    FROM campana_supervisores cs
    WHERE cs.campana_id = c.id AND cs.por_superusuario
    ORDER BY cs.created_at DESC, cs.id DESC
    LIMIT 1
  ) ultima ON true`;

export async function listarCampanasParaRoot(): Promise<{
  pendientes: CampanaSupervisable[];
  supervisadas: CampanaSupervisable[];
}> {
  await exigirSesionRoot();
  await activateScheduledCampaigns();
  await finalizeExpiredCampaigns();

  const [pendientes, supervisadas] = await Promise.all([
    // Por supervisar: las libres y las que ya tomó el SuperUsuario (un solo supervisor por campaña).
    pool.query(
      `SELECT c.* FROM campanas c
       WHERE c.status = 'en_revision'
         AND (c.supervisado_por_root OR c.supervisor_id IS NULL)
       ORDER BY c.created_at DESC`,
    ),
    pool.query(
      `SELECT c.*, ultima.accion AS latest_supervision_action
       FROM campanas c ${ULTIMA_ACCION_ROOT}
       WHERE c.supervisado_por_root
       ORDER BY c.created_at DESC`,
    ),
  ]);

  return { pendientes: pendientes.rows.map(mapear), supervisadas: supervisadas.rows.map(mapear) };
}

export async function obtenerCampanaParaRoot(id: string): Promise<CampanaSupervisable | null> {
  await exigirSesionRoot();
  if (!/^\d+$/.test(id)) return null;

  const result = await pool.query(
    `SELECT c.*, ultima.accion AS latest_supervision_action
     FROM campanas c ${ULTIMA_ACCION_ROOT}
     WHERE c.id = $1
     LIMIT 1`,
    [id],
  );
  return result.rowCount === 0 ? null : mapear(result.rows[0]);
}

/** Campaña que el SuperUsuario supervisa y ya recolecta (para ver participantes y aportes). */
export async function obtenerCampanaSupervisadaPorRoot(id: string): Promise<{ id: number; name: string } | null> {
  await exigirSesionRoot();
  if (!/^\d+$/.test(id)) return null;

  const result = await pool.query<{ id: number; name: string }>(
    `SELECT id, name FROM campanas
     WHERE id = $1 AND supervisado_por_root AND status IN ('activa', 'finalizada')
     LIMIT 1`,
    [id],
  );
  return result.rows[0] ?? null;
}
