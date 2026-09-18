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

export function nombreDeRolPrincipal(roles: string[]): string {
  if (roles.includes("supervisor")) return "Supervisor";
  if (roles.includes("revisor")) return "Revisor de aportes";
  if (roles.includes("admin")) return "SuperUsuario";
  return "Usuario común";
}

export function rolVigenteDesde(roles: string[]): RolAsignable | null {
  if (roles.includes("supervisor")) return "SUPERVISOR";
  if (roles.includes("revisor")) return "REVISOR_DE_APORTES";
  return null;
}
