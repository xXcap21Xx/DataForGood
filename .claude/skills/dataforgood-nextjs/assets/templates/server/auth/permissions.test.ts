import { describe, expect, it } from 'vitest';
import { permissionsFor } from './permissions';

const ok = { verified: true };

describe('reglas de roles (rama Prueba1)', () => {
  it('el rol Supervisor lo asignan el SuperUsuario o cualquier Supervisor', () => {
    expect(permissionsFor(['supervisor'], ok).has('roles.asignar_supervisor')).toBe(true);
    expect(permissionsFor(['superusuario'], ok).has('roles.asignar_supervisor')).toBe(true);
    expect(permissionsFor(['administrador_campana'], ok).has('roles.asignar_supervisor')).toBe(false);
    expect(permissionsFor([], ok).has('roles.asignar_supervisor')).toBe(false);
  });

  it('solo el SuperUsuario asigna administrador de campaña', () => {
    expect(permissionsFor(['superusuario'], ok).has('roles.asignar_administrador_campana')).toBe(true);
    expect(permissionsFor(['supervisor'], ok).has('roles.asignar_administrador_campana')).toBe(false);
  });

  it('una cuenta sin verificar no puede participar ni crear campañas', () => {
    const p = permissionsFor(['supervisor'], { verified: false });
    expect(p.has('aportes.crear')).toBe(false);
    expect(p.has('campanas.crear')).toBe(false);
    expect(p.size).toBe(0);
  });

  it('toda cuenta verificada conserva lo de Usuario común y la jerarquía hereda', () => {
    expect(permissionsFor([], ok).has('aportes.crear')).toBe(true);
    expect(permissionsFor(['superusuario'], ok).has('campanas.dictaminar')).toBe(true);
    expect(permissionsFor(['supervisor'], ok).has('sistema.panel')).toBe(false);
  });
});
