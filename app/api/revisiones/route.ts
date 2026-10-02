// GET /api/revisiones — campañas donde la persona es revisora aceptada, con conteos. Lo usa /revisiones.

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Debes iniciar sesion" }, { status: 401 });

    const result = await pool.query(
      `SELECT c.id, c.name, c.description, c.status, c.tag, c.tematica,
              c.goal_contributions, c.participants,
              -- Lo que le toca al revisor: solo "pendiente". Los que ya validó (espera_final)
              -- esperan al creador; c.pending_contributions los incluye y confundía.
              (SELECT COUNT(*)::int FROM aportes a WHERE a.campaign_id = c.id AND a.status = 'pendiente') AS por_revisar,
              cr.aceptado_en
       FROM campana_revisores cr
       JOIN campanas c ON c.id = cr.campana_id
       WHERE cr.usuario_id = $1 AND cr.estado = 'aceptado'
       ORDER BY cr.aceptado_en DESC`,
      [user.id]
    );

    return NextResponse.json({
      data: result.rows.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        description: String(row.description ?? ""),
        status: String(row.status),
        tag: String(row.tag ?? row.tematica ?? ""),
        goalContributions: Number(row.goal_contributions ?? 0),
        pendingContributions: Number(row.por_revisar ?? 0),
        participants: Number(row.participants ?? 0),
      })),
    });
  } catch (error) {
    console.error("Error listando campañas del revisor", error);
    return NextResponse.json({ error: "No se pudieron cargar tus campañas de revisión" }, { status: 500 });
  }
}
