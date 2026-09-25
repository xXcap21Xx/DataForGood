import { pool } from "@/lib/db";
import { hasCampaignStarted } from "@/lib/campaign-date";
import { registrarAuditoria, type ActorDeAuditoria } from "@/lib/auditoria";

export type AccionDeSupervision = "aceptada" | "rechazada" | "reportada";

export const ACCIONES_DE_SUPERVISION = new Set<string>(["aceptada", "rechazada", "reportada"]);

/**
 * Quién dictamina: un usuario con rol de supervisor (fila de `usuarios`) o el
 * SuperUsuario desde /supervisar, que no tiene fila en `usuarios` (ver
 * lib/rootSession.ts). Por eso lo del SuperUsuario se marca con
 * `campanas.supervisado_por_root` / `campana_supervisores.por_superusuario`
 * en vez de un `supervisor_id`.
 */
export type AutorDeDecision = { tipo: "usuario"; usuarioId: number } | { tipo: "root" };

function actorDeAuditoria(autor: AutorDeDecision): ActorDeAuditoria {
  return autor.tipo === "root" ? { tipo: "superusuario" } : { tipo: "usuario", id: autor.usuarioId };
}

export type ResultadoDeDecision =
  | { ok: true; nextStatus: string; mensaje: string }
  | { ok: false; status: 400 | 403 | 404; error: string };

/**
 * Una campaña la supervisa un solo supervisor: quien la toma primero con el
 * botón "Supervisar esta campaña". El UPDATE es atómico (solo pasa si sigue en
 * revisión y sin supervisor), así que si dos la toman a la vez, gana uno.
 * Una vez tomada se queda con ese supervisor, también si el creador la
 * corrige y la reenvía tras un rechazo.
 */
export async function tomarCampanaParaSupervisar(
  campanaId: string | number,
  autor: AutorDeDecision,
): Promise<{ ok: true } | { ok: false; status: 403 | 404 | 409; error: string }> {
  const supervisorId = autor.tipo === "usuario" ? autor.usuarioId : null;
  const porRoot = autor.tipo === "root";

  const tomada = await pool.query(
    `UPDATE campanas
     SET supervisor_id = $2, supervisado_por_root = $3, updated_at = NOW()
     WHERE id = $1
       AND status = 'en_revision'
       AND supervisor_id IS NULL
       AND NOT supervisado_por_root
       AND ($2::int IS NULL OR creator_id <> $2::int)
     RETURNING id`,
    [campanaId, supervisorId, porRoot],
  );
  if (tomada.rowCount !== 0) {
    await registrarAuditoria({
      actor: actorDeAuditoria(autor),
      accion: "supervision.tomar",
      objetivo: { tipo: "campana", id: campanaId },
    });
    return { ok: true };
  }

  // No se pudo: averiguar por qué para dar un mensaje útil.
  const actual = await pool.query(
    `SELECT status, creator_id, supervisor_id, supervisado_por_root FROM campanas WHERE id = $1 LIMIT 1`,
    [campanaId],
  );
  if (actual.rowCount === 0) return { ok: false, status: 404, error: "Campaña no encontrada" };
  const fila = actual.rows[0];

  if (esSuSupervisor(fila, autor)) return { ok: true };
  if (autor.tipo === "usuario" && Number(fila.creator_id) === autor.usuarioId) {
    return { ok: false, status: 403, error: "No puedes supervisar una campaña que creaste" };
  }
  if (fila.supervisor_id != null || fila.supervisado_por_root) {
    return { ok: false, status: 409, error: "Otro supervisor ya está supervisando esta campaña" };
  }
  return { ok: false, status: 409, error: "Solo se pueden tomar campañas en revisión" };
}

function esSuSupervisor(
  fila: { supervisor_id: unknown; supervisado_por_root: unknown },
  autor: AutorDeDecision,
): boolean {
  return autor.tipo === "root"
    ? Boolean(fila.supervisado_por_root)
    : fila.supervisor_id != null && Number(fila.supervisor_id) === autor.usuarioId;
}

export async function registrarDecisionDeCampana(
  campanaId: string | number,
  accion: AccionDeSupervision,
  motivoEntrada: unknown,
  autor: AutorDeDecision,
): Promise<ResultadoDeDecision> {
  const existing = await pool.query(
    `SELECT id, status, creator_id, name, start_date, start_time, supervisor_id, supervisado_por_root
     FROM campanas WHERE id = $1 LIMIT 1`,
    [campanaId],
  );
  if (existing.rowCount === 0) {
    return { ok: false, status: 404, error: "Campaña no encontrada" };
  }
  const campana = existing.rows[0];

  // Un supervisor puede crear campañas, pero no dictaminar ni reportar las suyas.
  if (autor.tipo === "usuario" && Number(campana.creator_id) === autor.usuarioId) {
    return { ok: false, status: 403, error: "No puedes supervisar una campaña que creaste" };
  }
  // Solo el supervisor que la tomó dictamina o reporta.
  if (!esSuSupervisor(campana, autor)) {
    return {
      ok: false,
      status: 403,
      error: campana.supervisor_id != null || campana.supervisado_por_root
        ? "Esta campaña la supervisa otro supervisor"
        : "Primero toma la campaña con \"Supervisar esta campaña\"",
    };
  }

  // Aceptada con fecha/hora de inicio futura: el estado de la campaña
  // queda "aceptada" (en_revision -> aceptada -> activa) y se activa sola
  // cuando lleguen (activateScheduledCampaigns); sin fecha definida se
  // activa de inmediato igual que antes.
  const nextStatus =
    accion === "aceptada"
      ? hasCampaignStarted(campana.start_date, campana.start_time) ? "activa" : "aceptada"
      : accion === "rechazada" ? "rechazada" : String(campana.status);
  const motivo = String(motivoEntrada ?? "").trim() || null;
  if (accion === "rechazada" && !motivo) {
    return { ok: false, status: 400, error: "El motivo es obligatorio al rechazar una campaña" };
  }

  const supervisorId = autor.tipo === "usuario" ? autor.usuarioId : null;
  const porRoot = autor.tipo === "root";

  await pool.query(`UPDATE campanas SET status = $2, updated_at = NOW() WHERE id = $1`, [campanaId, nextStatus]);

  await pool.query(
    `INSERT INTO campana_supervisores (campana_id, supervisor_id, por_superusuario, accion, motivo, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [campanaId, supervisorId, porRoot, accion, motivo],
  );

  await registrarAuditoria({
    actor: actorDeAuditoria(autor),
    accion: "supervision.dictaminar",
    objetivo: { tipo: "campana", id: campanaId },
    detalle: { accion, motivo, estadoAnterior: String(campana.status), estadoNuevo: nextStatus },
  });

  if (accion === "rechazada") {
    await pool.query(
      `INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, campana_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        campana.creator_id,
        "campana_rechazada",
        "Campaña rechazada",
        `Tu campaña "${campana.name}" fue rechazada. Motivo: ${motivo}`,
        campanaId,
        JSON.stringify({ motivo }),
      ],
    );
  }

  const mensaje = accion === "aceptada"
    ? nextStatus === "activa"
      ? "Campaña aceptada y puesta en activo"
      : "Campaña aceptada; se activará el día de su fecha de inicio"
    : accion === "rechazada"
      ? "Campaña rechazada"
      : "Campaña reportada";

  return { ok: true, nextStatus, mensaje };
}
