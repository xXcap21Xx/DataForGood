// Validación real y limpieza de la foto de un aporte, antes de guardarla en MinIO.
// La usan los dos caminos para aportar: POST /api/aportes y POST /api/c/[token]/aportes.
//
// 1. Firma del archivo: los primeros bytes deben ser de JPEG o PNG. El tipo que manda el
//    navegador (file.type) solo sirve para avisar rápido (lib/aportes/archivo.ts); aquí
//    manda el contenido.
// 2. Se vuelve a codificar con sharp. Eso quita TODOS los metadatos (EXIF con GPS,
//    modelo del teléfono, fecha, miniaturas) y descarta archivos que solo parecen
//    imagen. La orientación del EXIF se aplica antes de quitarlo, para que la foto no
//    quede girada.

import sharp from "sharp";

export type ImagenLimpia = { contenido: Buffer; extension: ".jpg" | ".png"; mimeType: "image/jpeg" | "image/png" };

const FIRMA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const FIRMA_JPEG = Buffer.from([0xff, 0xd8, 0xff]);

function formatoPorFirma(contenido: Buffer): "jpeg" | "png" | null {
  if (contenido.subarray(0, FIRMA_PNG.length).equals(FIRMA_PNG)) return "png";
  if (contenido.subarray(0, FIRMA_JPEG.length).equals(FIRMA_JPEG)) return "jpeg";
  return null;
}

/** La imagen sin metadatos, o un mensaje de error para la persona. */
export async function limpiarImagen(archivo: File): Promise<{ ok: true; imagen: ImagenLimpia } | { ok: false; error: string }> {
  const original = Buffer.from(await archivo.arrayBuffer());
  const formato = formatoPorFirma(original);
  if (!formato) return { ok: false, error: "El archivo no es una imagen JPG o PNG válida." };

  try {
    // failOn "error": un archivo truncado o con basura se rechaza en vez de guardarse a medias.
    // El límite de píxeles por defecto de sharp frena las "bombas" de descompresión.
    const base = sharp(original, { failOn: "error" }).rotate();
    // sharp no copia metadatos a la salida salvo que se pida con withMetadata(): no se pide.
    const contenido = formato === "png" ? await base.png().toBuffer() : await base.jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    return formato === "png"
      ? { ok: true, imagen: { contenido, extension: ".png", mimeType: "image/png" } }
      : { ok: true, imagen: { contenido, extension: ".jpg", mimeType: "image/jpeg" } };
  } catch {
    return { ok: false, error: "No se pudo leer la imagen. Prueba con otra foto." };
  }
}
