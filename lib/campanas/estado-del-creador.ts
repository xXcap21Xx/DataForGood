// Qué estado puede darle el creador a su campaña (POST /api/campanas, PATCH y PUT de
// /api/campanas/[id]). Una regla, un lugar: dominio.md § 4 y § 5.
//   - El creador solo guarda como `borrador` o envía `en_revision`. La activa el supervisor
//     (lib/supervision/decision.ts); el creador solo reactiva una finalizada o la finaliza.
//   - Máximo MAX_CAMPANAS_ACTIVAS activas a la vez: pasado ese número, solo borrador.
//   - Contadores, "especial", "revisor asignado" y XP no los decide el creador.

import { pool } from "@/lib/db";

export const MAX_CAMPANAS_ACTIVAS = 5;

/** Estados que el creador puede pedir al crear o al editar por completo. */
export const ESTADOS_QUE_ELIGE_EL_CREADOR = new Set(["borrador", "en_revision"]);

/** Estados en los que el creador edita todo (y puede volver a enviar a revisión). */
export const ESTADOS_CON_EDICION_COMPLETA = new Set(["borrador", "en_revision", "rechazada"]);

// TODO(dominio): punto abierto 4 (cálculo de XP). Hasta decidirlo, todas las campañas
// usan el valor que siempre mandó el formulario; el creador no lo elige.
export const XP_POR_APORTE = 50;

/** Campañas activas de esta persona. */
export async function contarActivas(usuarioId: string | number): Promise<number> {
  const { rows } = await pool.query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM campanas WHERE creator_id = $1 AND status = 'activa'`,
    [usuarioId]
  );
  return Number(rows[0]?.n ?? 0);
}

/**
 * Por qué el creador no puede pedir ese estado, o null si puede. Solo para crear o para
 * editar una campaña en borrador, en revisión o rechazada.
 */
export async function errorDeEstadoPedido(estado: string, usuarioId: string | number): Promise<string | null> {
  if (!ESTADOS_QUE_ELIGE_EL_CREADOR.has(estado)) {
    return "Solo puedes guardar la campaña como borrador o enviarla a revisión: la activa el supervisor.";
  }
  if (estado === "en_revision" && (await contarActivas(usuarioId)) >= MAX_CAMPANAS_ACTIVAS) {
    return `Ya tienes ${MAX_CAMPANAS_ACTIVAS} campañas activas: por ahora solo puedes guardarla como borrador.`;
  }
  return null;
}
