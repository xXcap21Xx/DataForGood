"use client";

// Filtros del listado /sistema/campanas: los escribe en la URL (searchParams).
// Constantes de lib/campanas/sistema-opciones.ts (sin imports de servidor).

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";

import { NOMBRE_DE_TIPO, ORDENES_DE_CAMPANA, VIGENCIAS, type TipoDeDato } from "@/lib/campanas/sistema-opciones";

const TIPOS = Object.keys(NOMBRE_DE_TIPO) as TipoDeDato[];

const CLASE_SELECT =
  "rounded border border-line-2 bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-accent min-h-[38px]";

/**
 * Los filtros viven en la URL (igual que /usuarios): la vista filtrada se
 * puede compartir, el botón atrás funciona y el filtrado lo hace el servidor.
 */
export default function FiltrosDeCampanas({
  q,
  tematica,
  tipo,
  vigencia,
  orden,
  tematicas,
}: {
  q: string;
  tematica: string;
  tipo: string;
  vigencia: string;
  orden: string;
  tematicas: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, iniciar] = useTransition();
  const [texto, setTexto] = useState(q);

  const idQ = useId();
  const idTema = useId();
  const idTipo = useId();
  const idVig = useId();
  const idOrden = useId();

  // La búsqueda se aplica sola tras una pausa al teclear.
  useEffect(() => {
    if (texto === q) return;
    const t = setTimeout(() => aplicar("q", texto), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  function aplicar(clave: string, valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (valor) params.set(clave, valor);
    else params.delete(clave);
    // Cualquier cambio de filtro vuelve a la primera página.
    params.delete("pagina");
    const qs = params.toString();
    iniciar(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2.5">
      <div className="min-w-[220px] flex-1">
        <label className="sr-only" htmlFor={idQ}>
          Buscar campaña
        </label>
        <input
          id={idQ}
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar por nombre, temática, creador o ID"
          className="w-full rounded border border-line-2 bg-surface px-3.5 py-2 text-sm text-ink outline-none transition-colors focus:border-accent"
        />
      </div>

      <div>
        <label className="sr-only" htmlFor={idTema}>
          Filtrar por temática
        </label>
        <select id={idTema} className={CLASE_SELECT} value={tematica} onChange={(e) => aplicar("tematica", e.target.value)}>
          <option value="">Temática: todas</option>
          {tematicas.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="sr-only" htmlFor={idTipo}>
          Filtrar por tipo de dato
        </label>
        <select id={idTipo} className={CLASE_SELECT} value={tipo} onChange={(e) => aplicar("tipo", e.target.value)}>
          <option value="">Tipo de dato: todos</option>
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {NOMBRE_DE_TIPO[t]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="sr-only" htmlFor={idVig}>
          Filtrar por vigencia
        </label>
        <select id={idVig} className={CLASE_SELECT} value={vigencia} onChange={(e) => aplicar("vigencia", e.target.value)}>
          <option value="">Vigencia: cualquiera</option>
          {VIGENCIAS.map((v) => (
            <option key={v.valor} value={v.valor}>
              {v.etiqueta}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="sr-only" htmlFor={idOrden}>
          Ordenar por
        </label>
        <select id={idOrden} className={CLASE_SELECT} value={orden} onChange={(e) => aplicar("orden", e.target.value)}>
          <option value="">Más recientes</option>
          {ORDENES_DE_CAMPANA.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.etiqueta}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
