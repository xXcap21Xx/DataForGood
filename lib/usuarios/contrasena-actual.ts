// Comprueba la contraseña actual de una cuenta antes de una acción sensible (cambiarla,
// pedir la baja). Un error cuenta como intento fallido de inicio de sesión: mismo
// contador y mismo bloqueo que el login, para que una sesión robada no sirva para adivinarla.

import { pool } from "@/lib/db";
import { verifyPassword, LOCK_DURATION_MS, MAX_FAILED_ATTEMPTS } from "@/lib/password";

export type ResultadoDeContrasena =
  | { ok: true }
  | { ok: false; status: 400 | 404 | 423; error: string };

export async function comprobarContrasenaActual(usuarioId: number, contrasena: string): Promise<ResultadoDeContrasena> {
  const result = await pool.query<{ password_hash: string | null; locked_until: Date | null }>(
    `SELECT password_hash, locked_until FROM usuarios WHERE id = $1`,
    [usuarioId]
  );
  const usuario = result.rows[0];
  if (!usuario) return { ok: false, status: 404, error: "Usuario no encontrado" };

  if (usuario.locked_until && new Date(usuario.locked_until) > new Date()) {
    const minutosRestantes = Math.ceil((new Date(usuario.locked_until).getTime() - Date.now()) / 60000);
    return {
      ok: false,
      status: 423,
      error: `Demasiados intentos fallidos. Intenta de nuevo en ${minutosRestantes} minuto(s)`,
    };
  }

  if (!usuario.password_hash) {
    return { ok: false, status: 400, error: "Esta cuenta inicia sesión con Google y no tiene contraseña" };
  }

  if (!(await verifyPassword(contrasena, usuario.password_hash))) {
    // Suma y bloquea en una sola sentencia: dos intentos a la vez no se pisan.
    await pool.query(
      `UPDATE usuarios
       SET failed_login_attempts = failed_login_attempts + 1,
           locked_until = CASE WHEN failed_login_attempts + 1 >= $2
                               THEN NOW() + make_interval(secs => $3)
                               ELSE locked_until END
       WHERE id = $1`,
      [usuarioId, MAX_FAILED_ATTEMPTS, LOCK_DURATION_MS / 1000]
    );
    return { ok: false, status: 400, error: "La contraseña actual no es correcta" };
  }

  return { ok: true };
}
