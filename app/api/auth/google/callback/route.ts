import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pool } from "@/lib/db";
import { createSession } from "@/lib/session";
import { exchangeCodeForProfile } from "@/lib/google";

const STATE_COOKIE = "google_oauth_state";

const ensureUsuariosTable = `
  CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    apellidos VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    state VARCHAR(100),
    city VARCHAR(100),
    specialty VARCHAR(150),
    intereses JSONB NOT NULL DEFAULT '[]'::jsonb,
    role VARCHAR(30) NOT NULL DEFAULT 'usuario',
    xp_total INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    streak_days INTEGER NOT NULL DEFAULT 0,
    email_verificado BOOLEAN NOT NULL DEFAULT false,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP,
    google_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
`;

const ensureGoogleColumn = `
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
  ALTER TABLE usuarios ALTER COLUMN password_hash DROP NOT NULL;
`;

export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    const cookieStore = await cookies();
    const expectedState = cookieStore.get(STATE_COOKIE)?.value;
    cookieStore.delete(STATE_COOKIE);

    if (!code || !state || !expectedState || state !== expectedState) {
      return NextResponse.redirect(new URL("/entrar?error=google", request.url));
    }

    const profile = await exchangeCodeForProfile(code);

    await pool.query(ensureUsuariosTable);
    await pool.query(ensureGoogleColumn);

    const existing = await pool.query(
      `SELECT id FROM usuarios WHERE email = $1 OR google_id = $2 LIMIT 1`,
      [profile.email, profile.googleId]
    );

    let usuarioId: number;

    if (existing.rowCount && existing.rowCount > 0) {
      usuarioId = existing.rows[0].id;
      await pool.query(
        `UPDATE usuarios SET google_id = $2, email_verificado = true WHERE id = $1`,
        [usuarioId, profile.googleId]
      );
    } else {
      const inserted = await pool.query(
        `INSERT INTO usuarios (nombre, apellidos, email, password_hash, google_id, email_verificado, role, xp_total, level, streak_days)
         VALUES ($1, $2, $3, NULL, $4, true, 'usuario', 0, 1, 0)
         RETURNING id`,
        [profile.givenName, profile.familyName, profile.email, profile.googleId]
      );
      usuarioId = inserted.rows[0].id;
    }

    await createSession(usuarioId);

    return NextResponse.redirect(new URL("/campanas", request.url));
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(new URL("/entrar?error=google", request.url));
  }
}
