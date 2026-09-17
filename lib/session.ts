import { randomBytes, createHash } from "crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { pool } from "@/lib/db";
import { ensureSessionsTable, ensureUsuariosTable } from "@/lib/db-schema";

const COOKIE_NAME = "session_token";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 días

export interface SessionUser {
  id: number;
  nombre: string;
  apellidos: string;
  email: string;
  state: string | null;
  city: string | null;
  specialty: string | null;
  intereses: string[];
  role: string[];
  xp_total: number;
  level: number;
  streak_days: number;
  email_verificado: boolean;
  tiene_contrasena: boolean;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(usuarioId: number) {
  await ensureUsuariosTable();
  await ensureSessionsTable();

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await pool.query(
    `INSERT INTO sessions (token_hash, usuario_id, expires_at) VALUES ($1, $2, $3)`,
    [tokenHash, usuarioId, expiresAt]
  );

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  await ensureUsuariosTable();
  await ensureSessionsTable();

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const tokenHash = hashToken(token);

  const result = await pool.query(
    `SELECT u.id, u.nombre, u.apellidos, u.email, u.state, u.city, u.specialty,
            u.intereses, u.role, u.xp_total, u.level, u.streak_days, u.email_verificado,
            (u.password_hash IS NOT NULL) AS tiene_contrasena
     FROM sessions s
     JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0] as SessionUser;
});

export async function destroySession() {
  await ensureUsuariosTable();
  await ensureSessionsTable();

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    await pool.query(`DELETE FROM sessions WHERE token_hash = $1`, [hashToken(token)]);
  }

  cookieStore.delete(COOKIE_NAME);
}
