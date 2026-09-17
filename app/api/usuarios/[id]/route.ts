import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ensureUsuariosTable } from "@/lib/db-schema";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureUsuariosTable();

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
    await ensureUsuariosTable();

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
