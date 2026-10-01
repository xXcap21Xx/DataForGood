// Códigos de rol válidos en usuarios.role (JSONB): usuario, supervisor, revisor, admin.
// Los nombres para mostrar están en lib/usuarios/rol-asignable.ts.

export const VALID_ROLES = new Set(["usuario", "supervisor", "revisor", "admin"]);

export function normalizeRoles(input: unknown): string[] {
  const incoming = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(",")
      : [];

  const roles = incoming
    .map((role) => String(role ?? "").trim().toLowerCase())
    .filter((role) => role.length > 0 && VALID_ROLES.has(role));

  return Array.from(new Set(["usuario", ...roles]));
}
