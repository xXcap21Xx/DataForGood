import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ensureCoreSchema } from "@/lib/db-schema";
import { getSessionUser } from "@/lib/session";

function normalizeDataTypes(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const allowed = new Set(["texto", "foto", "video", "audio", "documento"]);
  return input
    .map((item) => String(item ?? "").trim().toLowerCase())
    .filter((item) => allowed.has(item));
}

const ALLOWED_STATUS = new Set([
  "borrador",
  "en_revision",
  "activa",
  "pausada",
  "finalizada",
  "rechazada",
]);

function normalizeCampaignStatus(input: unknown): string | null {
  const value = String(input ?? "").trim().toLowerCase();
  return ALLOWED_STATUS.has(value) ? value : null;
}

function normalizeCollectionMode(input: unknown): string {
  const value = String(input ?? "checklist").trim().toLowerCase();
  return value === "texto_libre" ? "texto_libre" : "checklist";
}

function normalizeChecklistOpciones(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .map((item) => String(item ?? "").trim())
        .filter((item) => item.length > 0 && item.length <= 120)
    )
  ).slice(0, 20);
}

function mapCampaign(row: Record<string, unknown>) {
  const dataTypes = Array.isArray(row.data_types) ? row.data_types : [];
  const checklistOpciones = Array.isArray(row.checklist_opciones) ? row.checklist_opciones : [];
  const aportes = Array.isArray(row.aportes) ? row.aportes : [];

  return {
    id: String(row.id ?? ""),
    creatorId: String(row.creator_id ?? ""),
    creatorName: String(row.creator_name ?? ""),
    name: String(row.name ?? ""),
    description: String(row.description ?? ""),
    tematica: String(row.tematica ?? row.tag ?? ""),
    tag: String(row.tag ?? String(row.tematica ?? "")),
    status: String(row.status ?? "borrador"),
    dataTypes,
    collectionMode: String(row.collection_mode ?? "checklist"),
    checklistOpciones,
    goalContributions: Number(row.goal_contributions ?? 0),
    quotaPerUser: Number(row.quota_per_user ?? 0),
    currentContributions: Number(row.current_contributions ?? 0),
    approvedContributions: Number(row.approved_contributions ?? 0),
    pendingContributions: Number(row.pending_contributions ?? 0),
    rejectedContributions: Number(row.rejected_contributions ?? 0),
    participants: Number(row.participants ?? 0),
    startDate: row.start_date ? new Date(String(row.start_date)).toISOString().slice(0, 10) : null,
    endDate: row.end_date ? new Date(String(row.end_date)).toISOString().slice(0, 10) : null,
    locationCity: String(row.location_city ?? ""),
    locationState: String(row.location_state ?? ""),
    organizer: String(row.organizer ?? ""),
    xpPerContribution: Number(row.xp_per_contribution ?? 0),
    isSpecial: Boolean(row.is_special),
    daysRemaining: row.days_remaining ?? null,
    hasReviewerAssigned: Boolean(row.has_reviewer_assigned),
    shareToken: String(row.share_token ?? ""),
    shareTokenExpiresAt: row.share_token_expires_at ? new Date(String(row.share_token_expires_at)).toISOString() : undefined,
    contributions: aportes,
  };
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureCoreSchema();

    const { id } = await context.params;
    const user = await getSessionUser();

    const result = await pool.query(`SELECT * FROM campanas WHERE id = $1 LIMIT 1`, [id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
    }

    const campaign = mapCampaign(result.rows[0]);
    return NextResponse.json({ data: campaign, viewer: { isCreator: user ? campaign.creatorId === String(user.id) : false } });
  } catch (error) {
    console.error("Error obteniendo campaña", error);
    return NextResponse.json({ error: "No se pudo obtener la campaña" }, { status: 500 });
  }
}

// Actualización parcial (Insomnia: PATCH { "status": "activa" }, o cualquier subconjunto de campos editables)
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureCoreSchema();

    const { id } = await context.params;
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Debes iniciar sesion" }, { status: 401 });

    const existing = await pool.query(`SELECT creator_id FROM campanas WHERE id = $1 LIMIT 1`, [id]);
    if (existing.rowCount === 0) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
    }
    if (Number(existing.rows[0].creator_id) !== Number(user.id)) {
      return NextResponse.json({ error: "Solo quien creó la campaña puede editarla" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));

    if ("status" in body && normalizeCampaignStatus(body.status) === null) {
      return NextResponse.json({ error: `status debe ser uno de: ${Array.from(ALLOWED_STATUS).join(", ")}` }, { status: 400 });
    }

    const name = "name" in body ? String(body.name ?? "").trim() : null;
    const description = "description" in body ? String(body.description ?? "").trim() : null;
    const tematica = "tematica" in body || "tag" in body ? String(body.tematica ?? body.tag ?? "").trim() : null;
    const status = "status" in body ? normalizeCampaignStatus(body.status) : null;
    const dataTypes = "dataTypes" in body || "data_types" in body ? normalizeDataTypes(body.dataTypes ?? body.data_types) : null;
    const collectionMode = "collectionMode" in body || "collection_mode" in body ? normalizeCollectionMode(body.collectionMode ?? body.collection_mode) : null;
    const checklistOpciones = "checklistOpciones" in body || "checklist_opciones" in body ? normalizeChecklistOpciones(body.checklistOpciones ?? body.checklist_opciones) : null;
    const goalContributions = "goalContributions" in body || "goal_contributions" in body ? Number(body.goalContributions ?? body.goal_contributions) : null;
    const quotaPerUser = "quotaPerUser" in body || "quota_per_user" in body ? Number(body.quotaPerUser ?? body.quota_per_user) : null;
    const startDate = "startDate" in body || "start_date" in body ? (body.startDate ?? body.start_date ?? null) : undefined;
    const endDate = "endDate" in body || "end_date" in body ? (body.endDate ?? body.end_date ?? null) : undefined;
    const locationCity = "locationCity" in body || "location_city" in body ? String(body.locationCity ?? body.location_city ?? "").trim() : null;
    const locationState = "locationState" in body || "location_state" in body ? String(body.locationState ?? body.location_state ?? "").trim() : null;
    const organizer = "organizer" in body ? String(body.organizer ?? "").trim() : null;
    const xpPerContribution = "xpPerContribution" in body || "xp_per_contribution" in body ? Number(body.xpPerContribution ?? body.xp_per_contribution) : null;
    const hasReviewerAssigned = "hasReviewerAssigned" in body || "has_reviewer_assigned" in body ? Boolean(body.hasReviewerAssigned ?? body.has_reviewer_assigned) : null;

    const result = await pool.query(
      `UPDATE campanas SET
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        tematica = COALESCE($4, tematica),
        tag = COALESCE($4, tag),
        status = COALESCE($5, status),
        data_types = COALESCE($6::jsonb, data_types),
        goal_contributions = COALESCE($7, goal_contributions),
        quota_per_user = COALESCE($8, quota_per_user),
        start_date = COALESCE($9, start_date),
        end_date = COALESCE($10, end_date),
        location_city = COALESCE($11, location_city),
        location_state = COALESCE($12, location_state),
        organizer = COALESCE($13, organizer),
        xp_per_contribution = COALESCE($14, xp_per_contribution),
        has_reviewer_assigned = COALESCE($15, has_reviewer_assigned),
        collection_mode = COALESCE($16, collection_mode),
        checklist_opciones = COALESCE($17::jsonb, checklist_opciones),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [
        id,
        name || null,
        description || null,
        tematica || null,
        status,
        dataTypes ? JSON.stringify(dataTypes) : null,
        goalContributions,
        quotaPerUser,
        startDate === undefined ? null : startDate,
        endDate === undefined ? null : endDate,
        locationCity,
        locationState,
        organizer,
        xpPerContribution,
        hasReviewerAssigned,
        collectionMode,
        checklistOpciones ? JSON.stringify(checklistOpciones) : null,
      ]
    );

    return NextResponse.json({ message: "Campaña actualizada", data: mapCampaign(result.rows[0]) });
  } catch (error) {
    console.error("Error actualizando campaña", error);
    return NextResponse.json({ error: "No se pudo actualizar la campaña" }, { status: 500 });
  }
}

// Reemplazo completo de los campos editables (Insomnia: PUT con el mismo shape que POST /api/campanas)
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureCoreSchema();

    const { id } = await context.params;
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Debes iniciar sesion" }, { status: 401 });

    const existing = await pool.query(`SELECT creator_id FROM campanas WHERE id = $1 LIMIT 1`, [id]);
    if (existing.rowCount === 0) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
    }
    if (Number(existing.rows[0].creator_id) !== Number(user.id)) {
      return NextResponse.json({ error: "Solo quien creó la campaña puede editarla" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));

    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim();
    const tematica = String(body.tematica ?? body.theme ?? body.tag ?? "").trim();
    if (!name || !description || !tematica) {
      return NextResponse.json({ error: "name, description y tematica son obligatorios" }, { status: 400 });
    }

    const status = normalizeCampaignStatus(body.status ?? "borrador");
    if (status === null) {
      return NextResponse.json({ error: `status debe ser uno de: ${Array.from(ALLOWED_STATUS).join(", ")}` }, { status: 400 });
    }

    const dataTypes = normalizeDataTypes(body.dataTypes ?? body.data_types ?? []);
    const collectionMode = normalizeCollectionMode(body.collectionMode ?? body.collection_mode);
    const checklistOpciones =
      collectionMode === "checklist"
        ? normalizeChecklistOpciones(body.checklistOpciones ?? body.checklist_opciones ?? [])
        : [];
    const goalContributions = Number(body.goalContributions ?? body.goal_contributions ?? 0);
    const quotaPerUser = Number(body.quotaPerUser ?? body.quota_per_user ?? 1);
    const startDate = body.startDate ?? body.start_date ?? null;
    const endDate = body.endDate ?? body.end_date ?? null;
    const locationCity = String(body.locationCity ?? body.location_city ?? "").trim();
    const locationState = String(body.locationState ?? body.location_state ?? "").trim();
    const organizer = String(body.organizer ?? "").trim();
    const xpPerContribution = Number(body.xpPerContribution ?? body.xp_per_contribution ?? 0);
    const hasReviewerAssigned = Boolean(body.hasReviewerAssigned ?? body.has_reviewer_assigned ?? false);

    const result = await pool.query(
      `UPDATE campanas SET
        name = $2,
        description = $3,
        tematica = $4,
        tag = $4,
        status = $5,
        data_types = $6::jsonb,
        goal_contributions = $7,
        quota_per_user = $8,
        start_date = $9,
        end_date = $10,
        location_city = $11,
        location_state = $12,
        organizer = $13,
        xp_per_contribution = $14,
        has_reviewer_assigned = $15,
        collection_mode = $16,
        checklist_opciones = $17::jsonb,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [
        id,
        name,
        description,
        tematica,
        status,
        JSON.stringify(dataTypes),
        goalContributions,
        quotaPerUser,
        startDate,
        endDate,
        locationCity,
        locationState,
        organizer,
        xpPerContribution,
        hasReviewerAssigned,
        collectionMode,
        JSON.stringify(checklistOpciones),
      ]
    );

    return NextResponse.json({ message: "Campaña actualizada", data: mapCampaign(result.rows[0]) });
  } catch (error) {
    console.error("Error reemplazando campaña", error);
    return NextResponse.json({ error: "No se pudo actualizar la campaña" }, { status: 500 });
  }
}
