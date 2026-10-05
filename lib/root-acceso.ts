// Validación de la credencial de SuperUsuario (ROOT_USER_ID + ROOT_PASSWORD_HASH del entorno).
// La comparten POST /api/auth/root (cookie para /root) y POST /api/auth/root/token
// (token Bearer para Swagger): mismo límite de intentos y misma bitácora de fallos.

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { registrarAuditoria } from "@/lib/auditoria";
import { ipDelCliente } from "@/lib/ip";

/** Ventana simple en memoria. En producción conviene moverla a Redis. */
const INTENTOS_MAX = 5;
const VENTANA_MS = 60_000;
const intentos = new Map<string, { n: number; desde: number }>();

/**
 * Tope global, sin importar la IP. X-Forwarded-For lo puede escribir el
 * cliente, así que cambiarlo en cada intento esquivaría el límite por IP;
 * este tope acota la fuerza bruta aunque el encabezado venga falsificado.
 */
const INTENTOS_MAX_GLOBAL = 30;
const CLAVE_GLOBAL = "*";

function contarIntento(clave: string, maximo: number): boolean {
  const ahora = Date.now();
  const registro = intentos.get(clave);

  if (!registro || ahora - registro.desde > VENTANA_MS) {
    intentos.set(clave, { n: 1, desde: ahora });
    return false;
  }

  registro.n += 1;
  return registro.n > maximo;
}

function excedeIntentos(ip: string): boolean {
  // Se cuentan los dos siempre (sin cortocircuito) para que el tope global
  // registre también los intentos de IPs ya bloqueadas.
  const porIp = contarIntento(ip, INTENTOS_MAX);
  const global = contarIntento(CLAVE_GLOBAL, INTENTOS_MAX_GLOBAL);
  return porIp || global;
}

function identificadorCoincide(recibido: string, esperado: string): boolean {
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  // Se compara siempre sobre longitudes iguales para no filtrar por tiempo.
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Lee `{ identificador, credencial }` del body y los compara con el entorno.
 * Devuelve `null` si son correctos, o la respuesta de error (400, 401, 429 o 500)
 * que la ruta debe regresar tal cual.
 */
export async function verificarCredencialRoot(request: Request): Promise<NextResponse | null> {
  const ip = ipDelCliente(request.headers);

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
    // No se guarda el identificador recibido: si alguien teclea la
    // contraseña en ese campo, quedaría en claro en la bitácora.
    await registrarAuditoria({ actor: { tipo: "anonimo" }, accion: "root.acceso_fallido" });
    return NextResponse.json({ error: "Credencial no válida." }, { status: 401 });
  }

  intentos.delete(ip);
  return null;
}
