"use client";

// Menú lateral de la zona de usuario. Agrega "Supervisión" si el usuario tiene rol supervisor.

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/session";

const NAV_ITEMS = [
  { href: "/campanas", label: "Explorar" },
  { href: "/mis-aportes", label: "Mis aportes" },
  { href: "/mis-campanas", label: "Mis campañas" },
];

export default function SidebarNav({ usuario }: { usuario: SessionUser }) {
  const pathname = usePathname();

  return (
    <aside className="dashboard-user-nav dashboard-sidebar w-64 shrink-0 border-r border-line bg-surface p-4 lg:sticky lg:top-0 lg:h-[calc(100vh-61px)]">
      <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
        Participar
      </p>
      <nav className="dashboard-nav flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const isCtaItem = item.href === "/mis-aportes" || item.href === "/mis-campanas";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-pill px-3.5 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? isCtaItem
                    ? "bg-ok text-white"
                    : "bg-accent text-white"
                  : "text-ink-2 hover:bg-sunken hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}

        {Array.isArray(usuario.role) && usuario.role.includes("supervisor") && (
          <Link
            href="/supervision"
            className={`rounded-pill px-3.5 py-2.5 text-sm font-medium transition-colors ${
              pathname.startsWith("/supervision")
                ? "bg-accent text-white"
                : "text-ink-2 hover:bg-sunken hover:text-ink"
            }`}
          >
            Supervisión
          </Link>
        )}

        {Array.isArray(usuario.role) && usuario.role.includes("revisor") && (
          <Link
            href="/revisiones"
            className={`rounded-pill px-3.5 py-2.5 text-sm font-medium transition-colors ${
              pathname.startsWith("/revisiones")
                ? "bg-accent text-white"
                : "text-ink-2 hover:bg-sunken hover:text-ink"
            }`}
          >
            Revisor de aportes
          </Link>
        )}
      </nav>

      {/* Nota, no botón: fondo claro y franja lateral para no confundirse con la opción activa del menú. */}
      <div className="dashboard-sidebar-callout mt-6 rounded-r-lg border-l-4 border-accent bg-accent-tint px-4 py-3.5">
        <p className="text-[13px] leading-snug text-ink-2">
          Cada aporte transforma datos en impacto para tu comunidad.
        </p>
        <p className="mt-2 text-[13px] font-semibold text-accent-deep">¡Súmate!</p>
      </div>
    </aside>
  );
}
