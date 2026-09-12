import { NextResponse } from "next/server";
import { getPendingVerification, startVerification } from "@/lib/verification";

export async function POST() {
  try {
    const pending = await getPendingVerification();

    if (!pending) {
      return NextResponse.json({ error: "No hay verificación pendiente" }, { status: 404 });
    }

    const { expiresAt } = await startVerification(pending.id, pending.email, pending.nombre);

    return NextResponse.json({ message: "Código reenviado", data: { expiresAt } }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo reenviar el código" }, { status: 500 });
  }
}
