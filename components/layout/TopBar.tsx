import { currentUser } from "@/data/screensData";

export default function TopBar() {
  return (
    <header className="dashboard-topbar flex items-center justify-between gap-4 border-b border-line bg-surface px-4 py-3 sm:px-6">
      <input
        type="search"
        placeholder="Buscar campañas, temas o palabras clave…"
        className="w-full min-w-0 max-w-md rounded-pill border border-line-2 bg-paper px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent"
      />
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <button
          aria-label="Notificaciones"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-sunken"
        >
          <BellIcon />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
            3
          </span>
        </button>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-[12px] font-bold text-white">
            {currentUser.alias
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div className="hidden sm:block">
            <p className="text-[13px] font-semibold text-ink">{currentUser.alias}</p>
            <p className="text-[11.5px] text-ink-3">Ver perfil</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function BellIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
