import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ensureCoreSchema } from "@/lib/db-schema";
import { getSessionUser } from "@/lib/session";

const ALLOWED_STATUS = new Set(["pendiente", "espera_final", "aceptado", "rechazado"]);

function normalizeCaracteristicas(values: unknown[], allowed: string[]): string[] {
  const allowedSet = new Set(allowed);
  return Array.from(new Set(values.map(String).filter((value) => allowedSet.has(value))));
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
    firstPassByUserId: row.first_pass_by_user_id != null ? String(row.first_pass_by_user_id) : undefined,
  };
}

async function loadAporteWithCampaign(id: string) {
  const result = await pool.query(
    `SELECT a.*, c.creator_id AS campaign_creator_id, c.collection_mode AS campaign_collection_mode, c.checklist_opciones AS campaign_checklist_opciones
     FROM aportes a
     JOIN campanas c ON c.id = a.campaign_id
     WHERE a.id = $1
     LIMIT 1`,
    [id]
  );
  return result.rowCount ? result.rows[0] : null;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureCoreSchema();

    const { id } = await context.params;
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Debes iniciar sesion" }, { status: 401 });

    const row = await loadAporteWithCampaign(id);
    if (!row) return NextResponse.json({ error: "Aporte no encontrado" }, { status: 404 });

    const isOwner = Number(row.user_id) === Number(user.id);
    const isCampaignCreator = Number(row.campaign_creator_id) === Number(user.id);
    const reviewerResult = await pool.query(
      `SELECT 1 FROM campana_revisores WHERE campana_id = $1 AND usuario_id = $2 AND estado = 'aceptado' LIMIT 1`,
      [row.campaign_id, user.id]
    );
    const isReviewer = (reviewerResult.rowCount ?? 0) > 0;
    if (!isOwner && !isCampaignCreator && !isReviewer) {
      return NextResponse.json({ error: "No tienes permiso para ver este aporte" }, { status: 403 });
    }

    return NextResponse.json({ data: mapAporte(row) });
  } catch (error) {
    console.error("Error obteniendo aporte", error);
    return NextResponse.json({ error: "No se pudo obtener el aporte" }, { status: 500 });
  }
}

// El revisor aceptado valida en primera instancia y el creador puede revisar el aporte.
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureCoreSchema();

    const { id } = await context.params;
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Debes iniciar sesion" }, { status: 401 });

    const row = await loadAporteWithCampaign(id);
    if (!row) return NextResponse.json({ error: "Aporte no encontrado" }, { status: 404 });

    const isCampaignCreator = Number(row.campaign_creator_id) === Number(user.id);
    const reviewerResult = await pool.query(
      `SELECT 1 FROM campana_revisores WHERE campana_id = $1 AND usuario_id = $2 AND estado = 'aceptado' LIMIT 1`,
      [row.campaign_id, user.id]
    );
    const isReviewer = (reviewerResult.rowCount ?? 0) > 0;
    if (!isCampaignCreator && !isReviewer) {
      return NextResponse.json({ error: "Solo el creador o un revisor aceptado puede revisar este aporte" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const status = String(body.status ?? "").trim().toLowerCase();
    if (!ALLOWED_STATUS.has(status)) {
      return NextResponse.json({ error: `status debe ser uno de: ${Array.from(ALLOWED_STATUS).join(", ")}` }, { status: 400 });
    }

    const rejectionReason = body.rejectionReason ?? body.rejection_reason ?? null;
    if (isReviewer && !isCampaignCreator && (status !== "aceptado" || String(row.status) !== "pendiente")) {
      return NextResponse.json({ error: "El revisor solo puede aceptar aportes pendientes" }, { status: 403 });
    }
    if (status === "rechazado" && !String(rejectionReason ?? "").trim()) {
      return NextResponse.json({ error: "rejectionReason es obligatorio al rechazar" }, { status: 400 });
    }

    const firstPassBy = isReviewer
      ? `${user.nombre} ${user.apellidos}`.trim()
      : body.firstPassBy ?? body.first_pass_by ?? row.first_pass_by ?? `${user.nombre} ${user.apellidos}`.trim();
    const previousStatus = String(row.status);

    const result = await pool.query(
      `UPDATE aportes SET
        status = $2,
        rejection_reason = $3,
        first_pass_by = $4,
        first_pass_by_user_id = $5,
        reviewed_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [
        id,
        status,
        status === "rechazado" ? String(rejectionReason).trim() : null,
        firstPassBy,
        isReviewer ? user.id : row.first_pass_by_user_id,
      ]
    );

    const wasPending = previousStatus === "pendiente" || previousStatus === "espera_final";
    if (wasPending && status === "aceptado") {
      await pool.query(
        `UPDATE campanas SET approved_contributions = approved_contributions + 1, pending_contributions = GREATEST(pending_contributions - 1, 0), updated_at = NOW() WHERE id = $1`,
        [row.campaign_id]
      );
    } else if (wasPending && status === "rechazado") {
      await pool.query(
        `UPDATE campanas SET rejected_contributions = rejected_contributions + 1, pending_contributions = GREATEST(pending_contributions - 1, 0), updated_at = NOW() WHERE id = $1`,
        [row.campaign_id]
      );
    }

    return NextResponse.json({ message: "Aporte actualizado", data: mapAporte(result.rows[0]) });
  } catch (error) {
    console.error("Error revisando aporte", error);
    return NextResponse.json({ error: "No se pudo actualizar el aporte" }, { status: 500 });
  }
}

// Uso previsto: quien envió el aporte edita descripción/caracteristicas mientras sigue pendiente (Insomnia: PUT { "description": "...", "caracteristicas": [...] })
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureCoreSchema();

    const { id } = await context.params;
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Debes iniciar sesion" }, { status: 401 });

    const row = await loadAporteWithCampaign(id);
    if (!row) return NextResponse.json({ error: "Aporte no encontrado" }, { status: 404 });

    if (Number(row.user_id) !== Number(user.id)) {
      return NextResponse.json({ error: "Solo quien envió el aporte puede editarlo" }, { status: 403 });
    }

    if (row.status !== "pendiente") {
      return NextResponse.json({ error: "Ya no puedes editar un aporte que entró a revisión" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const description = String(body.description ?? "").trim();
    if (!description) {
      return NextResponse.json({ error: "description es obligatorio" }, { status: 400 });
    }
    if (description.length > 1000) {
      return NextResponse.json({ error: "La descripción no puede superar 1000 caracteres" }, { status: 400 });
    }

    const campaignChecklistOpciones = Array.isArray(row.campaign_checklist_opciones) ? row.campaign_checklist_opciones : [];
    const caracteristicas =
      String(row.campaign_collection_mode ?? "checklist") === "checklist"
        ? normalizeCaracteristicas(Array.isArray(body.caracteristicas) ? body.caracteristicas : [], campaignChecklistOpciones)
        : [];

    const result = await pool.query(
      `UPDATE aportes SET description = $2, caracteristicas = $3::jsonb, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, description, JSON.stringify(caracteristicas)]
    );

    return NextResponse.json({ message: "Aporte actualizado", data: mapAporte(result.rows[0]) });
  } catch (error) {
    console.error("Error editando aporte", error);
    return NextResponse.json({ error: "No se pudo editar el aporte" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const client = await pool.connect();

  try {
    await ensureCoreSchema();

    const { id } = await context.params;
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Debes iniciar sesion" }, { status: 401 });

    const row = await loadAporteWithCampaign(id);
    if (!row) return NextResponse.json({ error: "Aporte no encontrado" }, { status: 404 });

    if (Number(row.user_id) !== Number(user.id)) {
      return NextResponse.json({ error: "Solo quien envió el aporte puede eliminarlo" }, { status: 403 });
    }

    const previousStatus = String(row.status);
    if (previousStatus === "aceptado") {
      return NextResponse.json({ error: "Un aporte aceptado ya no se puede eliminar" }, { status: 400 });
    }

    await client.query("BEGIN");
    await client.query(`DELETE FROM aportes WHERE id = $1 AND user_id = $2`, [id, user.id]);

    const remainingUserContributions = await client.query(
      `SELECT COUNT(*)::int AS count FROM aportes WHERE campaign_id = $1 AND user_id = $2`,
      [row.campaign_id, user.id]
    );
    const participantDelta = Number(remainingUserContributions.rows[0].count) === 0 ? 1 : 0;
    const pendingDelta = previousStatus === "pendiente" || previousStatus === "espera_final" ? 1 : 0;
    const rejectedDelta = previousStatus === "rechazado" ? 1 : 0;

    await client.query(
      `UPDATE campanas SET
        current_contributions = GREATEST(current_contributions - 1, 0),
        pending_contributions = GREATEST(pending_contributions - $2, 0),
        rejected_contributions = GREATEST(rejected_contributions - $3, 0),
        participants = GREATEST(participants - $4, 0),
        updated_at = NOW()
       WHERE id = $1`,
      [row.campaign_id, pendingDelta, rejectedDelta, participantDelta]
    );
    await client.query("COMMIT");

    return NextResponse.json({ message: "Aporte eliminado" });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("Error eliminando aporte", error);
    return NextResponse.json({ error: "No se pudo eliminar el aporte" }, { status: 500 });
  } finally {
    client.release();
  }
}
