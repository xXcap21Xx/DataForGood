import { createHash } from "crypto";
import bcrypt from "bcryptjs";

const SHA256_HEX_LENGTH = 64;

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
