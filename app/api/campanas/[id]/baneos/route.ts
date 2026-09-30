import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser, type SessionUser } from "@/lib/session";
import { registrarAuditoria } from "@/lib/auditoria";
import { listarBaneadosDeCampana, quitarBaneoDeCampana } from "@/lib/campanas/baneos";

/** Solo quien creó la campaña administra sus baneos. Devuelve la respuesta de error, o null si puede. */
async function exigirCreador(campaignId: string, user: SessionUser | null): Promise<NextResponse | null> {
  if (!user) return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
  const result = await pool.query(`SELECT creator_id FROM campanas WHERE id = $1 LIMIT 1`, [campaignId]);
  if (!result.rowCount) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
  if (Number(result.rows[0].creator_id) !== Number(user.id)) {
    return NextResponse.json({ error: "Solo el dueño de la campaña puede ver o quitar baneos" }, { status: 403 });
  }
  return null;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: campaignId } = await context.params;
    const denegado = await exigirCreador(campaignId, await getSessionUser());
    if (denegado) return denegado;

    return NextResponse.json({ data: await listarBaneadosDeCampana(campaignId) });
  } catch (error) {
    console.error("Error listando baneados de campaña", error);
    return NextResponse.json({ error: "No se pudieron cargar los baneos" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: campaignId } = await context.params;
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });

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

    await registrarAuditoria({
      actor: { tipo: "usuario", id: Number(user.id) },
      accion: "campana.banear",
      objetivo: { tipo: "usuario", id: Number(row.user_id) },
      detalle: { campanaId: Number(campaignId), aporteId: Number(contributionId), motivo: reason },
    });

    return NextResponse.json({ message: "Usuario baneado de la campaña" });
  } catch (error) {
    console.error("Error baneando usuario de campaña", error);
    return NextResponse.json({ error: "No se pudo banear al usuario de la campaña" }, { status: 500 });
  }
}
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: campaignId } = await context.params;
    const user = await getSessionUser();
    const denegado = await exigirCreador(campaignId, user);
    if (denegado) return denegado;

    const body = await request.json().catch(() => ({}));
    const usuarioId = Number(body.usuarioId);
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      return NextResponse.json({ error: "usuarioId es obligatorio" }, { status: 400 });
    }

    if (!(await quitarBaneoDeCampana(campaignId, usuarioId))) {
      return NextResponse.json({ error: "Esa persona no está baneada de esta campaña" }, { status: 404 });
    }

    await registrarAuditoria({
      actor: { tipo: "usuario", id: Number(user!.id) },
      accion: "campana.desbanear",
      objetivo: { tipo: "usuario", id: usuarioId },
      detalle: { campanaId: Number(campaignId) },
    });

    return NextResponse.json({ message: "Baneo quitado" });
  } catch (error) {
    console.error("Error quitando baneo de campaña", error);
    return NextResponse.json({ error: "No se pudo quitar el baneo" }, { status: 500 });
  }
}
