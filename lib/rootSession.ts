import { randomBytes, createHash } from "crypto";
import { cookies, headers } from "next/headers";
import { pool } from "@/lib/db";

/**
 * Sesión de SuperUsuario, separada de `lib/session.ts`: la credencial raíz
 * no es una fila de `usuarios` (ver app/(auth)/root), así que no puede
 * compartir la tabla `sessions`, que exige `usuario_id`.
 */

const COOKIE_NAME = "root_session_token";
// Sesión de vida corta acorde a RNF-SEC-03: quien entra a /root confirma
// identidad seguido si la deja abierta.
const SESSION_DURATION_MS = 1000 * 60 * 60 * 2; // 2 horas

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Crea una sesión raíz y devuelve su token en claro (en la BD solo queda el
 * sha256). La usan la cookie de /root y el token Bearer de
 * POST /api/auth/root/token, que sirve para probar la API desde Swagger.
 */
export async function emitirTokenRoot(): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await pool.query(
    `INSERT INTO root_sessions (token_hash, expires_at) VALUES ($1, $2)`,
    [hashToken(token), expiresAt]
  );

  return { token, expiresAt };
}

export async function createRootSession() {
  const { token, expiresAt } = await emitirTokenRoot();

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** `Authorization: Bearer <token>`: el navegador nunca lo manda solo, así que no abre la puerta a CSRF. */
function tokenBearer(valor: string | null): string | null {
  const coincidencia = valor?.match(/^Bearer\s+([0-9a-f]{64})$/i);
  return coincidencia ? coincidencia[1].toLowerCase() : null;
}

/** Sesión raíz por la cookie de /root o por el token Bearer de POST /api/auth/root/token. */
export async function hasRootSession(): Promise<boolean> {
  const cookieStore = await cookies();
  // Se revisan los dos: una cookie vieja ya vencida no debe anular un token Bearer vigente.
  const tokens = [
    cookieStore.get(COOKIE_NAME)?.value,
    tokenBearer((await headers()).get("authorization")),
  ].filter((t): t is string => Boolean(t));
  if (tokens.length === 0) return false;

  const result = await pool.query(
    `SELECT 1 FROM root_sessions WHERE token_hash = ANY($1::text[]) AND expires_at > NOW() LIMIT 1`,
    [tokens.map(hashToken)]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function destroyRootSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    await pool.query(`DELETE FROM root_sessions WHERE token_hash = $1`, [hashToken(token)]);
  }

  cookieStore.delete(COOKIE_NAME);
}
