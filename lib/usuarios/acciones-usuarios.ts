"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { pool } from "@/lib/db";
import { hasRootSession } from "@/lib/rootSession";
import { normalizeRoles } from "@/lib/roles";
import { CODIGO_DE_ROL, type RolAsignable } from "@/lib/usuarios/rol-asignable";
import type { TipoDeSancion } from "@/lib/usuarios/directorio";

export type ResultadoDeAccion = { ok: true } | { ok: false; error: string };

/*
 * ────────────────────────────────────────────────────────────────────────────
 * PENDIENTE DE CONECTAR
 *
 * asignarRol y revocarRol ya escriben de verdad en `usuarios.role`. Falta en
 * las cuatro acciones:
 *   1. El registro en auditoría: quién, cuándo, sobre quién y con qué motivo
 *      (no existe tabla de auditoría todavía).
 * Y en aplicarSancion / restaurarAcceso específicamente:
 *   2. La escritura real: no existe tabla de sanciones, así que siguen sin
 *      tocar la base (ver el TODO de cada una).
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

  const numericId = Number(usuarioId);
  if (!Number.isInteger(numericId)) {
    return { ok: false, error: "ID de usuario inválido." };
  }

  const actual = await pool.query<{ role: string[] | null }>(
    `SELECT role FROM usuarios WHERE id = $1`,
    [numericId],
  );
  if (actual.rowCount === 0) {
    return { ok: false, error: "El usuario no existe." };
  }

  const codigo = CODIGO_DE_ROL[rol];
  const opuesto = codigo === "supervisor" ? "revisor" : "supervisor";
  const rolesSinElOpuesto = (actual.rows[0].role ?? []).filter((r) => r !== opuesto);
  const nuevosRoles = normalizeRoles([...rolesSinElOpuesto, codigo]);

  await pool.query(`UPDATE usuarios SET role = $2::jsonb, updated_at = NOW() WHERE id = $1`, [
    numericId,
    JSON.stringify(nuevosRoles),
  ]);

  revalidatePath(`/usuarios/${usuarioId}/roles`);
  revalidatePath(`/usuarios/${usuarioId}`);
  revalidatePath("/usuarios");
  return { ok: true };
}

export async function revocarRol(usuarioId: string): Promise<ResultadoDeAccion> {
  await exigirSuperUsuario();

  const numericId = Number(usuarioId);
  if (!Number.isInteger(numericId)) {
    return { ok: false, error: "ID de usuario inválido." };
  }

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

  revalidatePath(`/usuarios/${usuarioId}/roles`);
  revalidatePath(`/usuarios/${usuarioId}`);
  revalidatePath("/usuarios");
  return { ok: true };
}

export async function aplicarSancion(
  usuarioId: string,
  datos: { tipo: TipoDeSancion; detalle: string; dias?: number },
): Promise<ResultadoDeAccion> {
  await exigirSuperUsuario();

  const detalle = datos.detalle.trim();
  if (detalle.length < 20) {
    return { ok: false, error: "El detalle debe tener al menos 20 caracteres." };
  }
  if (datos.tipo === "SUSPENSION_TEMPORAL" && !datos.dias) {
    return { ok: false, error: "Indica cuántos días dura la suspensión." };
  }

  // TODO, en una transacción:
  //   - registrar la sanción
  //   - si es STRIKE, incrementar el contador y, al llegar al tercero,
  //     ejecutar el baneo permanente y bloquear el correo
  //   - notificar al usuario
  //   - auditar

  void usuarioId;
  revalidatePath("/usuarios/sanciones");
  redirect("/usuarios/sanciones");
}

export async function restaurarAcceso(
  sancionId: string,
): Promise<ResultadoDeAccion> {
  await exigirSuperUsuario();

  // TODO: levantar la restricción y auditarla.
  // El contador de strikes NO se reinicia: se conserva para la escala de
  // penalización, así que esto solo cambia el estado de la cuenta.
  void sancionId;

  revalidatePath("/usuarios/sanciones");
  return { ok: true };
}
