"use client";

// Buscador de la barra superior de la zona de usuario (TopBar). Solo se muestra en
// Explorar (/campanas) y Mis aportes. Supervisión y revisión de aportes ya tienen su propia
// barra de filtros; en las demás pantallas no hay nada que buscar.
// Devuelve el <input> sin envoltorio: los estilos móviles de globals.css lo seleccionan
// como hijo directo de .dashboard-user-topbar.

import { usePathname } from "next/navigation";

// Pantallas con buscador (la ruta exacta o cualquiera debajo de ella).
const RUTAS_CON_BUSCADOR = ["/campanas", "/mis-aportes"];

export default function BuscadorDeLaBarra() {
  // usePathname() ya viene sin el basePath (/dataforgood).
  const ruta = usePathname();
  const visible = RUTAS_CON_BUSCADOR.some((r) => ruta === r || ruta.startsWith(`${r}/`));
  if (!visible) return null;

  return (
    <input
      type="search"
      placeholder="Buscar campañas, temas o palabras clave…"
      aria-label="Buscar campañas"
      className="w-full min-w-0 max-w-md rounded-pill border border-line-2 bg-paper px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent"
    />
  );
}
