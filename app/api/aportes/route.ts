import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ensureCoreSchema } from "@/lib/db-schema";
import { getSessionUser } from "@/lib/session";
import { saveUploadedFile } from "@/lib/minio";

const ALLOWED_FILE_TYPES = new Set(["image/jpeg", "image/png"]);
const MAX_FILE_SIZE = 10_000_000;

function normalizeCaracteristicas(values: string[], allowed: string[]): string[] {
  const allowedSet = new Set(allowed);
  return Array.from(new Set(values.filter((value) => allowedSet.has(value))));
}

function mapAporte(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? ""),
    campaignId: String(row.campaign_id ?? ""),
    userId: row.user_id != null ? String(row.user_id) : null,
    participantName: String(row.participant_name ?? "Anónimo"),
    participantEmail: row.participant_email ? String(row.participant_email) : undefined,
    description: String(row.description ?? ""),
    fileType: String(row.file_type ?? "foto"),
    fileSizeBytes: row.file_size_bytes != null ? Number(row.file_size_bytes) : undefined,
    caracteristicas: Array.isArray(row.caracteristicas) ? row.caracteristicas : [],
    status: String(row.status ?? "pendiente"),
    submittedAt: row.submitted_at ? new Date(String(row.submitted_at)).toISOString() : new Date().toISOString(),
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : undefined,
    firstPassBy: row.first_pass_by ? String(row.first_pass_by) : undefined,
  };
}

export async function GET(request: Request) {
  try {
    await ensureCoreSchema();

    const url = new URL(request.url);
    const campaignId = url.searchParams.get("campaignId");
    const mine = url.searchParams.get("mine") === "true";
    const reviewer = url.searchParams.get("reviewer") === "true";

    if (!campaignId) {
      return NextResponse.json({ error: "campaignId es obligatorio" }, { status: 400 });
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Debes iniciar sesion" }, { status: 401 });
    }

    if (!mine) {
      const campaignResult = await pool.query(
        `SELECT c.creator_id,
                EXISTS (
                  SELECT 1 FROM campana_revisores cr
                  WHERE cr.campana_id = c.id AND cr.usuario_id = $2 AND cr.estado = 'aceptado'
                ) AS is_reviewer
         FROM campanas c WHERE c.id = $1 LIMIT 1`,
        [campaignId, user.id]
      );
      if (campaignResult.rowCount === 0) {
        return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
      }
      const isCreator = Number(campaignResult.rows[0].creator_id) === Number(user.id);
      const isReviewer = Boolean(campaignResult.rows[0].is_reviewer);
      if (!isCreator && !(reviewer && isReviewer)) {
        return NextResponse.json({ error: "Solo quien creó la campaña o su revisor puede ver estos aportes" }, { status: 403 });
      }
    }

    const result = mine
      ? await pool.query(
          `SELECT * FROM aportes WHERE campaign_id = $1 AND user_id = $2 ORDER BY submitted_at DESC`,
          [campaignId, user.id]
        )
      : await pool.query(
          `SELECT * FROM aportes WHERE campaign_id = $1 ORDER BY submitted_at DESC`,
          [campaignId]
        );

    return NextResponse.json({ data: result.rows.map(mapAporte) });
  } catch (error) {
    console.error("Error listando aportes", error);
    return NextResponse.json({ error: "No se pudieron listar los aportes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureCoreSchema();

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Debes iniciar sesion" }, { status: 401 });
    }

    const formData = await request.formData();
    const campaignId = String(formData.get("campaignId") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const rawCaracteristicas = formData.getAll("caracteristicas").map(String);
    const file = formData.get("file");

    if (!campaignId || !description) {
      return NextResponse.json({ error: "campaignId y description son obligatorios" }, { status: 400 });
    }

    if (description.length > 1000) {
      return NextResponse.json({ error: "La descripción no puede superar 1000 caracteres" }, { status: 400 });
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "El archivo es obligatorio" }, { status: 400 });
    }

    if (!ALLOWED_FILE_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Formato no válido. Usa .jpg, .jpeg o .png." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "El archivo pesa más de 10 MB." }, { status: 400 });
    }

    const campaignResult = await pool.query(`SELECT * FROM campanas WHERE id = $1 LIMIT 1`, [campaignId]);
    if (campaignResult.rowCount === 0) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
    }
    const campaign = campaignResult.rows[0];

    if (Number(campaign.creator_id) === Number(user.id)) {
      return NextResponse.json({ error: "No puedes aportar en una campaña que creaste" }, { status: 403 });
    }

    if (String(campaign.status) !== "activa") {
      return NextResponse.json({ error: "Esta campaña no está activa" }, { status: 400 });
    }

    const campaignChecklistOpciones = Array.isArray(campaign.checklist_opciones) ? campaign.checklist_opciones : [];
    const caracteristicas =
      String(campaign.collection_mode ?? "checklist") === "checklist"
        ? normalizeCaracteristicas(rawCaracteristicas, campaignChecklistOpciones)
        : [];

    const existingCountResult = await pool.query(
      `SELECT COUNT(*)::int AS count FROM aportes WHERE campaign_id = $1 AND user_id = $2`,
      [campaignId, user.id]
    );
    const existingCount = existingCountResult.rows[0].count as number;
    if (existingCount >= Number(campaign.quota_per_user)) {
      return NextResponse.json({ error: "Ya alcanzaste tu cuota en esta campaña" }, { status: 400 });
    }

    const saved = await saveUploadedFile(file, `campanas/${campaignId}`);

    const result = await pool.query(
      `INSERT INTO aportes (
        campaign_id, user_id, participant_name, participant_email, description,
        file_type, file_path, file_original_name, file_mime_type, file_size_bytes, caracteristicas
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
      RETURNING *`,
      [
        campaignId,
        user.id,
        `${user.nombre} ${user.apellidos}`.trim(),
        user.email,
        description,
        "foto",
        saved.relativePath,
        saved.originalName,
        saved.mimeType,
        saved.sizeBytes,
        JSON.stringify(caracteristicas),
      ]
    );

    const isFirstContribution = existingCount === 0;
    await pool.query(
      `UPDATE campanas SET
        current_contributions = current_contributions + 1,
        pending_contributions = pending_contributions + 1,
        participants = participants + $2,
        updated_at = NOW()
      WHERE id = $1`,
      [campaignId, isFirstContribution ? 1 : 0]
    );

    return NextResponse.json({ message: "Aporte enviado", data: mapAporte(result.rows[0]) }, { status: 201 });
  } catch (error) {
    console.error("Error creando aporte", error);
    return NextResponse.json({ error: "No se pudo enviar el aporte" }, { status: 500 });
  }
}
