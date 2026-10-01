// POST /api/auth/logout — cierra la sesión de usuario. Lo llama components/auth/LogoutButton.

import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ message: "Sesión cerrada" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo cerrar la sesión" },
      { status: 500 }
    );
  }
}
