import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { pool } from "@/lib/db";
import { createSession } from "@/lib/session";

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
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
`;

export async function POST(request: Request) {
  try {
    await pool.query(ensureUsuariosTable);

    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Correo y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    const passwordHash = createHash("sha256").update(password).digest("hex");

    const result = await pool.query(
      `SELECT id, nombre, apellidos, email, state, city, specialty, intereses, role, xp_total, level, streak_days
       FROM usuarios
       WHERE email = $1 AND password_hash = $2
       LIMIT 1`,
      [email, passwordHash]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Correo o contraseña incorrectos" },
        { status: 401 }
      );
    }

    const usuario = result.rows[0];
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
