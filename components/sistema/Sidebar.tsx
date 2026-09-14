"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";

import {
  IconoAportes,
  IconoCampanas,
  IconoEscudo,
  IconoInicio,
  IconoUsuarios,
} from "./icons";

type Entrada = {
  href: string;
  etiqueta: string;
  Icono: ComponentType<SVGProps<SVGSVGElement>>;
  /** Rutas que también deben marcar esta entrada como activa. */
  seccion: string[];
  /** Separado del resto: no es una sección más, es un cambio de modo. */
  apartado?: boolean;
};

const MENU: Entrada[] = [
  { href: "/sistema", etiqueta: "Inicio", Icono: IconoInicio, seccion: ["/sistema"] },
  {
    href: "/usuarios",
    etiqueta: "Usuarios",
    Icono: IconoUsuarios,
    seccion: ["/usuarios", "/supervisores"],
  },
  {
    href: "/campanas",
    etiqueta: "Campañas",
    Icono: IconoCampanas,
    seccion: ["/campanas"],
  },
  { href: "/aportes", etiqueta: "Aportes", Icono: IconoAportes, seccion: ["/aportes"] },
  {
    href: "/supervisar",
    etiqueta: "Modo supervisor",
    Icono: IconoEscudo,
    seccion: ["/supervisar"],
    apartado: true,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="dashboard-sidebar w-64 shrink-0 border-r border-line bg-surface p-3 lg:sticky lg:top-0 lg:h-[calc(100vh-61px)]">
      <p className="mb-1 px-3 pt-3 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
        Sistema
      </p>

      <nav aria-label="Secciones del panel" className="dashboard-nav flex flex-col gap-1">
        {MENU.map(({ href, etiqueta, Icono, seccion, apartado }) => {
          const activo = seccion.some(
            (base) => pathname === base || pathname.startsWith(`${base}/`),
          );

          return (
            <Link
              key={href}
              href={href}
              aria-current={activo ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-pill px-3.5 py-2.5 text-sm font-medium transition-colors ${
                activo ? "bg-accent text-white" : "text-ink-2 hover:bg-sunken hover:text-ink"
              } ${apartado ? "mt-2 border-t border-line pt-4" : ""}`}
            >
              <Icono className="h-4 w-4 shrink-0" />
              {etiqueta}
            </Link>
          );
        })}
      </nav>

      <div className="dashboard-sidebar-callout mt-5 rounded-lg bg-accent-deep p-4 text-white">
        <p className="text-[12.5px] leading-relaxed opacity-90">
          Revisa con criterio: cada validación sostiene la calidad de los datos.
        </p>
        <p className="mt-2 text-[13.5px] font-bold">Gracias por moderar</p>
      </div>
    </aside>
  );
}
