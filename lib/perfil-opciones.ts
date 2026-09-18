/**
 * Opciones de especialidad que ofrecen /bienvenida y la configuración de
 * cuenta. Sin dependencias de servidor: las usan Client Components.
 * Centralizadas para que ambas pantallas no se desalineen. Estado/municipio
 * salen de lib/mexico-geo.ts, no de aquí.
 */
export const ESPECIALIDADES = ["Ingeniería de software", "Biología", "Trabajo social"];

/** Valor centinela del <select>: al elegirlo se muestra un campo de texto para escribir una especialidad libre. */
export const OTRA_ESPECIALIDAD = "__otra__";

/** Incluye el valor ya guardado aunque no esté en la lista fija, para no forzar un cambio al abrir el formulario. */
export function opcionesCon(valor: string | null | undefined, base: string[]): string[] {
  return valor && !base.includes(valor) ? [valor, ...base] : base;
}
