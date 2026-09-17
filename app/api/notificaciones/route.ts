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
      `SELECT n.id, n.tipo, n.titulo, n.mensaje, n.campana_id, n.metadata, n.leida_en, n.created_at,
              c.name AS campana_nombre
       FROM notificaciones n
       LEFT JOIN campanas c ON c.id = n.campana_id
       LEFT JOIN campana_revisores cr ON cr.campana_id = n.campana_id AND cr.usuario_id = n.usuario_id
       WHERE n.usuario_id = $1
         AND (n.tipo <> 'invitacion_revisor' OR cr.estado = 'invitado')
       ORDER BY n.created_at DESC
       LIMIT 30`,
      [user.id]
    );

    return NextResponse.json({
      data: result.rows.map((row) => ({
        id: String(row.id),
        type: String(row.tipo),
        title: String(row.titulo),
        message: String(row.mensaje),
        campaignId: row.campana_id != null ? String(row.campana_id) : null,
        campaignName: row.campana_nombre ? String(row.campana_nombre) : null,
        metadata: row.metadata ?? {},
        readAt: row.leida_en ? new Date(String(row.leida_en)).toISOString() : null,
        createdAt: new Date(String(row.created_at)).toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error listando notificaciones", error);
    return NextResponse.json({ error: "No se pudieron cargar las notificaciones" }, { status: 500 });
  }
}
