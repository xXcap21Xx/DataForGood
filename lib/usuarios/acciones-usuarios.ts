"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { pool } from "@/lib/db";
import {
  ensureCampanaRevisoresTable,
  ensureCampanasTable,
  ensureSancionesTable,
  ensureUsuariosTable,
} from "@/lib/db-schema";
import { hasRootSession } from "@/lib/rootSession";
import { normalizeRoles } from "@/lib/roles";
import { CODIGO_DE_ROL, type RolAsignable } from "@/lib/usuarios/rol-asignable";
import type { TipoDeSancion } from "@/lib/usuarios/directorio";

export type ResultadoDeAccion = { ok: true } | { ok: false; error: string };

/*
 * ────────────────────────────────────────────────────────────────────────────
 * PENDIENTE DE CONECTAR
 *
 * Las cuatro acciones ya escriben de verdad (asignarRol/revocarRol en
 * `usuarios.role`, aplicarSancion/restaurarAcceso en `sanciones`). Falta:
 *   1. El registro en auditoría: quién, cuándo, sobre quién y con qué motivo
 *      (no existe tabla de auditoría todavía).
 *   2. TODO(dominio): al tercer STRIKE no hay escalamiento automático a
 *      baneo permanente ni bloqueo de correo — hoy hay que aplicar el baneo
 *      a mano con tipo BANEO_DE_CAMPANA. El contador de strikes sí es real.
 *   3. Notificar al usuario sancionado: no hay envío de notificaciones en
 *      la app todavía.
 * ────────────────────────────────────────────────────────────────────────────
 */

async function exigirSuperUsuario(): Promise<void> {
  const autorizado = await hasRootSession();
  if (!autorizado) throw new Error("No autorizado");
}

/**
 * `campana_revisores` (no `usuarios.role`) es la fuente real de si alguien
 * es revisor: `lib/session.ts` reconstruye el rol "revisor" en cada sesión a
 * partir de sus filas 'aceptado' ahí. Si solo se limpia `usuarios.role`, el
 * rol vuelve a aparecer solo con el siguiente login. Se usa tanto al revocar
 * el rol como al asignar Supervisor (son mutuamente excluyentes).
 */
async function retirarComoRevisorDeTodasLasCampanas(usuarioId: number): Promise<void> {
  await ensureCampanaRevisoresTable();
  await ensureCampanasTable();

  const campanasAfectadas = await pool.query<{ campana_id: number }>(
    `UPDATE campana_revisores SET estado = 'rechazado'
     WHERE usuario_id = $1 AND estado = 'aceptado'
     RETURNING campana_id`,
    [usuarioId],
  );

  for (const fila of campanasAfectadas.rows) {
    await pool.query(
      `UPDATE campanas SET has_reviewer_assigned = EXISTS (
         SELECT 1 FROM campana_revisores WHERE campana_id = $1 AND estado = 'aceptado'
       ), updated_at = NOW()
       WHERE id = $1`,
      [fila.campana_id],
    );
  }
}

export async function asignarRol(
  usuarioId: string,
  rol: RolAsignable,
): Promise<ResultadoDeAccion> {
  await exigirSuperUsuario();

  // El revisor de aportes ya no lo asigna el SuperUsuario: lo otorga el
  // creador de una campaña al invitar, y la persona lo acepta desde sus
  // notificaciones (ver POST /api/campanas/[id]/revisores). El SuperUsuario
  // solo puede revocarlo (revocarRol).
  if (rol === "REVISOR_DE_APORTES") {
    return {
      ok: false,
      error:
        "El rol de revisor de aportes ya no se asigna aquí: lo otorga el creador de una campaña al invitar.",
    };
  }

  const numericId = Number(usuarioId);
  if (!Number.isInteger(numericId)) {
    return { ok: false, error: "ID de usuario inválido." };
  }

  try {
    await ensureUsuariosTable();

    const actual = await pool.query<{ role: string[] | null }>(
      `SELECT role FROM usuarios WHERE id = $1`,
      [numericId],
    );
    if (actual.rowCount === 0) {
      return { ok: false, error: "El usuario no existe." };
    }

    const codigo = CODIGO_DE_ROL[rol];
    const rolesSinRevisor = (actual.rows[0].role ?? []).filter((r) => r !== "revisor");
    const nuevosRoles = normalizeRoles([...rolesSinRevisor, codigo]);

    await pool.query(`UPDATE usuarios SET role = $2::jsonb, updated_at = NOW() WHERE id = $1`, [
      numericId,
      JSON.stringify(nuevosRoles),
    ]);
    // Supervisor y revisor son mutuamente excluyentes (normalizeRoles ya lo
    // exige): si ya era revisor aceptado en alguna campaña, se le retira.
    await retirarComoRevisorDeTodasLasCampanas(numericId);

    revalidatePath(`/usuarios/${usuarioId}/roles`);
    revalidatePath(`/usuarios/${usuarioId}`);
    revalidatePath("/usuarios");
    return { ok: true };
  } catch (error) {
    console.error("Error asignando rol", error);
    return { ok: false, error: "No se pudo asignar el rol." };
  }
}

export async function revocarRol(usuarioId: string): Promise<ResultadoDeAccion> {
  await exigirSuperUsuario();

  const numericId = Number(usuarioId);
  if (!Number.isInteger(numericId)) {
    return { ok: false, error: "ID de usuario inválido." };
  }

  try {
    await ensureUsuariosTable();

    const actual = await pool.query<{ role: string[] | null }>(
      `SELECT role FROM usuarios WHERE id = $1`,
      [numericId],
    );
    if (actual.rowCount === 0) {
      return { ok: false, error: "El usuario no existe." };
    }

    // Revocar no detiene las campañas activas de esa persona: pasan a la
    // tutela del supervisor del área (esa reasignación aún no existe).
    const nuevosRoles = normalizeRoles(
      (actual.rows[0].role ?? []).filter((r) => r !== "supervisor" && r !== "revisor"),
    );

    await pool.query(`UPDATE usuarios SET role = $2::jsonb, updated_at = NOW() WHERE id = $1`, [
      numericId,
      JSON.stringify(nuevosRoles),
    ]);
    // Si era revisor aceptado en alguna campaña, se le retira ahí también:
    // si no, la sesión se lo vuelve a asignar solo con el siguiente login.
    await retirarComoRevisorDeTodasLasCampanas(numericId);

    revalidatePath(`/usuarios/${usuarioId}/roles`);
    revalidatePath(`/usuarios/${usuarioId}`);
    revalidatePath("/usuarios");
    return { ok: true };
  } catch (error) {
    console.error("Error revocando rol", error);
    return { ok: false, error: "No se pudo revocar el rol." };
  }
}

export async function aplicarSancion(
  usuarioId: string,
  datos: { tipo: TipoDeSancion; detalle: string; dias?: number },
): Promise<ResultadoDeAccion> {
  await exigirSuperUsuario();

  const numericId = Number(usuarioId);
  if (!Number.isInteger(numericId)) {
    return { ok: false, error: "ID de usuario inválido." };
  }

  const detalle = datos.detalle.trim();
  if (detalle.length < 20) {
    return { ok: false, error: "El detalle debe tener al menos 20 caracteres." };
  }
  if (datos.tipo === "SUSPENSION_TEMPORAL" && !datos.dias) {
    return { ok: false, error: "Indica cuántos días dura la suspensión." };
  }

  try {
    await ensureUsuariosTable();
    await ensureSancionesTable();

    const usuario = await pool.query(`SELECT id FROM usuarios WHERE id = $1`, [numericId]);
    if (usuario.rowCount === 0) {
      return { ok: false, error: "El usuario no existe." };
    }

    await pool.query(
      `INSERT INTO sanciones (usuario_id, tipo, detalle, dias)
       VALUES ($1, $2, $3, $4)`,
      [numericId, datos.tipo, detalle, datos.tipo === "SUSPENSION_TEMPORAL" ? datos.dias : null],
    );
  } catch (error) {
    console.error("Error aplicando sanción", error);
    return { ok: false, error: "No se pudo aplicar la sanción." };
  }

  revalidatePath("/usuarios/sanciones");
  revalidatePath(`/usuarios/${usuarioId}`);
  revalidatePath("/usuarios");
  redirect("/usuarios/sanciones");
}

export async function restaurarAcceso(
  sancionId: string,
): Promise<ResultadoDeAccion> {
  await exigirSuperUsuario();

  const numericId = Number(sancionId);
  if (!Number.isInteger(numericId)) {
    return { ok: false, error: "ID de sanción inválido." };
  }

  try {
    await ensureSancionesTable();

    // El contador de strikes NO se reinicia: se conserva para la escala de
    // penalización, así que esto solo cambia el estado de la cuenta.
    const result = await pool.query(
      `UPDATE sanciones SET activa = false, restaurada_en = NOW()
       WHERE id = $1 AND activa = true`,
      [numericId],
    );
    if (result.rowCount === 0) {
      return { ok: false, error: "La sanción no existe o ya fue restaurada." };
    }
  } catch (error) {
    console.error("Error restaurando acceso", error);
    return { ok: false, error: "No se pudo restaurar el acceso." };
  }

  revalidatePath("/usuarios/sanciones");
  revalidatePath("/usuarios");
  return { ok: true };
}
