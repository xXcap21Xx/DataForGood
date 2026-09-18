import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ensureUsuariosTable } from "@/lib/db-schema";
import { getSessionUser } from "@/lib/session";

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

    // Este endpoint solo edita el perfil propio: sin esto, cualquiera podía
    // mandar un PATCH a /api/usuarios/<otro-id> y sobrescribir sus datos.
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Debes iniciar sesion" }, { status: 401 });
    }
    if (Number(sessionUser.id) !== Number(rawId)) {
      return NextResponse.json(
        { error: "Solo puedes editar tu propia cuenta" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : null;
    const apellidos = typeof body.apellidos === "string" ? body.apellidos.trim() : null;
    if (body.nombre !== undefined && !nombre) {
      return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
    }
    if (body.apellidos !== undefined && !apellidos) {
      return NextResponse.json({ error: "Los apellidos no pueden estar vacíos" }, { status: 400 });
    }

    // A diferencia de nombre/apellidos/intereses (que se conservan si el
    // caller no manda la llave), state/city/specialty sí se pueden vaciar a
    // propósito: el formulario de cuenta ya no preselecciona un valor por
    // defecto, así que un "" explícito significa "lo dejé sin elegir", no
    // "no toques este campo".
    const state = body.state !== undefined ? String(body.state).trim() || null : undefined;
    const city = body.city !== undefined ? String(body.city).trim() || null : undefined;
    const specialty = body.specialty !== undefined ? String(body.specialty).trim() || null : undefined;
    const intereses = Array.isArray(body.intereses)
      ? JSON.stringify(body.intereses.map(String))
      : null;

    const result = await pool.query(
      `UPDATE usuarios
       SET nombre = COALESCE($2, nombre),
           apellidos = COALESCE($3, apellidos),
           state = CASE WHEN $4::boolean THEN $5 ELSE state END,
           city = CASE WHEN $6::boolean THEN $7 ELSE city END,
           specialty = CASE WHEN $8::boolean THEN $9 ELSE specialty END,
           intereses = COALESCE($10::jsonb, intereses),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, nombre, apellidos, email, state, city, specialty, intereses, role, xp_total, level, streak_days`,
      [
        Number(rawId),
        nombre,
        apellidos,
        state !== undefined,
        state ?? null,
        city !== undefined,
        city ?? null,
        specialty !== undefined,
        specialty ?? null,
        intereses,
      ]
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
