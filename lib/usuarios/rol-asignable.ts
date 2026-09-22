/**
 * Sin dependencias de servidor (nada de `pool`/`pg`): este módulo lo importan
 * tanto Server Components como Client Components (p. ej. botones-de-rol.tsx),
 * y un import de `pg` en un componente cliente rompe el build.
 */

/**
 * Roles asignables. Crear campañas no requiere rol: cualquier usuario común
 * puede hacerlo, por eso no aparece aquí.
 */
export type RolAsignable = "SUPERVISOR" | "REVISOR_DE_APORTES";

export const NOMBRE_DE_ROL: Record<RolAsignable, string> = {
  SUPERVISOR: "Supervisor",
  REVISOR_DE_APORTES: "Revisor de aportes",
};

export const QUIEN_ASIGNA: Record<RolAsignable, string> = {
  SUPERVISOR: "Solo lo asigna el SuperUsuario",
  REVISOR_DE_APORTES:
    "Lo asigna el creador de una campaña al invitar; el SuperUsuario solo puede revocarlo",
};

/** El código real que se guarda en la columna JSONB `usuarios.role`. */
export const CODIGO_DE_ROL: Record<RolAsignable, string> = {
  SUPERVISOR: "supervisor",
  REVISOR_DE_APORTES: "revisor",
};

/** Ya no son mutuamente excluyentes: alguien puede ser Supervisor y Revisor de aportes a la vez. */
export function nombreDeRolPrincipal(roles: string[]): string {
  if (roles.includes("admin")) return "SuperUsuario";

  const nombres = [
    roles.includes("supervisor") && "Supervisor",
    roles.includes("revisor") && "Revisor de aportes",
  ].filter((n): n is string => Boolean(n));

  return nombres.length > 0 ? nombres.join(" y ") : "Usuario común";
}

/** Todos los roles delegados vigentes (puede haber cero, uno o los dos). */
export function rolesVigentesDesde(roles: string[]): RolAsignable[] {
  const vigentes: RolAsignable[] = [];
  if (roles.includes("supervisor")) vigentes.push("SUPERVISOR");
  if (roles.includes("revisor")) vigentes.push("REVISOR_DE_APORTES");
  return vigentes;
}
