// Constantes de la baja voluntaria de cuenta (SCR-WEB-31). Sin imports de servidor:
// las usan la pantalla /cuenta/eliminar, DELETE /api/usuarios/[id] y lib/usuarios/baja.ts.

/** Días entre pedir la baja y el borrado definitivo. Iniciar sesión antes los cancela. */
export const DIAS_DE_GRACIA = 30;

/** Palabra que hay que escribir para confirmar. */
export const PALABRA_DE_CONFIRMACION = "ELIMINAR";

export type DestinoDeAportes = "eliminar" | "anonimizar" | "autoria";

export const DESTINOS_DE_APORTES: { valor: DestinoDeAportes; titulo: string; descripcion: string }[] = [
  {
    valor: "eliminar",
    titulo: "Eliminarlos junto con mi cuenta",
    descripcion: "Se borran de forma permanente del servidor y dejan de contar en las métricas de cada campaña.",
  },
  {
    valor: "anonimizar",
    titulo: "Conservarlos de forma anónima",
    descripcion: "Se eliminan tu nombre y tu correo. Los datos siguen sosteniendo las métricas de las campañas.",
  },
  {
    valor: "autoria",
    titulo: "Conservarlos con mi autoría",
    descripcion: "Tu nombre seguirá visible junto a cada aporte en el historial de la campaña. Tu correo sí se borra.",
  },
];

export function esDestinoDeAportes(valor: unknown): valor is DestinoDeAportes {
  return DESTINOS_DE_APORTES.some((d) => d.valor === valor);
}

/** "13 de septiembre de 2026", en la hora de Tepic (como el resto de la app). */
export function formatearFechaDeBaja(fecha: Date): string {
  return fecha.toLocaleDateString("es-MX", { dateStyle: "long", timeZone: "America/Mazatlan" });
}
