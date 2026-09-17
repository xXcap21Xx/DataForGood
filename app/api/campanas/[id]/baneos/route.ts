import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ensureCoreSchema } from "@/lib/db-schema";
import { getSessionUser } from "@/lib/session";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureCoreSchema();
    const { id: campaignId } = await context.params;
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Debes iniciar sesion" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const contributionId = String(body.contributionId ?? "").trim();
    const reason = String(body.reason ?? "").trim();
    if (!contributionId || !reason) {
      return NextResponse.json({ error: "contributionId y reason son obligatorios" }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT c.creator_id, a.user_id
       FROM campanas c
       JOIN aportes a ON a.campaign_id = c.id
       WHERE c.id = $1 AND a.id = $2
       LIMIT 1`,
      [campaignId, contributionId]
    );
    if (!result.rowCount) return NextResponse.json({ error: "Aporte no encontrado en esta campaña" }, { status: 404 });

    const row = result.rows[0];
    if (Number(row.creator_id) !== Number(user.id)) {
      return NextResponse.json({ error: "Solo el dueño de la campaña puede banear participantes" }, { status: 403 });
    }
    if (row.user_id == null) {
      return NextResponse.json({ error: "No se puede banear a un aporte anónimo" }, { status: 400 });
    }

    await pool.query(
      `INSERT INTO campana_baneados (campana_id, usuario_id, motivo, baneado_por)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (campana_id, usuario_id) DO UPDATE SET motivo = EXCLUDED.motivo, baneado_por = EXCLUDED.baneado_por`,
      [campaignId, row.user_id, reason, user.id]
    );

    return NextResponse.json({ message: "Usuario baneado de la campaña" });
  } catch (error) {
    console.error("Error baneando usuario de campaña", error);
    return NextResponse.json({ error: "No se pudo banear al usuario de la campaña" }, { status: 500 });
  }
}