"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { pool } from "@/lib/db";
import { hasRootSession } from "@/lib/rootSession";
import { normalizeRoles } from "@/lib/roles";
import { CODIGO_DE_ROL, type RolAsignable } from "@/lib/usuarios/rol-asignable";
import type { TipoDeSancion } from "@/lib/usuarios/directorio";
import { retirarComoRevisorDeTodasLasCampanas } from "@/lib/usuarios/revisor";
import { registrarAuditoria } from "@/lib/auditoria";
import { TIPOS_QUE_BLOQUEAN } from "@/lib/sanciones";

export type ResultadoDeAccion = { ok: true } | { ok: false; error: string };

/*
 * ────────────────────────────────────────────────────────────────────────────
 * Las cuatro acciones escriben de verdad (asignarRol/revocarRol en
 * `usuarios.role`, aplicarSancion/restaurarAcceso en `sanciones`) y quedan en
 * audit_log. La suspensión y el baneo bloquean la cuenta (lib/sanciones.ts).
 * Falta:
 *   1. TODO(dominio): al tercer STRIKE no hay escalamiento automático a
 *      baneo permanente ni bloqueo de correo — hoy hay que aplicar el baneo
 *      a mano con tipo BANEO_DE_CAMPANA. El contador de strikes sí es real.
 *   2. Notificar al usuario sancionado: no hay envío de notificaciones en
 *      la app todavía.
 * ────────────────────────────────────────────────────────────────────────────
 */

async function exigirSuperUsuario(): Promise<void> {
  const autorizado = await hasRootSession();
  if (!autorizado) throw new Error("No autorizado");
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
    const actual = await pool.query<{ role: string[] | null }>(
      `SELECT role FROM usuarios WHERE id = $1`,
      [numericId],
    );
    if (actual.rowCount === 0) {
      return { ok: false, error: "El usuario no existe." };
    }

    // Supervisor y revisor ya no son mutuamente excluyentes: se agrega el
    // rol sin tocar los que ya tenía (incluido "revisor" si lo era).
    const codigo = CODIGO_DE_ROL[rol];
    const nuevosRoles = normalizeRoles([...(actual.rows[0].role ?? []), codigo]);

    await pool.query(`UPDATE usuarios SET role = $2::jsonb, updated_at = NOW() WHERE id = $1`, [
      numericId,
      JSON.stringify(nuevosRoles),
    ]);

    await registrarAuditoria({
      actor: { tipo: "superusuario" },
      accion: "rol.asignar",
      objetivo: { tipo: "usuario", id: numericId },
      detalle: { rol },
    });

    revalidatePath(`/usuarios/${usuarioId}/roles`);
    revalidatePath(`/usuarios/${usuarioId}`);
    revalidatePath("/usuarios");
    return { ok: true };
  } catch (error) {
    console.error("Error asignando rol", error);
    return { ok: false, error: "No se pudo asignar el rol." };
  }
}

export async function revocarRol(
  usuarioId: string,
  rol: RolAsignable,
): Promise<ResultadoDeAccion> {
  await exigirSuperUsuario();

  const numericId = Number(usuarioId);
  if (!Number.isInteger(numericId)) {
    return { ok: false, error: "ID de usuario inválido." };
  }

  try {
    const actual = await pool.query<{ role: string[] | null }>(
      `SELECT role FROM usuarios WHERE id = $1`,
      [numericId],
    );
    if (actual.rowCount === 0) {
      return { ok: false, error: "El usuario no existe." };
    }

    // Ya no son mutuamente excluyentes: se retira solo el rol indicado, sin
    // tocar el otro si también lo tenía. Revocar no detiene las campañas
    // activas de esa persona: pasan a la tutela del supervisor del área (esa
    // reasignación aún no existe).
    const codigo = CODIGO_DE_ROL[rol];
    const nuevosRoles = normalizeRoles(
      (actual.rows[0].role ?? []).filter((r) => r !== codigo),
    );

    await pool.query(`UPDATE usuarios SET role = $2::jsonb, updated_at = NOW() WHERE id = $1`, [
      numericId,
      JSON.stringify(nuevosRoles),
    ]);

    if (rol === "SUPERVISOR") {
      // Una campaña tiene un solo supervisor: las que tomó y aún no dictamina
      // vuelven a quedar libres para que otro supervisor las tome.
      await pool.query(
        `UPDATE campanas SET supervisor_id = NULL, updated_at = NOW()
         WHERE supervisor_id = $1 AND status = 'en_revision'`,
        [numericId],
      );
    }

    if (rol === "REVISOR_DE_APORTES") {
      // Si era revisor aceptado en alguna campaña, se le retira ahí también:
      // si no, la sesión se lo vuelve a asignar solo con el siguiente login.
      await retirarComoRevisorDeTodasLasCampanas(numericId);
    }

    await registrarAuditoria({
      actor: { tipo: "superusuario" },
      accion: "rol.revocar",
      objetivo: { tipo: "usuario", id: numericId },
      detalle: { rol },
    });

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
    const usuario = await pool.query(`SELECT id FROM usuarios WHERE id = $1`, [numericId]);
    if (usuario.rowCount === 0) {
      return { ok: false, error: "El usuario no existe." };
    }

    const dias = datos.tipo === "SUSPENSION_TEMPORAL" ? datos.dias : null;
    const sancion = await pool.query<{ id: number }>(
      `INSERT INTO sanciones (usuario_id, tipo, detalle, dias)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [numericId, datos.tipo, detalle, dias],
    );

    // Suspensión y baneo bloquean la cuenta: se cierran sus sesiones abiertas
    // para que el bloqueo aplique ya, no hasta que la sesión caduque.
    if (TIPOS_QUE_BLOQUEAN.has(datos.tipo)) {
      await pool.query(`DELETE FROM sessions WHERE usuario_id = $1`, [numericId]);
    }

    await registrarAuditoria({
      actor: { tipo: "superusuario" },
      accion: "sancion.aplicar",
      objetivo: { tipo: "usuario", id: numericId },
      detalle: { sancionId: sancion.rows[0].id, tipo: datos.tipo, dias, motivo: detalle },
    });
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
    // El contador de strikes NO se reinicia: se conserva para la escala de
    // penalización, así que esto solo cambia el estado de la cuenta.
    const result = await pool.query<{ usuario_id: number; tipo: string }>(
      `UPDATE sanciones SET activa = false, restaurada_en = NOW()
       WHERE id = $1 AND activa = true
       RETURNING usuario_id, tipo`,
      [numericId],
    );
    if (result.rowCount === 0) {
      return { ok: false, error: "La sanción no existe o ya fue restaurada." };
    }

    await registrarAuditoria({
      actor: { tipo: "superusuario" },
      accion: "sancion.restaurar",
      objetivo: { tipo: "usuario", id: result.rows[0].usuario_id },
      detalle: { sancionId: numericId, tipo: result.rows[0].tipo },
    });
  } catch (error) {
    console.error("Error restaurando acceso", error);
    return { ok: false, error: "No se pudo restaurar el acceso." };
  }

  revalidatePath("/usuarios/sanciones");
  revalidatePath("/usuarios");
  return { ok: true };
}
