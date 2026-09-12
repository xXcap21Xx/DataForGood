// Fuente única de "quién puede hacer qué" para permisos GLOBALES.
// Lo que depende de una campaña concreta (ser su creador, ser su revisor, estar baneado en ella)
// se resuelve en server/modules/campanas/access.ts, no aquí.
//
// Reglas tomadas de la rama Prueba1 (pantalla /entrar). Hay puntos abiertos: ver references/dominio.md.
import { AppError } from '@/server/http/errors';

export const GLOBAL_ROLES = ['administrador_campana', 'supervisor', 'superusuario'] as const;
export type GlobalRole = (typeof GLOBAL_ROLES)[number];

export const PERMISSIONS = [
  // Usuario común con correo verificado
  'campanas.ver',
  'campanas.crear', // hasta 5 campañas activas a la vez (regla de negocio en el service)
  'aportes.crear',
  'perfil.editar',
  // Supervisor
  'campanas.dictaminar', // aprobar o rechazar campañas "En revisión"
  'roles.asignar_supervisor', // lo asigna el SuperUsuario o cualquier Supervisor activo
  // SuperUsuario
  'roles.asignar_administrador_campana',
  'usuarios.sancionar',
  'sistema.panel',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const BASE_VERIFICADA: Permission[] = ['campanas.ver', 'campanas.crear', 'aportes.crear', 'perfil.editar'];

const ROLE_GRANTS: Record<GlobalRole, { inherits: GlobalRole | null; grants: Permission[] }> = {
  // TODO(dominio): la rama lo menciona ("administrador de campaña, lo asigna el SuperUsuario") sin definir qué hace.
  administrador_campana: { inherits: null, grants: [] },
  supervisor: { inherits: null, grants: ['campanas.dictaminar', 'roles.asignar_supervisor'] },
  superusuario: {
    inherits: 'supervisor',
    grants: ['roles.asignar_administrador_campana', 'usuarios.sancionar', 'sistema.panel'],
  },
};

// Sin correo verificado la cuenta está inactiva: no participa ni crea campañas.
export function permissionsFor(roles: readonly GlobalRole[], { verified }: { verified: boolean }): Set<Permission> {
  const result = new Set<Permission>();
  if (!verified) return result;
  BASE_VERIFICADA.forEach((p) => result.add(p));
  for (const role of roles) {
    let current: GlobalRole | null = role;
    while (current) {
      ROLE_GRANTS[current].grants.forEach((p) => result.add(p));
      current = ROLE_GRANTS[current].inherits;
    }
  }
  return result;
}

export interface Actor {
  id: string;
  roles: GlobalRole[];
  permissions: Set<Permission>;
}

export function can(actor: Actor | null | undefined, permission: Permission): boolean {
  return !!actor && actor.permissions.has(permission);
}

export function assertCan(actor: Actor | null | undefined, permission: Permission): asserts actor is Actor {
  if (!actor) throw new AppError(401, 'NO_AUTENTICADO', 'Inicia sesión para continuar.');
  if (!actor.permissions.has(permission)) {
    throw new AppError(403, 'SIN_PERMISO', 'No tienes permiso para realizar esta acción.');
  }
}
