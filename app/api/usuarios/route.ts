// /api/usuarios — registro de cuentas y buscador de revisores.
// Ojo: el POST lee roles del body (hueco conocido, docs/README.md § 8).

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { isValidEmail } from "@/lib/validation";
import { startVerification } from "@/lib/verification";
import { normalizeRoles } from "@/lib/roles";
import { getSessionUser } from "@/lib/session";

// POST: registro. Crea la cuenta sin verificar y envía el código por correo.
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const nombre = String(body.nombre ?? body.alias ?? "").trim();
    const apellidos = String(body.apellidos ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const state = String(body.state ?? "").trim();
    const city = String(body.city ?? "").trim();
    const specialty = String(body.specialty ?? "").trim();
    const intereses = Array.isArray(body.intereses) ? body.intereses : [];
    const roles = normalizeRoles(body.role ?? body.roles ?? ["usuario"]);

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

const MINIMO_BUSQUEDA = 3;
const MAXIMO_RESULTADOS = 10;

/** "ana.lopez@gmail.com" -> "an***@gmail.com": identifica sin exponer el correo. */
function ocultarCorreo(email: string): string {
  const [local, dominio] = email.split("@");
  const visible = local.length > 2 ? local.slice(0, 2) : local.slice(0, 1);
  return `${visible}***@${dominio ?? ""}`;
}

/**
 * GET /api/usuarios?campanaId=…&q=… — buscador de "agregar revisor".
 * Solo lo usa el creador de esa campaña, con al menos 3 letras del nombre o
 * un correo completo, y devuelve pocas coincidencias con el correo oculto:
 * así no sirve para descargar la lista de usuarios.
 */
export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Debes iniciar sesion" }, { status: 401 });
    }

    const url = new URL(request.url);
    const campanaId = Number(url.searchParams.get("campanaId"));
    const q = (url.searchParams.get("q") ?? "").trim();

    if (!Number.isInteger(campanaId) || campanaId <= 0) {
      return NextResponse.json({ error: "campanaId es obligatorio" }, { status: 400 });
    }
    const campana = await pool.query(`SELECT creator_id FROM campanas WHERE id = $1`, [campanaId]);
    if (campana.rowCount === 0) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
    }
    if (Number(campana.rows[0].creator_id) !== Number(user.id)) {
      return NextResponse.json({ error: "Solo el creador de la campaña puede buscar revisores" }, { status: 403 });
    }

    const porCorreo = q.includes("@");
    if (porCorreo ? !isValidEmail(q) : q.length < MINIMO_BUSQUEDA) {
      return NextResponse.json({ data: [] });
    }

    // Por correo: coincidencia exacta. Por nombre: contiene el texto (con %
    // y _ escapados para que se busquen literalmente).
    const patron = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const result = await pool.query<{ id: number; nombre: string; apellidos: string; email: string; role: string[] }>(
      `SELECT id, nombre, apellidos, email, role
       FROM usuarios
       WHERE email_verificado
         AND id <> $1
         AND ${porCorreo ? "LOWER(email) = LOWER($2)" : "(nombre || ' ' || apellidos) ILIKE $2"}
       ORDER BY nombre, apellidos
       LIMIT ${MAXIMO_RESULTADOS}`,
      [user.id, porCorreo ? q : patron]
    );

    return NextResponse.json({
      data: result.rows.map((fila) => ({
        id: fila.id,
        nombre: fila.nombre,
        apellidos: fila.apellidos,
        emailOculto: ocultarCorreo(fila.email),
        role: fila.role,
      })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudieron listar los usuarios" },
      { status: 500 }
    );
  }
}
