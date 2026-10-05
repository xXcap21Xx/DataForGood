// /api/campanas/[id]/qr — código QR del enlace público de la campaña.
// Cualquier usuario con sesión (el QR es para difundir la campaña). Lo usa el cuadro
// "Compartir" de /campanas/[id]: como <img> y en los botones "Descargar PNG/SVG".

import { NextResponse } from "next/server";
import {
  estaVigente,
  generarQrPng,
  generarQrSvg,
  obtenerCampanaParaCompartir,
  obtenerEnlaceActual,
} from "@/lib/campanas/enlaces";
import { getSessionUser } from "@/lib/session";

// GET ?formato=png|svg (png por defecto): QR de 512 × 512 px del enlace vigente.
// 410 si el enlace caducó: ese QR ya no lleva a ninguna parte.
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });

    const campana = await obtenerCampanaParaCompartir(id);
    if (!campana) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });

    const enlace = await obtenerEnlaceActual(campana.id);
    if (!enlace) {
      return NextResponse.json({ error: "Esta campaña todavía no tiene enlace público" }, { status: 404 });
    }
    if (!estaVigente(enlace)) {
      return NextResponse.json({ error: "El enlace caducó. Regenera el token antes de descargar el QR." }, { status: 410 });
    }

    const formato = new URL(request.url).searchParams.get("formato") === "svg" ? "svg" : "png";
    const nombre = `qr-${enlace.token}.${formato}`;
    const cabeceras = {
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "private, no-store",
    };

    if (formato === "svg") {
      const svg = await generarQrSvg(enlace.token);
      return new NextResponse(svg, { headers: { ...cabeceras, "Content-Type": "image/svg+xml; charset=utf-8" } });
    }

    const png = await generarQrPng(enlace.token);
    return new NextResponse(new Uint8Array(png), { headers: { ...cabeceras, "Content-Type": "image/png" } });
  } catch (error) {
    console.error("Error generando el QR de la campaña", error);
    return NextResponse.json({ error: "No se pudo generar el QR" }, { status: 500 });
  }
}
