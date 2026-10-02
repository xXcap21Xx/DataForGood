// /api/usuarios/[id]/contrasena — cambio de contraseña desde /cuenta.
// Solo sobre la cuenta propia y solo si la cuenta tiene contraseña (no las de Google).

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { hashPassword, verifyPassword, LOCK_DURATION_MS, MAX_FAILED_ATTEMPTS } from "@/lib/password";
import { cumpleReglasDeContrasena } from "@/lib/reglas-contrasena";
import { registrarAuditoria } from "@/lib/auditoria";

// PATCH: { actual, nueva }. Revisa la contraseña actual y guarda la nueva.
// Una contraseña actual equivocada cuenta como intento fallido de inicio de sesión
// (mismo contador y mismo bloqueo de 15 minutos), para que una sesión robada no sirva
// para adivinarla. Las sesiones abiertas, incluida la actual, se conservan.
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Debes iniciar sesion" }, { status: 401 });
    }
    if (Number(sessionUser.id) !== Number(id)) {
      return NextResponse.json(
        { error: "Solo puedes cambiar la contraseña de tu propia cuenta" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const actual = typeof body.actual === "string" ? body.actual : "";
    const nueva = typeof body.nueva === "string" ? body.nueva : "";
    if (!actual || !nueva) {
      return NextResponse.json(
        { error: "La contraseña actual y la nueva son obligatorias" },
        { status: 400 }
      );
    }
    if (!cumpleReglasDeContrasena(nueva)) {
      return NextResponse.json(
        { error: "La nueva contraseña no cumple los requisitos" },
        { status: 400 }
      );
    }
    if (nueva === actual) {
      return NextResponse.json(
        { error: "La nueva contraseña debe ser distinta de la actual" },
        { status: 400 }
      );
    }

    const result = await pool.query<{ password_hash: string | null; locked_until: Date | null }>(
      `SELECT password_hash, locked_until FROM usuarios WHERE id = $1`,
      [Number(id)]
    );
    const usuario = result.rows[0];
    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (usuario.locked_until && new Date(usuario.locked_until) > new Date()) {
      const minutosRestantes = Math.ceil(
        (new Date(usuario.locked_until).getTime() - Date.now()) / 60000
      );
      return NextResponse.json(
        { error: `Demasiados intentos fallidos. Intenta de nuevo en ${minutosRestantes} minuto(s)` },
        { status: 423 }
      );
    }

    if (!usuario.password_hash) {
      return NextResponse.json(
        { error: "Esta cuenta inicia sesión con Google y no tiene contraseña" },
        { status: 400 }
      );
    }

    if (!(await verifyPassword(actual, usuario.password_hash))) {
      // Suma y bloquea en una sola sentencia: dos intentos a la vez no se pisan.
      await pool.query(
        `UPDATE usuarios
         SET failed_login_attempts = failed_login_attempts + 1,
             locked_until = CASE WHEN failed_login_attempts + 1 >= $2
                                 THEN NOW() + make_interval(secs => $3)
                                 ELSE locked_until END
         WHERE id = $1`,
        [Number(id), MAX_FAILED_ATTEMPTS, LOCK_DURATION_MS / 1000]
      );
      return NextResponse.json(
        { error: "La contraseña actual no es correcta" },
        { status: 400 }
      );
    }

    const nuevoHash = await hashPassword(nueva);
    await pool.query(
      `UPDATE usuarios
       SET password_hash = $2, failed_login_attempts = 0, locked_until = NULL, updated_at = NOW()
       WHERE id = $1`,
      [Number(id), nuevoHash]
    );

    await registrarAuditoria({
      actor: { tipo: "usuario", id: Number(id) },
      accion: "usuario.contrasena_cambiar",
      objetivo: { tipo: "usuario", id: Number(id) },
    });

    return NextResponse.json({ data: { ok: true } }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/usuarios/[id]/contrasena:", error);
    return NextResponse.json(
      { error: "No se pudo cambiar la contraseña" },
      { status: 500 }
    );
  }
}
