import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { createRootSession } from "@/lib/rootSession";

/**
 * POST /api/auth/root — valida la credencial de SuperUsuario y abre su
 * sesión. El registro en audit_log sigue pendiente (no existe esa tabla
 * todavía en el proyecto).
 */

/** Ventana simple en memoria. En producción conviene moverla a Redis. */
const INTENTOS_MAX = 5;
const VENTANA_MS = 60_000;
const intentos = new Map<string, { n: number; desde: number }>();

function obtenerIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "desconocida";
}

function excedeIntentos(ip: string): boolean {
  const ahora = Date.now();
  const registro = intentos.get(ip);

  if (!registro || ahora - registro.desde > VENTANA_MS) {
    intentos.set(ip, { n: 1, desde: ahora });
    return false;
  }

  registro.n += 1;
  return registro.n > INTENTOS_MAX;
}

function identificadorCoincide(recibido: string, esperado: string): boolean {
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  // Se compara siempre sobre longitudes iguales para no filtrar por tiempo.
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const ip = obtenerIp(request);

  if (excedeIntentos(ip)) {
    return NextResponse.json({ error: "Demasiados intentos." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const identificador = typeof body.identificador === "string" ? body.identificador : "";
  const credencial = typeof body.credencial === "string" ? body.credencial : "";

  if (!identificador || !credencial) {
    return NextResponse.json({ error: "Petición incompleta." }, { status: 400 });
  }

  const idEsperado = process.env.ROOT_USER_ID;
  const hashEsperado = process.env.ROOT_PASSWORD_HASH;

  if (!idEsperado || !hashEsperado) {
    console.error("Faltan ROOT_USER_ID o ROOT_PASSWORD_HASH en el entorno.");
    return NextResponse.json({ error: "Acceso raíz no configurado." }, { status: 500 });
  }

  // Se evalúan ambos factores siempre, sin cortocircuito, para que el tiempo
  // de respuesta no revele cuál de los dos falló.
  const idOk = identificadorCoincide(identificador, idEsperado);
  const credOk = await bcrypt.compare(credencial, hashEsperado);

  if (!idOk || !credOk) {
    // TODO(flujo): registrar el intento fallido en audit_log.
    return NextResponse.json({ error: "Credencial no válida." }, { status: 401 });
  }

  intentos.delete(ip);

  await createRootSession();

  // TODO(flujo): registrar el acceso exitoso en audit_log.

  return new NextResponse(null, { status: 204 });
}
