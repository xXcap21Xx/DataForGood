import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ensureCoreSchema } from "@/lib/db-schema";
import { getSessionUser } from "@/lib/session";
import { readUploadedFile } from "@/lib/minio";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureCoreSchema();

    const { id } = await context.params;
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Debes iniciar sesion" }, { status: 401 });

    const result = await pool.query(
      `SELECT a.user_id, a.file_path, a.file_mime_type, a.campaign_id, a.status, a.first_pass_by_user_id, c.creator_id AS campaign_creator_id
       FROM aportes a
       JOIN campanas c ON c.id = a.campaign_id
       WHERE a.id = $1
       LIMIT 1`,
      [id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Aporte no encontrado" }, { status: 404 });
    }

    const row = result.rows[0];
    const roles = Array.isArray(user.role) ? user.role.map(String) : [];
    if (roles.includes("supervisor")) {
      return NextResponse.json({ error: "Los supervisores no pueden ver ni descargar el archivo del aporte" }, { status: 403 });
    }
    const isOwner = Number(row.user_id) === Number(user.id);
    const isCampaignCreator = Number(row.campaign_creator_id) === Number(user.id);
    const reviewer = await pool.query(
      `SELECT 1 FROM campana_revisores WHERE campana_id = $1 AND usuario_id = $2 AND estado = 'aceptado' LIMIT 1`,
      [row.campaign_id, user.id]
    );
    const isAssignedReviewer = reviewer.rowCount !== 0;
    const canViewAsReviewer = isAssignedReviewer && (
      String(row.status) === "pendiente" || Number(row.first_pass_by_user_id) === Number(user.id)
    );
    if (!isOwner && !isCampaignCreator && !canViewAsReviewer) {
      return NextResponse.json({ error: "No tienes permiso para ver este archivo" }, { status: 403 });
    }

    const objectKey = String(row.file_path ?? "");
    const buffer = await readUploadedFile(objectKey);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": String(row.file_mime_type ?? "application/octet-stream"),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error sirviendo archivo de aporte", error);
    return NextResponse.json({ error: "No se pudo obtener el archivo" }, { status: 500 });
  }
}
