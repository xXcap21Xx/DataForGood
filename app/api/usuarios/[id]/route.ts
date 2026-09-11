import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

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

const ensureUsuariosColumns = `
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nombre VARCHAR(120);
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS apellidos VARCHAR(120);
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS state VARCHAR(100);
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS city VARCHAR(100);
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS specialty VARCHAR(150);
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS intereses JSONB NOT NULL DEFAULT '[]'::jsonb;
`;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await pool.query(ensureUsuariosTable);
    await pool.query(ensureUsuariosColumns);

    const { id } = await context.params;
    const rawId = id;

    if (!rawId || Number.isNaN(Number(rawId))) {
      return NextResponse.json(
        { error: "El id del usuario es obligatorio" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `SELECT
        id,
        nombre,
        apellidos,
        email,
        state,
        city,
        specialty,
        intereses,
        role,
        xp_total,
        level,
        streak_days,
        created_at,
        updated_at
       FROM usuarios
       WHERE id = $1
       LIMIT 1`,
      [Number(rawId)]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo obtener el usuario" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await pool.query(ensureUsuariosTable);
    await pool.query(ensureUsuariosColumns);

    const { id } = await context.params;
    const rawId = id;

    if (!rawId || Number.isNaN(Number(rawId))) {
      return NextResponse.json(
        { error: "El id del usuario es obligatorio" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const state = body.state ? String(body.state).trim() : null;
    const city = body.city ? String(body.city).trim() : null;
    const specialty = body.specialty ? String(body.specialty).trim() : null;
    const intereses = Array.isArray(body.intereses) ? body.intereses : [];

    const result = await pool.query(
      `UPDATE usuarios
       SET state = COALESCE($2, state),
           city = COALESCE($3, city),
           specialty = COALESCE($4, specialty),
           intereses = $5::jsonb,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, nombre, apellidos, email, state, city, specialty, intereses, role, xp_total, level, streak_days`,
      [Number(rawId), state, city, specialty, JSON.stringify(intereses)]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo actualizar el usuario" },
      { status: 500 }
    );
  }
}
