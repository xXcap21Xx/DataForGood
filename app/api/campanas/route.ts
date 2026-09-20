import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ensureCoreSchema } from "@/lib/db-schema";
import { getSessionUser } from "@/lib/session";
import { calculateCampaignDaysRemaining, normalizeCampaignDate } from "@/lib/campaign-date";

async function obtenerIdsGuardados(usuarioId: number): Promise<Set<number>> {
  const result = await pool.query<{ campana_id: number }>(
    `SELECT campana_id FROM campanas_guardadas WHERE usuario_id = $1`,
    [usuarioId],
  );
  return new Set(result.rows.map((row) => row.campana_id));
}

function normalizeDataTypes(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const allowed = new Set(["texto", "foto", "video", "audio", "documento"]);
  return input
    .map((item) => String(item ?? "").trim().toLowerCase())
    .filter((item) => allowed.has(item));
}

function normalizeCampaignStatus(input: unknown): string {
  const value = String(input ?? "borrador").trim().toLowerCase();
  const allowed = new Set([
    "borrador",
    "en_revision",
    "activa",
    "pausada",
    "finalizada",
    "rechazada",
  ]);

  return allowed.has(value) ? value : "borrador";
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
  const dataTypes = Array.isArray(row.data_types)
    ? row.data_types
    : Array.isArray(row.data_types ?? [])
      ? row.data_types
      : [];

  const checklistOpciones = Array.isArray(row.checklist_opciones) ? row.checklist_opciones : [];

  const aportes = Array.isArray(row.aportes)
    ? row.aportes
    : Array.isArray(row.aportes ?? [])
      ? row.aportes
      : [];

  return {
    id: String(row.id ?? ""),
    creatorId: String(row.creator_id ?? ""),
    creatorName: String(row.creator_name ?? ""),
    supervisorId: row.supervisor_id != null ? String(row.supervisor_id) : null,
    latestSupervisionAction: row.latest_supervision_action ? String(row.latest_supervision_action) : null,
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
    startDate: normalizeCampaignDate(row.start_date),
    endDate: normalizeCampaignDate(row.end_date),
    locationCity: String(row.location_city ?? ""),
    locationState: String(row.location_state ?? ""),
    locationColonia: String(row.location_colonia ?? ""),
    organizer: String(row.organizer ?? ""),
    xpPerContribution: Number(row.xp_per_contribution ?? 0),
    isSpecial: Boolean(row.is_special),
    daysRemaining: calculateCampaignDaysRemaining(row.end_date ?? row.endDate),
    hasReviewerAssigned: Boolean(row.has_reviewer_assigned),
    shareToken: String(row.share_token ?? ""),
    shareTokenExpiresAt: row.share_token_expires_at ? new Date(String(row.share_token_expires_at)).toISOString() : undefined,
    contributions: aportes,
  };
}

export async function GET(request: Request) {
  try {
    await ensureCoreSchema();

    const url = new URL(request.url);
    const campaignId = url.searchParams.get("id");
    const mine = url.searchParams.get("mine") === "true";
    const available = url.searchParams.get("available") === "true";
    const supervised = url.searchParams.get("supervised") === "true";
    // Campañas donde ya se aportó o que se guardaron: el conjunto que muestra "Mis aportes".
    const misAportes = url.searchParams.get("misAportes") === "true";
    // Siempre se intenta leer la sesión (aunque el modo no la exija) para poder marcar isSaved.
    const user = await getSessionUser();

    if ((mine || available || misAportes || supervised) && !user) {
      return NextResponse.json({ error: "Debes iniciar sesion" }, { status: 401 });
    }

    const savedIds = user ? await obtenerIdsGuardados(user.id) : new Set<number>();
    const conIsSaved = (row: Record<string, unknown>) => ({
      ...mapCampaign(row),
      isSaved: savedIds.has(Number(row.id)),
    });

    if (supervised) {
      const result = await pool.query(
        `SELECT c.*,
                latest_review.accion AS latest_supervision_action
         FROM campanas c
         LEFT JOIN LATERAL (
           SELECT cs.accion
           FROM campana_supervisores cs
           WHERE cs.campana_id = c.id
             AND cs.supervisor_id = $1
           ORDER BY cs.created_at DESC, cs.id DESC
           LIMIT 1
         ) latest_review ON true
         WHERE c.supervisor_id = $1
         ORDER BY c.created_at DESC`,
        [user!.id]
      );
      return NextResponse.json({ data: result.rows.map(conIsSaved) });
    }

    if (campaignId) {
      const result = await pool.query(`SELECT * FROM campanas WHERE id = $1 LIMIT 1`, [campaignId]);
      if (result.rowCount === 0) return NextResponse.json({ error: "Campana no encontrada" }, { status: 404 });
      const campaign = conIsSaved(result.rows[0]);
      return NextResponse.json({ data: campaign, viewer: { isCreator: user ? campaign.creatorId === String(user.id) : false } });
    }

    const result = mine
      ? await pool.query(`SELECT * FROM campanas WHERE creator_id = $1 ORDER BY created_at DESC`, [user!.id])
      : available
        ? await pool.query(`SELECT * FROM campanas WHERE creator_id <> $1 AND status = 'activa' ORDER BY created_at DESC`, [user!.id])
        : misAportes
          ? await pool.query(
              `SELECT * FROM campanas
               WHERE creator_id <> $1
                 AND (
                   EXISTS (SELECT 1 FROM aportes a WHERE a.campaign_id = campanas.id AND a.user_id = $1)
                   OR EXISTS (SELECT 1 FROM campanas_guardadas g WHERE g.campana_id = campanas.id AND g.usuario_id = $1)
                 )
               ORDER BY created_at DESC`,
              [user!.id],
            )
          : await pool.query(`SELECT * FROM campanas ORDER BY created_at DESC`);

    return NextResponse.json({ data: result.rows.map(conIsSaved) });
  } catch (error) {
    console.error("Error listando campanas", error);
    return NextResponse.json({ error: "No se pudieron listar las campanas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureCoreSchema();

    const body = await request.json();
    const sessionUser = await getSessionUser();

    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim();
    const tematica = String(body.tematica ?? body.theme ?? body.tag ?? "").trim();
    const tag = String(body.tag ?? tematica ?? "").trim();

    if (!name || !description || !tematica) {
      return NextResponse.json(
        { error: "name, description y tematica son obligatorios" },
        { status: 400 }
      );
    }

    const creatorId = Number(sessionUser?.id ?? body.creatorId ?? body.creator_id ?? 0);
    if (!creatorId || Number.isNaN(creatorId)) {
      return NextResponse.json(
        { error: "El usuario creador es obligatorio" },
        { status: 400 }
      );
    }

    const creator = sessionUser ? `${sessionUser.nombre} ${sessionUser.apellidos}`.trim() : String(body.creatorName ?? body.creator_name ?? "").trim();
    if (!creator) {
      return NextResponse.json(
        { error: "El nombre del usuario creador es obligatorio" },
        { status: 400 }
      );
    }

    const dataTypes = normalizeDataTypes(body.dataTypes ?? body.data_types ?? []);
    const status = normalizeCampaignStatus(body.status ?? "activa");
    const collectionMode = normalizeCollectionMode(body.collectionMode ?? body.collection_mode);
    const checklistOpciones =
      collectionMode === "checklist"
        ? normalizeChecklistOpciones(body.checklistOpciones ?? body.checklist_opciones ?? [])
        : [];

    const goalContributions = Number(body.goalContributions ?? body.goal_contributions ?? 0);
    const quotaPerUser = Number(body.quotaPerUser ?? body.quota_per_user ?? 1);
    const currentContributions = Number(body.currentContributions ?? body.current_contributions ?? 0);
    const approvedContributions = Number(body.approvedContributions ?? body.approved_contributions ?? 0);
    const pendingContributions = Number(body.pendingContributions ?? body.pending_contributions ?? 0);
    const rejectedContributions = Number(body.rejectedContributions ?? body.rejected_contributions ?? 0);
    const participants = Number(body.participants ?? 0);
    const xpPerContribution = Number(body.xpPerContribution ?? body.xp_per_contribution ?? 0);
    const daysRemaining = Number(body.daysRemaining ?? body.days_remaining ?? 0);
    const isSpecial = Boolean(body.isSpecial ?? body.is_special ?? false);
    const hasReviewerAssigned = Boolean(body.hasReviewerAssigned ?? body.has_reviewer_assigned ?? false);

    const startDate = body.startDate ?? body.start_date ?? null;
    const endDate = body.endDate ?? body.end_date ?? null;
    const locationCity = String(body.locationCity ?? body.location_city ?? "").trim();
    const locationState = String(body.locationState ?? body.location_state ?? "").trim();
    const locationColonia = String(body.locationColonia ?? body.location_colonia ?? "").trim();
    const organizer = String(body.organizer ?? "").trim();
    const shareToken = String(body.shareToken ?? body.share_token ?? "").trim();
    const shareTokenExpiresAt = body.shareTokenExpiresAt ?? body.share_token_expires_at ?? null;

    const aportes = Array.isArray(body.aportes) ? body.aportes : [];

    const result = await pool.query(
      `INSERT INTO campanas (
        creator_id,
        creator_name,
        name,
        description,
        tematica,
        tag,
        status,
        data_types,
        collection_mode,
        checklist_opciones,
        goal_contributions,
        quota_per_user,
        current_contributions,
        approved_contributions,
        pending_contributions,
        rejected_contributions,
        participants,
        start_date,
        end_date,
        location_city,
        location_state,
        location_colonia,
        organizer,
        xp_per_contribution,
        is_special,
        days_remaining,
        has_reviewer_assigned,
        share_token,
        share_token_expires_at,
        aportes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::jsonb, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30::jsonb
      ) RETURNING *`,
      [
        creatorId,
        creator,
        name,
        description,
        tematica,
        tag,
        status,
        JSON.stringify(dataTypes),
        collectionMode,
        JSON.stringify(checklistOpciones),
        goalContributions,
        quotaPerUser,
        currentContributions,
        approvedContributions,
        pendingContributions,
        rejectedContributions,
        participants,
        startDate,
        endDate,
        locationCity,
        locationState,
        locationColonia,
        organizer,
        xpPerContribution,
        isSpecial,
        daysRemaining,
        hasReviewerAssigned,
        shareToken,
        shareTokenExpiresAt,
        JSON.stringify(aportes),
      ]
    );

    return NextResponse.json(
      {
        message: "Campaña creada",
        data: mapCampaign(result.rows[0]),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creando campaña", error);
    return NextResponse.json(
      { error: "No se pudo crear la campaña" },
      { status: 500 }
    );
  }
}
