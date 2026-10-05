"use client";

// Pestañas secundarias del panel (p. ej. Dashboard / Directorio / Sanciones).

import Link from "next/link";
import { usePathname } from "next/navigation";

export type Pestana = { href: string; etiqueta: string };

export default function Subtabs({
  pestanas,
  etiquetaAria,
  listaEnMovil = false,
  distribuidasEnMovil = false,
  volverAlMenuEnMovil = false,
  menuInicialMovil = false,
}: {
  pestanas: Pestana[];
  etiquetaAria: string;
  listaEnMovil?: boolean;
  distribuidasEnMovil?: boolean;
  volverAlMenuEnMovil?: boolean;
  menuInicialMovil?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label={etiquetaAria} className="mb-6">
      {volverAlMenuEnMovil && (
        <Link
          href="/usuarios?movil=menu"
          className="mb-4 inline-flex items-center rounded-pill border border-line-2 bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink-2 hover:bg-sunken md:hidden"
        >
          <span aria-hidden="true" className="mr-2">←</span>
          Menú de usuarios
        </Link>
      )}

      <div
        className={`${
          volverAlMenuEnMovil
            ? "hidden md:flex md:flex-wrap md:gap-1 md:border-b md:border-line"
            : listaEnMovil
              ? "grid min-h-[65svh] grid-cols-1 grid-rows-4 gap-3 md:min-h-0 md:grid-rows-none md:flex md:flex-wrap md:gap-1 md:border-b md:border-line"
              : distribuidasEnMovil
                ? "grid grid-cols-2 gap-2 md:flex md:flex-wrap md:gap-1 md:border-b md:border-line"
              : "flex flex-wrap gap-1 border-b border-line"
        }`}
      >
        {pestanas.map(({ href, etiqueta }) => {
          const activa = pathname === href;
          const esDirectorioDesdeMenu = menuInicialMovil && href === "/usuarios" && activa;
          return (
            <Link
              key={href}
              href={href}
              aria-current={activa && !esDirectorioDesdeMenu ? "page" : undefined}
              className={
                listaEnMovil
                  ? esDirectorioDesdeMenu
                    ? "flex items-center rounded-lg border border-line bg-surface px-5 py-5 text-base font-medium text-ink-2 transition-colors hover:bg-sunken hover:text-ink md:-mb-px md:rounded-none md:border-0 md:border-b-2 md:border-accent md:bg-transparent md:px-4 md:py-2.5 md:text-[13px] md:font-bold md:text-accent"
                    : `flex items-center rounded-lg border px-5 py-5 text-base font-medium transition-colors md:-mb-px md:rounded-none md:border-0 md:border-b-2 md:px-4 md:py-2.5 md:text-[13px] ${
                        activa
                          ? "border-accent bg-accent text-white md:bg-transparent md:font-bold md:text-accent"
                          : "border-line bg-surface text-ink-2 hover:bg-sunken hover:text-ink md:border-transparent"
                      }`
                  : distribuidasEnMovil
                    ? `flex items-center justify-center rounded-lg border px-2 py-3 text-center text-[13px] font-medium transition-colors md:-mb-px md:flex-none md:rounded-none md:border-0 md:border-b-2 md:px-4 md:py-2.5 ${
                        activa
                          ? "border-accent bg-accent font-bold text-white md:bg-transparent md:text-accent"
                          : "border-line bg-surface text-ink-2 hover:bg-sunken hover:text-ink md:border-transparent"
                      }`
                  : `-mb-px border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors ${
                      activa
                        ? "border-accent font-bold text-accent"
                        : "border-transparent text-ink-2 hover:bg-sunken hover:text-ink"
                    }`
              }
            >
              {etiqueta}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
