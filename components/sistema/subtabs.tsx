"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type Pestana = { href: string; etiqueta: string };

export default function Subtabs({
  pestanas,
  etiquetaAria,
}: {
  pestanas: Pestana[];
  etiquetaAria: string;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label={etiquetaAria} className="mb-6 flex flex-wrap gap-1 border-b border-line">
      {pestanas.map(({ href, etiqueta }) => {
        const activa = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={activa ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors ${
              activa
                ? "border-accent font-bold text-accent"
                : "border-transparent text-ink-2 hover:bg-sunken hover:text-ink"
            }`}
          >
            {etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
