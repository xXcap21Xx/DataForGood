"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { IconoBuscar, IconoCampana, IconoHoja } from "./icons";

type TopbarProps = {
  /** Valor configurado en ROOT_USER_ID. La sesión raíz no es una persona con nombre propio. */
  identificador: string;
};

export default function Topbar({ identificador }: TopbarProps) {
  const router = useRouter();
  const iniciales = identificador.slice(0, 2).toUpperCase();
  const [consulta, setConsulta] = useState("");

  function buscar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = consulta.trim();
    if (q === "") return;
    router.push(`/campanas?q=${encodeURIComponent(q)}`);
  }

  return (
    <header className="dashboard-topbar flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 sm:px-6">
      <Link href="/sistema" className="flex shrink-0 items-center gap-2.5 text-ink">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-accent text-white">
          <IconoHoja className="h-4 w-4" />
        </span>
        <span className="text-sm font-extrabold leading-[1.15] tracking-tight">
          Data
          <br />
          ForGood
        </span>
      </Link>

      <form
        onSubmit={buscar}
        role="search"
        className="flex min-w-[150px] max-w-md flex-1 items-center gap-2 rounded-pill border border-line-2 bg-surface px-4 py-2 text-ink-3 transition-colors focus-within:border-accent"
      >
        <IconoBuscar className="h-4 w-4 shrink-0" />
        <input
          type="search"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="Buscar campañas, temas o palabras clave…"
          aria-label="Buscar campañas"
          className="w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
        />
      </form>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        <span className="inline-flex items-center rounded-pill border border-line-2 bg-surface px-3 py-1 text-[11.5px] font-semibold text-ink-2">
          SuperUsuario
        </span>

        <span className="inline-flex text-ink-2" aria-hidden="true">
          <IconoCampana className="h-4 w-4" />
        </span>

        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold tracking-tight text-white"
          >
            {iniciales}
          </span>
          <span className="hidden sm:block">
            <span className="block text-[13px] font-semibold leading-tight text-ink">
              {identificador}
            </span>
            <span className="block text-[11px] text-ink-3">Sesión raíz</span>
          </span>
        </span>
      </div>
    </header>
  );
}
