// Pantalla /supervisar: el SuperUsuario como supervisor (equivalente de /supervision con sesión raíz).
// Server Component. Datos: listarCampanasParaRoot() de lib/supervision/root.ts (exige sesión raíz).

import type { Metadata } from "next";
import { listarCampanasParaRoot } from "@/lib/supervision/root";
import PestanasDeSupervision from "./pestanas";

export const metadata: Metadata = { title: "Modo supervisor" };

export default async function SupervisarPage() {
  const { pendientes, supervisadas } = await listarCampanasParaRoot();

  return (
    <PestanasDeSupervision
      pendientes={pendientes}
      supervisadas={supervisadas.filter((c) => c.status === "activa" || c.status === "aceptada")}
      finalizadas={supervisadas.filter((c) => c.status === "finalizada")}
      conIncidencia={supervisadas.filter(
        (c) => c.latestSupervisionAction === "reportada" || c.status === "rechazada",
      )}
    />
  );
}
