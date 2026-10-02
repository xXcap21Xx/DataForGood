"use client";

// Barra de filtros de campañas: búsqueda, temática, tipo de dato, vigencia (opcional) y orden.
// Solo dibuja y avisa de los cambios; quien la usa decide qué hacer con ellos:
// /sistema/campanas los escribe en la URL y /supervision y /supervisar filtran en el navegador.
// Constantes de lib/campanas/sistema-opciones.ts (sin imports de servidor).

import { useEffect, useId, useState } from "react";

import { NOMBRE_DE_TIPO, ORDENES_DE_CAMPANA, VIGENCIAS, type TipoDeDato } from "@/lib/campanas/sistema-opciones";

const TIPOS = Object.keys(NOMBRE_DE_TIPO) as TipoDeDato[];

const CLASE_SELECT =
  "rounded border border-line-2 bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-accent min-h-[38px]";

export type ValoresDeFiltros = {
  q: string;
  tematica: string;
  tipo: string;
  vigencia?: string;
  orden: string;
};

export default function BarraDeFiltros({
  valores,
  tematicas,
  onCambiar,
  conVigencia = false,
}: {
  valores: ValoresDeFiltros;
  tematicas: string[];
  onCambiar: (clave: keyof ValoresDeFiltros, valor: string) => void;
  /** Muestra el filtro "Vigencia" (solo /sistema/campanas). */
  conVigencia?: boolean;
}) {
  const [texto, setTexto] = useState(valores.q);

  const idQ = useId();
  const idTema = useId();
  const idTipo = useId();
  const idVig = useId();
  const idOrden = useId();

  // La búsqueda se aplica sola tras una pausa al teclear.
  useEffect(() => {
    if (texto === valores.q) return;
    const t = setTimeout(() => onCambiar("q", texto), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

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
        <select id={idTema} className={CLASE_SELECT} value={valores.tematica} onChange={(e) => onCambiar("tematica", e.target.value)}>
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
        <select id={idTipo} className={CLASE_SELECT} value={valores.tipo} onChange={(e) => onCambiar("tipo", e.target.value)}>
          <option value="">Tipo de dato: todos</option>
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {NOMBRE_DE_TIPO[t]}
            </option>
          ))}
        </select>
      </div>

      {conVigencia && (
        <div>
          <label className="sr-only" htmlFor={idVig}>
            Filtrar por vigencia
          </label>
          <select
            id={idVig}
            className={CLASE_SELECT}
            value={valores.vigencia ?? ""}
            onChange={(e) => onCambiar("vigencia", e.target.value)}
          >
            <option value="">Vigencia: cualquiera</option>
            {VIGENCIAS.map((v) => (
              <option key={v.valor} value={v.valor}>
                {v.etiqueta}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="sr-only" htmlFor={idOrden}>
          Ordenar por
        </label>
        <select id={idOrden} className={CLASE_SELECT} value={valores.orden} onChange={(e) => onCambiar("orden", e.target.value)}>
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
