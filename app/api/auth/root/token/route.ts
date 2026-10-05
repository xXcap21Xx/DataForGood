// /api/auth/root/token — token Bearer del SuperUsuario para usar la API desde Swagger
// (/api/docs → "Authorize") u otro cliente, sin pasar por la pantalla /root.

import { NextResponse } from "next/server";
import { emitirTokenRoot } from "@/lib/rootSession";
import { registrarAuditoria } from "@/lib/auditoria";
import { verificarCredencialRoot } from "@/lib/root-acceso";

// POST: con la credencial de SuperUsuario del entorno devuelve un token que vale
// 2 horas (es una sesión raíz más, en root_sessions). No guarda cookie.
export async function POST(request: Request) {
  const error = await verificarCredencialRoot(request);
  if (error) return error;

  const { token, expiresAt } = await emitirTokenRoot();
  await registrarAuditoria({ actor: { tipo: "superusuario" }, accion: "root.token_api" });

  return NextResponse.json(
    { data: { token, tipo: "Bearer", expiraEn: expiresAt.toISOString() } },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
