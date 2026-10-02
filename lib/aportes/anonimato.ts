// Identificador del dispositivo de una persona SIN cuenta, siempre como hash. Lo usan el
// aporte anónimo (lib/campanas/aportes-anonimos.ts), /c/[token] y las sanciones a
// dispositivos (lib/aportes/sanciones-anonimas.ts).
//
//   - Dispositivo: cookie `anonimo_id` con 32 bytes aleatorios. En la BD solo va su sha256.
//   - La IP no se guarda en la BD de ninguna forma: los límites por IP viven en memoria.

import { createHash } from "node:crypto";

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
