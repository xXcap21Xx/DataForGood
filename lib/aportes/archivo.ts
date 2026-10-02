// Qué archivo y qué descripción acepta un aporte. Sin imports de servidor: lo usan
// tanto los route handlers (POST /api/aportes, POST /api/c/[token]/aportes) como el
// formulario anónimo de /c/[token] para avisar antes de enviar. El servidor siempre
// vuelve a validar.

/** Hoy solo fotos JPG/PNG. Video, audio y documento son un punto abierto (dominio.md § 10.6). */
export const TIPOS_DE_ARCHIVO = new Set(["image/jpeg", "image/png"]);
export const TAMANO_MAXIMO = 10_000_000;
export const LARGO_MAXIMO_DESCRIPCION = 1000;

/** Mensaje de error para la persona, o null si el archivo sirve. */
export function errorDeArchivo(file: FormDataEntryValue | null | undefined): string | null {
  if (!(file instanceof File) || file.size === 0) return "El archivo es obligatorio";
  if (!TIPOS_DE_ARCHIVO.has(file.type)) return "Formato no válido. Usa .jpg, .jpeg o .png.";
  if (file.size > TAMANO_MAXIMO) return "El archivo pesa más de 10 MB.";
  return null;
}

/** Tamaño legible: KB debajo de 1 MB (antes un archivo chico se veía como "0.0 MB"). */
export function formatearTamano(bytes?: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1000))} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

/**
 * Cómo se describe cada tipo de dato de una campaña a quien va a aportar
 * (/campanas/[id], "¿Qué puedes aportar?"). Solo las fotos se pueden subir hoy.
 */
export const TIPO_DE_DATO: Record<string, { titulo: string; detalle: string }> = {
  foto: { titulo: "Fotos", detalle: "Una foto JPG o PNG por aporte, de hasta 10 MB." },
  texto: { titulo: "Texto", detalle: "Lo que observaste, en la descripción del aporte." },
  video: { titulo: "Video", detalle: "Todavía no se puede subir desde la app." },
  audio: { titulo: "Audio", detalle: "Todavía no se puede subir desde la app." },
  documento: { titulo: "Documentos", detalle: "Todavía no se puede subir desde la app." },
};
