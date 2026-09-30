import type { Metadata } from "next";
import { redirect } from "next/navigation";
import CuentaBloqueada from "@/components/layout/CuentaBloqueada";
import { getSessionUser, obtenerBloqueoDeLaSesion } from "@/lib/session";

export const metadata: Metadata = { title: "Cuenta bloqueada" };
export const dynamic = "force-dynamic";

/**
 * A donde exigirUsuario() manda una cuenta suspendida o baneada. Solo
 * explica el motivo: la API y las acciones ya la rechazan (getSessionUser).
 */
export default async function CuentaBloqueadaPage() {
  const bloqueada = await obtenerBloqueoDeLaSesion();
  if (!bloqueada) {
    // Ya se levantó el bloqueo (o nunca lo hubo): de vuelta a la app.
    redirect((await getSessionUser()) ? "/campanas" : "/entrar");
  }
  return <CuentaBloqueada nombre={bloqueada.nombre} bloqueo={bloqueada.bloqueo} historial={bloqueada.historial} />;
}
