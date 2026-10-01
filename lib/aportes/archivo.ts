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
