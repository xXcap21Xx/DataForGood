import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ensureCoreSchema } from "@/lib/db-schema";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  try {
    await ensureCoreSchema();
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Debes iniciar sesion" }, { status: 401 });

    const result = await pool.query(
      `SELECT c.id, c.name, c.description, c.status, c.tag, c.tematica,
              c.goal_contributions, c.pending_contributions, c.participants,
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
        pendingContributions: Number(row.pending_contributions ?? 0),
        participants: Number(row.participants ?? 0),
      })),
    });
  } catch (error) {
    console.error("Error listando campañas del revisor", error);
    return NextResponse.json({ error: "No se pudieron cargar tus campañas de revisión" }, { status: 500 });
  }
}
