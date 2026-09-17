import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ensureCoreSchema } from "@/lib/db-schema";
import { getSessionUser } from "@/lib/session";
import { normalizeRoles } from "@/lib/roles";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureCoreSchema();
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Debes iniciar sesion" }, { status: 401 });

    const { id } = await context.params;
    const notification = await pool.query(
      `SELECT id, campana_id FROM notificaciones
       WHERE id = $1 AND usuario_id = $2 AND tipo = 'invitacion_revisor'
       LIMIT 1`,
      [id, user.id]
    );
    if (notification.rowCount === 0 || notification.rows[0].campana_id == null) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    const campaignId = notification.rows[0].campana_id;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const invitation = await client.query(
        `UPDATE campana_revisores
         SET estado = 'aceptado', aceptado_en = NOW()
         WHERE campana_id = $1 AND usuario_id = $2 AND estado = 'invitado'
         RETURNING id`,
        [campaignId, user.id]
      );
      if (invitation.rowCount === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "La invitación ya no está disponible" }, { status: 409 });
      }

      const roles = Array.isArray(user.role) ? user.role : [];
      const nextRoles = normalizeRoles([...roles, "revisor"]);
      await client.query(`UPDATE usuarios SET role = $2::jsonb, updated_at = NOW() WHERE id = $1`, [user.id, JSON.stringify(nextRoles)]);
      await client.query(`UPDATE campanas SET has_reviewer_assigned = true, updated_at = NOW() WHERE id = $1`, [campaignId]);
      await client.query(`UPDATE notificaciones SET leida_en = NOW() WHERE id = $1`, [id]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return NextResponse.json({ message: "Ahora eres revisor de aportes de esta campaña" });
  } catch (error) {
    console.error("Error aceptando invitación de revisor", error);
    return NextResponse.json({ error: "No se pudo aceptar la invitación" }, { status: 500 });
  }
}
