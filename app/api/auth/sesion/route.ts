import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  try {
    const usuario = await getSessionUser();

    if (!usuario) {
      return NextResponse.json({ error: "No hay sesión activa" }, { status: 401 });
    }

    return NextResponse.json({ data: usuario }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo obtener la sesión" },
      { status: 500 }
    );
  }
}
