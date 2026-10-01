// /api/campanas/[id]/enlace — enlace público de participación (/c/[token]) de una campaña.
// Lo usa el cuadro "Compartir" de /campanas/[id] (compartir.tsx). El enlace se genera solo
// cuando la campaña queda activa; aquí cualquiera con sesión lo consulta y el creador lo regenera.
// Lógica en lib/campanas/enlaces.ts.

import { NextResponse } from "next/server";
import { registrarAuditoria } from "@/lib/auditoria";
import {
  estaVigente,
  obtenerCampanaDelCreador,
  obtenerCampanaParaCompartir,
  obtenerEnlaceActual,
  regenerarEnlace,
  urlPublica,
} from "@/lib/campanas/enlaces";
import { getSessionUser } from "@/lib/session";

// GET: el enlace actual (vigente o caducado) para compartirlo, o null si la campaña nunca tuvo.
// Cualquier usuario con sesión: el enlace es para difundir la campaña. Las estadísticas
// (visitas y aportes que entraron por él) solo se devuelven al creador.
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });

    const campana = await obtenerCampanaParaCompartir(id);
    if (!campana) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });

    const esCreador = campana.creadorId === Number(user.id);
    const enlace = await obtenerEnlaceActual(campana.id);

    return NextResponse.json({
      data: enlace
        ? {
            url: urlPublica(enlace.token),
            token: enlace.token,
            creadoEn: enlace.creadoEn.toISOString(),
            expiraEn: enlace.expiraEn.toISOString(),
            vigente: estaVigente(enlace),
            ...(esCreador ? { visitas: enlace.visitas, aportesRecibidos: enlace.aportesRecibidos } : {}),
          }
        : null,
      campana: { nombre: campana.nombre, status: campana.status },
      viewer: { esCreador },
    });
  } catch (error) {
    console.error("Error consultando el enlace de la campaña", error);
    return NextResponse.json({ error: "No se pudo cargar el enlace" }, { status: 500 });
  }
}

// POST: el creador genera el enlace o, si ya había uno, lo regenera. El anterior queda
// revocado para siempre (conserva sus visitas y aportes). Solo con la campaña activa.
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });

    const campana = await obtenerCampanaDelCreador(id, user.id);
    if (!campana) {
      return NextResponse.json({ error: "Solo quien creó la campaña puede regenerar su enlace" }, { status: 403 });
    }
    if (campana.status !== "activa") {
      return NextResponse.json({ error: "Solo se puede compartir una campaña activa" }, { status: 409 });
    }

    const enlace = await regenerarEnlace(campana.id, user.id);

    await registrarAuditoria({
      actor: { tipo: "usuario", id: Number(user.id) },
      accion: "campana.enlace_regenerar",
      objetivo: { tipo: "campana", id: campana.id },
      detalle: { enlaceId: enlace.id, expiraEn: enlace.expiraEn.toISOString() },
    });

    return NextResponse.json(
      { data: { token: enlace.token, creadoEn: enlace.creadoEn.toISOString(), expiraEn: enlace.expiraEn.toISOString() } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error regenerando el enlace de la campaña", error);
    return NextResponse.json({ error: "No se pudo generar el enlace" }, { status: 500 });
  }
}
