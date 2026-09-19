import { ZipArchive } from "archiver";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ensureCoreSchema } from "@/lib/db-schema";
import { extensionForMime } from "@/lib/open-data";
import { readUploadedFile } from "@/lib/minio";

/**
 * Descarga pública del conjunto de datos abierto de una campaña finalizada:
 * un ZIP con los archivos de sus aportes aceptados, sin nombre ni correo de
 * quien participó (dominio.md § 9). El contador de descargas sube en cada
 * ZIP generado, no cuando el navegador termina de bajarlo.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureCoreSchema();
    const { id } = await context.params;

    const campana = await pool.query(
      `SELECT id, name FROM campanas WHERE id = $1 AND status = 'finalizada' LIMIT 1`,
      [id]
    );
    if (campana.rowCount === 0) {
      return NextResponse.json({ error: "Conjunto no encontrado" }, { status: 404 });
    }

    const aportes = await pool.query(
      `SELECT id, file_path, file_mime_type
       FROM aportes
       WHERE campaign_id = $1 AND status = 'aceptado' AND file_path IS NOT NULL AND file_path <> ''
       ORDER BY id`,
      [id]
    );
    if (aportes.rowCount === 0) {
      return NextResponse.json(
        { error: "Este conjunto todavía no tiene archivos aprobados para descargar" },
        { status: 404 }
      );
    }

    const archive = new ZipArchive({ zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<void>((resolve, reject) => {
      archive.on("end", () => resolve());
      archive.on("error", reject);
    });

    let contador = 0;
    for (const row of aportes.rows) {
      contador += 1;
      try {
        const buffer = await readUploadedFile(String(row.file_path));
        const ext = extensionForMime(String(row.file_mime_type ?? ""));
        archive.append(buffer, { name: `aporte-${String(contador).padStart(3, "0")}${ext}` });
      } catch (fileError) {
        // Un archivo que ya no está en MinIO no debe tumbar la descarga completa.
        console.error(`No se pudo leer el archivo del aporte ${row.id} para el ZIP`, fileError);
      }
    }
    await archive.finalize();
    await finished;

    await pool.query(`UPDATE campanas SET downloads_count = downloads_count + 1 WHERE id = $1`, [id]);

    const zipBuffer = Buffer.concat(chunks);
    const nombreArchivo = `${campana.rows[0].name}`.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${nombreArchivo || "conjunto"}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error generando la descarga del conjunto", error);
    return NextResponse.json({ error: "No se pudo generar la descarga" }, { status: 500 });
  }
}
