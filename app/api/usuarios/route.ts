import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { isValidEmail } from "@/lib/validation";
import { startVerification } from "@/lib/verification";
import { normalizeRoles } from "@/lib/roles";

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
    role JSONB NOT NULL DEFAULT '["usuario"]'::jsonb,
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
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nombre VARCHAR(120);
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS apellidos VARCHAR(120);
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS state VARCHAR(100);
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS city VARCHAR(100);
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS specialty VARCHAR(150);
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS intereses JSONB NOT NULL DEFAULT '[]'::jsonb;
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
`;

export async function POST(request: Request) {
  try {
    await pool.query(ensureUsuariosTable);
    await pool.query(ensureUsuariosColumns);

    const body = await request.json();

    const nombre = String(body.nombre ?? body.alias ?? "").trim();
    const apellidos = String(body.apellidos ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const state = String(body.state ?? "").trim();
    const city = String(body.city ?? "").trim();
    const specialty = String(body.specialty ?? "").trim();
    const intereses = Array.isArray(body.intereses) ? body.intereses : [];
    let roles: string[];

    try {
      roles = normalizeRoles(body.role ?? body.roles ?? ["usuario"]);
    } catch (error) {
      return NextResponse.json(
        { error: "Un usuario no puede tener a la vez los roles supervisor y revisor" },
        { status: 400 }
      );
    }

    if (!nombre || !apellidos || !email || password.length < 6) {
      return NextResponse.json(
        { error: "nombre, apellidos, email y password (mínimo 6 caracteres) son obligatorios" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "El correo no tiene un formato válido" },
        { status: 400 }
      );
    }

    const emailExists = await pool.query(
      `SELECT 1 FROM usuarios WHERE email = $1 LIMIT 1`,
      [email]
    );

    if (emailExists.rowCount && emailExists.rowCount > 0) {
      return NextResponse.json(
        { error: "El email ya está registrado" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const result = await pool.query(
      `INSERT INTO usuarios (nombre, apellidos, email, password_hash, state, city, specialty, intereses, xp_total, level, streak_days, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, 0, 1, 0, $9::jsonb)
       RETURNING id, nombre, apellidos, email, state, city, specialty, intereses, role, xp_total, level, streak_days, email_verificado`,
      [nombre, apellidos, email, passwordHash, state, city, specialty, JSON.stringify(intereses), JSON.stringify(roles)]
    );

    const usuario = result.rows[0];
    let emailEnviado = true;
    const response = NextResponse.json(
      { message: "Usuario creado", data: usuario, emailEnviado },
      { status: 201 }
    );

    try {
      const { expiresAt } = await startVerification(usuario.id, usuario.email, usuario.nombre, response);
      response.cookies.set("pending_verification_id", String(usuario.id), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: expiresAt,
      });
    } catch (verificationError) {
      console.error("No se pudo enviar el correo de verificación", verificationError);
      emailEnviado = false;
      response.cookies.delete("pending_verification_id");
    }

    return response;
  } catch (error) {
    console.error("POST /api/usuarios: ", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "No se pudo crear el usuario", detail: message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await pool.query(ensureUsuariosTable);
    await pool.query(ensureUsuariosColumns);

    const result = await pool.query(
      `SELECT id, nombre, apellidos, email, state, city, specialty, intereses, role, xp_total, level, streak_days, email_verificado
       FROM usuarios ORDER BY id DESC LIMIT 50`
    );

    return NextResponse.json({ data: result.rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudieron listar los usuarios" },
      { status: 500 }
    );
  }
}
