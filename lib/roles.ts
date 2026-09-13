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

  const finalRoles = Array.from(new Set(["usuario", ...roles]));

  if (finalRoles.includes("supervisor") && finalRoles.includes("revisor")) {
    throw new Error("Un usuario no puede tener a la vez los roles supervisor y revisor");
  }

  return finalRoles;
}
