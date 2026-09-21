import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ensureCoreSchema } from "@/lib/db-schema";
import { getSessionUser } from "@/lib/session";
import { activateScheduledCampaigns, calculateCampaignDaysRemaining, finalizeExpiredCampaigns, hasCampaignStarted, normalizeCampaignDate, normalizeCampaignTime } from "@/lib/campaign-date";

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
  "aceptada",
  "activa",
  "pausada",
  "finalizada",
  "rechazada",
]);

const MAX_ACTIVE_CAMPAIGNS = 5;

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
    supervisorId: row.supervisor_id != null ? String(row.supervisor_id) : null,
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
    startTime: normalizeCampaignTime(row.start_time),
    endDate: normalizeCampaignDate(row.end_date),
    endTime: normalizeCampaignTime(row.end_time),
    locationCity: String(row.location_city ?? ""),
    locationState: String(row.location_state ?? ""),
    locationColonia: String(row.location_colonia ?? ""),
    organizer: String(row.organizer ?? ""),
    xpPerContribution: Number(row.xp_per_contribution ?? 0),
    isSpecial: Boolean(row.is_special),
    daysRemaining: calculateCampaignDaysRemaining(row.end_date ?? row.endDate),
    hasReviewerAssigned: Boolean(row.has_reviewer_assigned),
    shareToken: String(row.share_token ?? ""),
    shareTokenExpiresAt: row.share_token_expires_at ? new Date(row.share_token_expires_at as string).toISOString() : undefined,
    contributions: aportes,
  };
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureCoreSchema();

    const { id } = await context.params;
    const user = await getSessionUser();

    await activateScheduledCampaigns();
    await finalizeExpiredCampaigns();

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

    const body = await request.json().catch(() => ({}));
    const accion = String(body.action ?? body.accion ?? "").trim().toLowerCase();
    const allowedDecision = new Set(["aceptada", "rechazada", "reportada"]);

    if (allowedDecision.has(accion)) {
      const roles = Array.isArray(user.role) ? user.role : typeof user.role === "string" ? [user.role] : [];
      if (!roles.includes("supervisor")) {
        return NextResponse.json({ error: "Solo un supervisor puede decidir esta campaña" }, { status: 403 });
      }

      const existing = await pool.query(`SELECT id, status, creator_id, name, start_date, start_time FROM campanas WHERE id = $1 LIMIT 1`, [id]);
      if (existing.rowCount === 0) {
        return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
      }

      // Aceptada con fecha/hora de inicio futura: el estado de la campaña
      // queda "aceptada" (en_revision -> aceptada -> activa) y se activa sola
      // cuando lleguen (activateScheduledCampaigns); sin fecha definida se
      // activa de inmediato igual que antes.
      const nextStatus =
        accion === "aceptada"
          ? hasCampaignStarted(existing.rows[0].start_date, existing.rows[0].start_time) ? "activa" : "aceptada"
          : accion === "rechazada" ? "rechazada" : existing.rows[0].status;
      const motivo = String(body.motivo ?? body.reason ?? "").trim() || null;
      if (accion === "rechazada" && !motivo) {
        return NextResponse.json({ error: "El motivo es obligatorio al rechazar una campaña" }, { status: 400 });
      }

      await pool.query(
        `UPDATE campanas
         SET status = $2,
             supervisor_id = $3,
             updated_at = NOW()
         WHERE id = $1`,
        [id, nextStatus, user.id]
      );

      await pool.query(
        `INSERT INTO campana_supervisores (campana_id, supervisor_id, accion, motivo, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [id, user.id, accion, motivo]
      );

      if (accion === "rechazada") {
        await pool.query(
          `INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, campana_id, metadata)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
          [
            existing.rows[0].creator_id,
            "campana_rechazada",
            "Campaña rechazada",
            `Tu campaña "${existing.rows[0].name}" fue rechazada. Motivo: ${motivo}`,
            id,
            JSON.stringify({ motivo }),
          ]
        );
      }

      const updated = await pool.query(`SELECT * FROM campanas WHERE id = $1 LIMIT 1`, [id]);
      return NextResponse.json({
        message: accion === "aceptada"
          ? nextStatus === "activa"
            ? "Campaña aceptada y puesta en activo"
            : "Campaña aceptada; se activará el día de su fecha de inicio"
          : accion === "rechazada"
            ? "Campaña rechazada"
            : "Campaña reportada",
        data: mapCampaign(updated.rows[0]),
      });
    }

    const existing = await pool.query(`SELECT creator_id, status FROM campanas WHERE id = $1 LIMIT 1`, [id]);
    if (existing.rowCount === 0) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
    }
    if (Number(existing.rows[0].creator_id) !== Number(user.id)) {
      return NextResponse.json({ error: "Solo quien creó la campaña puede editarla" }, { status: 403 });
    }

    const currentStatus = String(existing.rows[0].status ?? "borrador");

    // Reglas de edición por estado: una finalizada es de solo lectura salvo
    // para reactivarla (solo status: "activa", sin tocar más campos, y con
    // cupo libre de campañas activas); activa, pausada y aceptada solo dejan
    // tocar meta y fecha de fin (sin cambiar su estado); borrador, en_revision
    // y rechazada se editan por completo.
    if (currentStatus === "finalizada") {
      const soloReactiva = Object.keys(body).length === 1 && normalizeCampaignStatus(body.status) === "activa";
      if (!soloReactiva) {
        return NextResponse.json({ error: "Una campaña finalizada es de solo lectura y no se puede editar" }, { status: 403 });
      }

      const activas = await pool.query(
        `SELECT COUNT(*)::int AS count FROM campanas WHERE creator_id = $1 AND status = 'activa'`,
        [user.id]
      );
      if (Number(activas.rows[0].count) >= MAX_ACTIVE_CAMPAIGNS) {
        return NextResponse.json(
          { error: `Ya tienes ${MAX_ACTIVE_CAMPAIGNS} campañas activas; pausa o finaliza otra antes de reactivar esta` },
          { status: 400 }
        );
      }
      // Cae al UPDATE genérico de abajo, que solo aplicará status = "activa".
    }

    if (currentStatus === "activa" || currentStatus === "pausada") {
      // El creador puede finalizarla desde aquí (botón "Finalizar campaña"),
      // sin tocar ningún otro campo a la vez.
      const soloFinaliza = Object.keys(body).length === 1 && normalizeCampaignStatus(body.status) === "finalizada";
      if (!soloFinaliza) {
        const camposPermitidos = new Set(["goalContributions", "goal_contributions", "endDate", "end_date", "endTime", "end_time"]);
        const camposNoPermitidos = Object.keys(body).filter((key) => !camposPermitidos.has(key));
        if (camposNoPermitidos.length > 0) {
          return NextResponse.json(
            { error: "Con la campaña activa o pausada solo puedes editar la meta de aportes y la fecha/hora de finalización" },
            { status: 400 }
          );
        }
      }
    }

    if (currentStatus === "aceptada") {
      // Ya la aprobó el supervisor pero todavía no empieza: igual que activa
      // o pausada, solo se ajusta la meta de aportes y la fecha/hora de fin.
      // No tiene el atajo de "finalizar" porque aún no arrancó a recolectar.
      const camposPermitidos = new Set(["goalContributions", "goal_contributions", "endDate", "end_date", "endTime", "end_time"]);
      const camposNoPermitidos = Object.keys(body).filter((key) => !camposPermitidos.has(key));
      if (camposNoPermitidos.length > 0) {
        return NextResponse.json(
          { error: "Con la campaña aceptada solo puedes editar la meta de aportes y la fecha/hora de finalización" },
          { status: 400 }
        );
      }
    }

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
    const startDate = "startDate" in body || "start_date" in body ? normalizeCampaignDate(body.startDate ?? body.start_date) : undefined;
    const startTime = "startTime" in body || "start_time" in body ? normalizeCampaignTime(body.startTime ?? body.start_time) : undefined;
    const endDate = "endDate" in body || "end_date" in body ? normalizeCampaignDate(body.endDate ?? body.end_date) : undefined;
    const endTime = "endTime" in body || "end_time" in body ? normalizeCampaignTime(body.endTime ?? body.end_time) : undefined;
    const locationCity = "locationCity" in body || "location_city" in body ? String(body.locationCity ?? body.location_city ?? "").trim() : null;
    const locationState = "locationState" in body || "location_state" in body ? String(body.locationState ?? body.location_state ?? "").trim() : null;
    const locationColonia = "locationColonia" in body || "location_colonia" in body ? String(body.locationColonia ?? body.location_colonia ?? "").trim() : null;
    const organizer = "organizer" in body ? String(body.organizer ?? "").trim() : null;
    const xpPerContribution = "xpPerContribution" in body || "xp_per_contribution" in body ? Number(body.xpPerContribution ?? body.xp_per_contribution) : null;
    const hasReviewerAssigned = "hasReviewerAssigned" in body || "has_reviewer_assigned" in body ? Boolean(body.hasReviewerAssigned ?? body.has_reviewer_assigned) : null;

    // Igual que en POST/PUT: un borrador puede quedar incompleto, pero si
    // esta edición manda (o deja) la campaña en cualquier otro estado, cada
    // campo importante que sí llegó en el body debe ser válido. No revisamos
    // los campos que no llegaron: ya deberían ser válidos desde que se creó.
    const effectiveStatus = status ?? currentStatus;
    if (effectiveStatus !== "borrador") {
      if (dataTypes !== null && dataTypes.length === 0) {
        return NextResponse.json({ error: "Selecciona al menos un tipo de dato" }, { status: 400 });
      }
      if (goalContributions !== null && (!goalContributions || goalContributions <= 0)) {
        return NextResponse.json({ error: "La meta de aportes debe ser mayor a 0" }, { status: 400 });
      }
      if (quotaPerUser !== null && (!quotaPerUser || quotaPerUser <= 0)) {
        return NextResponse.json({ error: "La cuota por persona debe ser mayor a 0" }, { status: 400 });
      }
      if (startDate !== undefined && !startDate) {
        return NextResponse.json({ error: "La fecha de inicio es obligatoria" }, { status: 400 });
      }
      if (endDate !== undefined && !endDate) {
        return NextResponse.json({ error: "La fecha de finalización es obligatoria" }, { status: 400 });
      }
      if (startDate && endDate && endDate < startDate) {
        return NextResponse.json({ error: "La fecha de finalización no puede ser anterior a la de inicio" }, { status: 400 });
      }
      if (locationState !== null && !locationState) {
        return NextResponse.json({ error: "Selecciona un estado" }, { status: 400 });
      }
      if (locationCity !== null && !locationCity) {
        return NextResponse.json({ error: "Selecciona un municipio" }, { status: 400 });
      }
    }

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
        location_colonia = COALESCE($13, location_colonia),
        organizer = COALESCE($14, organizer),
        xp_per_contribution = COALESCE($15, xp_per_contribution),
        has_reviewer_assigned = COALESCE($16, has_reviewer_assigned),
        collection_mode = COALESCE($17, collection_mode),
        checklist_opciones = COALESCE($18::jsonb, checklist_opciones),
        start_time = COALESCE($19, start_time),
        end_time = COALESCE($20, end_time),
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
        locationColonia,
        organizer,
        xpPerContribution,
        hasReviewerAssigned,
        collectionMode,
        checklistOpciones ? JSON.stringify(checklistOpciones) : null,
        startTime === undefined ? null : startTime,
        endTime === undefined ? null : endTime,
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
    const startDate = normalizeCampaignDate(body.startDate ?? body.start_date);
    const startTime = normalizeCampaignTime(body.startTime ?? body.start_time);
    const endDate = normalizeCampaignDate(body.endDate ?? body.end_date);
    const endTime = normalizeCampaignTime(body.endTime ?? body.end_time);
    const locationCity = String(body.locationCity ?? body.location_city ?? "").trim();
    const locationState = String(body.locationState ?? body.location_state ?? "").trim();
    const locationColonia = String(body.locationColonia ?? body.location_colonia ?? "").trim();
    const organizer = String(body.organizer ?? "").trim();
    const xpPerContribution = Number(body.xpPerContribution ?? body.xp_per_contribution ?? 0);
    const hasReviewerAssigned = Boolean(body.hasReviewerAssigned ?? body.has_reviewer_assigned ?? false);

    // Un borrador puede quedar incompleto a propósito; para cualquier otro
    // estado sí se exigen los campos importantes, igual que en POST /api/campanas.
    if (status !== "borrador") {
      if (dataTypes.length === 0) {
        return NextResponse.json({ error: "Selecciona al menos un tipo de dato" }, { status: 400 });
      }
      if (!goalContributions || goalContributions <= 0) {
        return NextResponse.json({ error: "La meta de aportes debe ser mayor a 0" }, { status: 400 });
      }
      if (!quotaPerUser || quotaPerUser <= 0) {
        return NextResponse.json({ error: "La cuota por persona debe ser mayor a 0" }, { status: 400 });
      }
      if (collectionMode === "checklist" && checklistOpciones.length === 0) {
        return NextResponse.json({ error: "Agrega al menos una opción al checklist" }, { status: 400 });
      }
      if (!startDate) {
        return NextResponse.json({ error: "La fecha de inicio es obligatoria" }, { status: 400 });
      }
      if (!endDate) {
        return NextResponse.json({ error: "La fecha de finalización es obligatoria" }, { status: 400 });
      }
      if (endDate < startDate) {
        return NextResponse.json({ error: "La fecha de finalización no puede ser anterior a la de inicio" }, { status: 400 });
      }
      if (!locationState) {
        return NextResponse.json({ error: "Selecciona un estado" }, { status: 400 });
      }
      if (!locationCity) {
        return NextResponse.json({ error: "Selecciona un municipio" }, { status: 400 });
      }
    }

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
        location_colonia = $13,
        organizer = $14,
        xp_per_contribution = $15,
        has_reviewer_assigned = $16,
        collection_mode = $17,
        checklist_opciones = $18::jsonb,
        start_time = $19,
        end_time = $20,
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
        locationColonia,
        organizer,
        xpPerContribution,
        hasReviewerAssigned,
        collectionMode,
        JSON.stringify(checklistOpciones),
        startTime,
        endTime,
      ]
    );

    return NextResponse.json({ message: "Campaña actualizada", data: mapCampaign(result.rows[0]) });
  } catch (error) {
    console.error("Error reemplazando campaña", error);
    return NextResponse.json({ error: "No se pudo actualizar la campaña" }, { status: 500 });
  }
}
