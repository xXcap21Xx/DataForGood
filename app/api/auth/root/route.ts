import { NextResponse } from "next/server";
import { createRootSession } from "@/lib/rootSession";
import { registrarAuditoria } from "@/lib/auditoria";
import { verificarCredencialRoot } from "@/lib/root-acceso";

/**
 * POST /api/auth/root — valida la credencial de SuperUsuario y abre su
 * sesión con la cookie `root_session_token` (la usa /root). Los accesos,
 * exitosos o fallidos, quedan en audit_log.
 */
export async function POST(request: Request) {
  const error = await verificarCredencialRoot(request);
  if (error) return error;

  await createRootSession();
  await registrarAuditoria({ actor: { tipo: "superusuario" }, accion: "root.acceso" });

  return new NextResponse(null, { status: 204 });
}
