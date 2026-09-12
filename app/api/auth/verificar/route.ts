import { NextResponse } from "next/server";
import { createSession } from "@/lib/session";
import { getPendingVerification, verifyCode, clearPendingVerificationCookie } from "@/lib/verification";

export async function GET() {
  try {
    const pending = await getPendingVerification();

    if (!pending) {
      return NextResponse.json({ error: "No hay verificación pendiente" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        email: pending.email,
        expiresAt: pending.expiresAt,
        attemptsLeft: pending.attemptsLeft,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo obtener la verificación" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const pending = await getPendingVerification();

    if (!pending) {
      return NextResponse.json({ error: "No hay verificación pendiente" }, { status: 404 });
    }

    const body = await request.json();
    const code = String(body.code ?? "").trim();

    if (!code) {
      return NextResponse.json({ error: "El código es obligatorio" }, { status: 400 });
    }

    const result = await verifyCode(pending.id, code);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, attemptsLeft: result.attemptsLeft },
        { status: 400 }
      );
    }

    await clearPendingVerificationCookie();
    await createSession(pending.id);

    return NextResponse.json({ message: "Correo verificado" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo verificar el código" }, { status: 500 });
  }
}
