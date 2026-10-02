// Identificadores de una persona SIN cuenta, siempre como hash. Los usan el aporte
// anónimo (lib/campanas/aportes-anonimos.ts), /c/[token] y las sanciones a dispositivos
// (lib/aportes/sanciones-anonimas.ts).
//
//   - Dispositivo: cookie `anonimo_id` con 32 bytes aleatorios. En la BD solo va su sha256.
//   - Red: HMAC-SHA256 de la IP con el secreto ANONIMO_IP_SECRETO. Sin el secreto no se
//     puede recorrer el espacio de IPs para saber cuál era. Nunca se guarda la IP en claro.

import { createHash, createHmac } from "node:crypto";

/** Cookie con el identificador del dispositivo (32 bytes aleatorios en hex). */
export const COOKIE_ANONIMO = "anonimo_id";
const FORMATO_DE_DISPOSITIVO = /^[a-f0-9]{64}$/;

/** El identificador de la cookie si es válido; si no, null (hay que crear uno). */
export function dispositivoValido(valor: string | undefined | null): string | null {
  return valor && FORMATO_DE_DISPOSITIVO.test(valor) ? valor : null;
}

/** Lo que se guarda en aportes.anonimo_id y dispositivos_bloqueados.anonimo_id. */
export function hashDeDispositivo(valor: string): string {
  return createHash("sha256").update(valor).digest("hex");
}

/**
 * HMAC de la IP para aportes.ip_hmac y el bloqueo global por red. Sin ANONIMO_IP_SECRETO
 * falla con un error claro, como las credenciales de MinIO: sin él no hay aporte anónimo.
 */
export function hmacDeIp(ip: string): string {
  const secreto = process.env.ANONIMO_IP_SECRETO;
  if (!secreto) throw new Error("Falta ANONIMO_IP_SECRETO en el entorno.");
  return createHmac("sha256", secreto).update(ip).digest("hex");
}
