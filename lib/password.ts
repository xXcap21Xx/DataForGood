// Hash y verificación de contraseñas con bcrypt. Reconoce hashes de un formato viejo y avisa
// (wasLegacyHash) para que el login los migre.

import { createHash } from "crypto";
import bcrypt from "bcryptjs";

const SHA256_HEX_LENGTH = 64;

// Intentos fallidos de contraseña antes de bloquear la cuenta, y por cuánto tiempo. Los usan
// el login y el cambio de contraseña en /cuenta, que comparten el mismo contador.
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_DURATION_MS = 1000 * 60 * 15; // 15 minutos

function isLegacySha256Hash(hash: string): boolean {
  return hash.length === SHA256_HEX_LENGTH && /^[0-9a-f]+$/i.test(hash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (isLegacySha256Hash(hash)) {
    return createHash("sha256").update(password).digest("hex") === hash;
  }
  return bcrypt.compare(password, hash);
}

export function wasLegacyHash(hash: string): boolean {
  return isLegacySha256Hash(hash);
}
