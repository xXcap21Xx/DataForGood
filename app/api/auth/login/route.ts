import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { createSession } from "@/lib/session";
import { verifyPassword, hashPassword, wasLegacyHash } from "@/lib/password";
import { isValidEmail } from "@/lib/validation";
import { startVerification } from "@/lib/verification";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 1000 * 60 * 15; // 15 minutos

const ensureUsuariosTable = `
  CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    apellidos VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
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
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
`;

const ensureUsuariosColumns = `
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
`;

export async function POST(request: Request) {
  try {
    await pool.query(ensureUsuariosTable);
    await pool.query(ensureUsuariosColumns);

    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Correo y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "El correo no tiene un formato válido" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `SELECT id, nombre, apellidos, email, password_hash, state, city, specialty, intereses, role,
              xp_total, level, streak_days, email_verificado, failed_login_attempts, locked_until
       FROM usuarios
       WHERE email = $1
       LIMIT 1`,
      [email]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Correo o contraseña incorrectos" },
        { status: 401 }
      );
    }

    const usuario = result.rows[0];

    if (usuario.locked_until && new Date(usuario.locked_until) > new Date()) {
      const minutosRestantes = Math.ceil(
        (new Date(usuario.locked_until).getTime() - Date.now()) / 60000
      );
      return NextResponse.json(
        { error: `Cuenta bloqueada temporalmente. Intenta de nuevo en ${minutosRestantes} minuto(s)` },
        { status: 423 }
      );
    }

    if (!usuario.password_hash) {
      return NextResponse.json(
        { error: "Esta cuenta usa Google para iniciar sesión. Usa el botón de Google." },
        { status: 400 }
      );
    }

    const passwordMatches = await verifyPassword(password, usuario.password_hash);

    if (!passwordMatches) {
      const attempts = usuario.failed_login_attempts + 1;
      const lockUntil = attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCK_DURATION_MS) : null;

      await pool.query(
        `UPDATE usuarios SET failed_login_attempts = $2, locked_until = $3 WHERE id = $1`,
        [usuario.id, attempts, lockUntil]
      );

      return NextResponse.json(
        { error: "Correo o contraseña incorrectos" },
        { status: 401 }
      );
    }

    if (wasLegacyHash(usuario.password_hash)) {
      const upgradedHash = await hashPassword(password);
      await pool.query(`UPDATE usuarios SET password_hash = $2 WHERE id = $1`, [usuario.id, upgradedHash]);
    }

    await pool.query(
      `UPDATE usuarios SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1`,
      [usuario.id]
    );

    if (!usuario.email_verificado) {
      try {
        await startVerification(usuario.id, usuario.email, usuario.nombre);
      } catch (verificationError) {
        console.error("No se pudo enviar el correo de verificación", verificationError);
      }
      return NextResponse.json(
        { error: "Verifica tu correo antes de iniciar sesión", requiresVerification: true },
        { status: 403 }
      );
    }

    delete usuario.password_hash;
    delete usuario.failed_login_attempts;
    delete usuario.locked_until;

    await createSession(usuario.id);

    return NextResponse.json({ message: "Sesión iniciada", data: usuario }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo iniciar sesión" },
      { status: 500 }
    );
  }
}
