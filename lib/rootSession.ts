import { randomBytes, createHash } from "crypto";
import { cookies } from "next/headers";
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

// TIMESTAMPTZ, no TIMESTAMP: Postgres corre en UTC pero el servidor de Next
// puede correr en otra zona horaria. Con una columna sin zona, "expires_at"
// se compara contra NOW() como si ambos fueran del mismo huso — con husos
// distintos, la sesión nace ya "expirada".
const ensureRootSessionsTable = `
  CREATE TABLE IF NOT EXISTS root_sessions (
    id SERIAL PRIMARY KEY,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
  );
`;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createRootSession() {
  await pool.query(ensureRootSessionsTable);

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await pool.query(
    `INSERT INTO root_sessions (token_hash, expires_at) VALUES ($1, $2)`,
    [tokenHash, expiresAt]
  );

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function hasRootSession(): Promise<boolean> {
  await pool.query(ensureRootSessionsTable);

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;

  const result = await pool.query(
    `SELECT 1 FROM root_sessions WHERE token_hash = $1 AND expires_at > NOW() LIMIT 1`,
    [hashToken(token)]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function destroyRootSession() {
  await pool.query(ensureRootSessionsTable);

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    await pool.query(`DELETE FROM root_sessions WHERE token_hash = $1`, [hashToken(token)]);
  }

  cookieStore.delete(COOKIE_NAME);
}
