// Reglas de servidor compartidas por los dos caminos para enviar un aporte: con cuenta
// (POST /api/aportes) y sin cuenta desde un enlace público (POST /api/c/[token]/aportes,
// lib/campanas/aportes-anonimos.ts). Una regla, un lugar. Lo que también usa el
// navegador (tipos y tamaño de archivo) está en ./archivo.ts.

import type { PoolClient } from "pg";
import { pool } from "@/lib/db";
import { borrarArchivo, guardarArchivo, type SavedUpload } from "@/lib/minio";
import { limpiarImagen } from "@/lib/aportes/imagen";

export { LARGO_MAXIMO_DESCRIPCION, TAMANO_MAXIMO, TIPOS_DE_ARCHIVO, errorDeArchivo } from "@/lib/aportes/archivo";

/**
 * Comprueba que el archivo sea de verdad una foto JPG o PNG, le quita los metadatos
 * (EXIF con GPS, etc.) y la guarda en MinIO. Devuelve un error para la persona si no sirve.
 */
export async function guardarFotoDelAporte(
  archivo: File,
  campaignId: string | number
): Promise<{ ok: true; guardado: SavedUpload } | { ok: false; error: string }> {
  const limpia = await limpiarImagen(archivo);
  if (!limpia.ok) return limpia;
  const guardado = await guardarArchivo(limpia.imagen.contenido, {
    subdir: `campanas/${campaignId}`,
    extension: limpia.imagen.extension,
    mimeType: limpia.imagen.mimeType,
  });
  return { ok: true, guardado };
}

/**
 * Inserta un aporte respetando la cuota por persona SIN carrera: dos envíos simultáneos
 * de la misma persona (cuenta o dispositivo) se forman en fila con un candado de
 * Postgres por campaña y persona, y el segundo vuelve a contar ya con el primero dentro.
 * Dentro de la misma transacción suma el aporte a los contadores de la campaña.
 *
 * `comprobar` (opcional) corre dentro del mismo candado, antes de contar: si devuelve un
 * motivo, no se inserta (lo usa la espera entre aportes anónimos).
 *
 * Si no se inserta, borra de MinIO el archivo que se acababa de subir.
 */
export async function insertarAporteConCuota<T>(entrada: {
  campaignId: string | number;
  /** Identifica a la persona dentro de la campaña: `usuario:<id>` o `dispositivo:<hash>`. */
  persona: string;
  cuota: number;
  /** Cuántos aportes tiene ya esta persona en la campaña. */
  contar: (client: PoolClient) => Promise<number>;
  insertar: (client: PoolClient) => Promise<T>;
  comprobar?: (client: PoolClient) => Promise<{ error: string; esperaSegundos: number } | null>;
  /** Clave en MinIO del archivo ya subido, para borrarlo si no se inserta. */
  archivoSubido: string;
}): Promise<
  | { ok: true; fila: T; yaEnviados: number }
  | { ok: false; motivo: "cuota" }
  | { ok: false; motivo: "espera"; error: string; esperaSegundos: number }
> {
  const client = await pool.connect();
  let insertado = false;
  try {
    await client.query("BEGIN");
    await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [
      `aporte:${entrada.campaignId}:${entrada.persona}`,
    ]);
    const rechazo = entrada.comprobar ? await entrada.comprobar(client) : null;
    if (rechazo) {
      await client.query("ROLLBACK");
      return { ok: false, motivo: "espera", ...rechazo };
    }
    const yaEnviados = await entrada.contar(client);
    if (yaEnviados >= entrada.cuota) {
      await client.query("ROLLBACK");
      return { ok: false, motivo: "cuota" };
    }
    const fila = await entrada.insertar(client);
    await sumarAporteALaCampana(entrada.campaignId, yaEnviados === 0, client);
    await client.query("COMMIT");
    insertado = true;
    return { ok: true, fila, yaEnviados };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
    if (!insertado) {
      await borrarArchivo(entrada.archivoSubido).catch((error) => {
        console.error("No se pudo borrar el archivo de un aporte que no se guardó", error);
      });
    }
  }
}

/**
 * Suma un aporte nuevo a los contadores desnormalizados de la campaña.
 * `esPrimeroDeLaPersona`: era su primer aporte en la campaña (cuenta o dispositivo),
 * así que suma un participante.
 */
export async function sumarAporteALaCampana(
  campaignId: string | number,
  esPrimeroDeLaPersona: boolean,
  client: Pick<PoolClient, "query"> = pool
): Promise<void> {
  await client.query(
    `UPDATE campanas SET
      current_contributions = current_contributions + 1,
      pending_contributions = pending_contributions + 1,
      participants = participants + $2,
      updated_at = NOW()
    WHERE id = $1`,
    [campaignId, esPrimeroDeLaPersona ? 1 : 0]
  );
}
