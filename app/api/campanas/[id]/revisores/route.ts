import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ensureCoreSchema } from "@/lib/db-schema";
import { getSessionUser } from "@/lib/session";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureCoreSchema();

    const { id } = await context.params;
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Debes iniciar sesion" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const usuarioId = Number(body.usuarioId ?? body.userId);
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      return NextResponse.json({ error: "usuarioId es obligatorio" }, { status: 400 });
    }

    const campaign = await pool.query(
      `SELECT id, name, creator_id FROM campanas WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (campaign.rowCount === 0) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
    if (Number(campaign.rows[0].creator_id) !== Number(user.id)) {
      return NextResponse.json({ error: "Solo el creador puede invitar revisores" }, { status: 403 });
    }
    if (usuarioId === Number(user.id) || usuarioId === Number(campaign.rows[0].creator_id)) {
      return NextResponse.json({ error: "No puedes invitar al creador de la campaña" }, { status: 400 });
    }

    const candidate = await pool.query(`SELECT id, nombre, apellidos, role FROM usuarios WHERE id = $1 LIMIT 1`, [usuarioId]);
    if (candidate.rowCount === 0) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const roles = Array.isArray(candidate.rows[0].role)
      ? candidate.rows[0].role.map(String)
      : [String(candidate.rows[0].role ?? "usuario")];
    if (roles.includes("supervisor")) {
      return NextResponse.json({ error: "Los supervisores no pueden ser revisores de aportes" }, { status: 400 });
    }

    const existing = await pool.query(
      `SELECT estado FROM campana_revisores WHERE campana_id = $1 AND usuario_id = $2 LIMIT 1`,
      [id, usuarioId]
    );
    if (existing.rowCount && existing.rows[0].estado === "aceptado") {
      return NextResponse.json({ error: "Este usuario ya es revisor de la campaña" }, { status: 409 });
    }

    await pool.query(
      `INSERT INTO campana_revisores (campana_id, usuario_id, estado, invitado_en, aceptado_en)
       VALUES ($1, $2, 'invitado', NOW(), NULL)
       ON CONFLICT (campana_id, usuario_id)
       DO UPDATE SET estado = 'invitado', invitado_en = NOW(), aceptado_en = NULL`,
      [id, usuarioId]
    );

    await pool.query(
      `INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, campana_id, metadata)
       VALUES ($1, 'invitacion_revisor', 'Invitación para revisar aportes', $2, $3, $4::jsonb)`,
      [
        usuarioId,
        `Te invitaron a ser revisor de aportes en la campaña "${campaign.rows[0].name}".`,
        id,
        JSON.stringify({ campanaId: String(id) }),
      ]
    );

    return NextResponse.json({ message: "Invitación enviada" }, { status: 201 });
  } catch (error) {
    console.error("Error invitando revisor", error);
    return NextResponse.json({ error: "No se pudo enviar la invitación" }, { status: 500 });
  }
}
