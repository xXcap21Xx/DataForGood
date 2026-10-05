// Reglas de una contraseña nueva (registro y cambio de contraseña en /cuenta).
// Sin imports de servidor: lo usan las pantallas para mostrar la lista y los route
// handlers para validar.

export interface ReglaDeContrasena {
  label: string;
  test: (v: string) => boolean;
}

export const REGLAS_DE_CONTRASENA: ReglaDeContrasena[] = [
  { label: "Mínimo 8 caracteres", test: (v) => v.length >= 8 },
  { label: "Una mayúscula", test: (v) => /[A-Z]/.test(v) },
  { label: "Un número", test: (v) => /[0-9]/.test(v) },
  { label: "Un carácter especial", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

// bcrypt solo toma en cuenta los primeros 72 bytes; más que esto se rechaza.
export const LARGO_MAXIMO_DE_CONTRASENA = 72;

export function cumpleReglasDeContrasena(contrasena: string): boolean {
  return (
    new TextEncoder().encode(contrasena).length <= LARGO_MAXIMO_DE_CONTRASENA &&
    REGLAS_DE_CONTRASENA.every((regla) => regla.test(contrasena))
  );
}
