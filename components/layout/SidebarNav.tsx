"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { currentUser } from "@/data/screensData";

const NAV_ITEMS = [
  { href: "/campanas", label: "Explorar" },
  { href: "/mis-aportes", label: "Mis aportes" },
  { href: "/mis-campanas", label: "Mis campañas" },
  { href: "/cuenta", label: "Configuración de cuenta" },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="dashboard-sidebar w-64 shrink-0 border-r border-line bg-surface p-4 lg:sticky lg:top-0 lg:h-[calc(100vh-61px)]">
      <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
        Participar
      </p>
      <nav className="dashboard-nav flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-pill px-3.5 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-accent text-white"
                  : "text-ink-2 hover:bg-sunken hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}

        {currentUser.role === "supervisor" && (
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
      </nav>

      <div className="dashboard-sidebar-callout mt-6 rounded-lg bg-accent-deep p-4 text-white">
        <p className="text-sm font-bold leading-snug">
          Cada aporte transforma datos en impacto para tu comunidad.
        </p>
        <p className="mt-2 text-sm font-bold">¡Súmate!</p>
      </div>
    </aside>
  );
}
