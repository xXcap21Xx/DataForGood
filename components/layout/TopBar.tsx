import Link from "next/link";
import type { SessionUser } from "@/lib/session";
import NotificationsBell from "./NotificationsBell";

export default function TopBar({ usuario }: { usuario: SessionUser }) {
  return (
    <header className="dashboard-topbar flex items-center justify-between gap-4 border-b border-line bg-surface px-4 py-3 sm:px-6">
      <input
        type="search"
        placeholder="Buscar campañas, temas o palabras clave…"
        className="w-full min-w-0 max-w-md rounded-pill border border-line-2 bg-paper px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent"
      />
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <NotificationsBell />
        <div className="flex items-center gap-2.5">
          <Link href="/cuenta" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-[12px] font-bold text-white">
              {(usuario.nombre ?? "")
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div className="hidden sm:block">
              <p className="text-[13px] font-semibold text-ink">{`${usuario.nombre ?? ""} ${usuario.apellidos ?? ""}`.trim()}</p>
              <p className="text-[11.5px] text-ink-3">Ver perfil</p>
            </div>
          </Link>
          {Array.isArray(usuario.role) && usuario.role.includes("supervisor") && (
            <Link
              href="/supervision"
              className="rounded-pill border border-line-2 bg-sunken px-3 py-1.5 text-[11px] font-bold text-accent hover:border-accent hover:bg-accent-tint"
            >
              Supervisor
            </Link>
          )}
          {Array.isArray(usuario.role) && usuario.role.includes("revisor") && !usuario.role.includes("supervisor") && (
            <Link
              href="/revisiones"
              className="rounded-pill border border-line-2 bg-sunken px-3 py-1.5 text-[11px] font-bold text-accent hover:border-accent hover:bg-accent-tint"
            >
              Revisor de aportes
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

