import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ensureUsuariosTable } from "@/lib/db-schema";
import { hashPassword } from "@/lib/password";
import { isValidEmail } from "@/lib/validation";
import { startVerification } from "@/lib/verification";
import { normalizeRoles } from "@/lib/roles";

export async function POST(request: Request) {
  try {
    await ensureUsuariosTable();

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
    await ensureUsuariosTable();

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
