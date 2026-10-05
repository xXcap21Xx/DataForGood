"use client";

// Selector de temáticas: muestra las elegidas y abre un <dialog> nativo con buscador.
// Aplica los cambios solo al dar Aceptar. Lo usan /bienvenida, /cuenta y el formulario de
// campaña (/mis-campanas/nueva, con `unica`: una sola temática).

import { useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Tag from "@/components/ui/Tag";

/**
 * Muestra las temáticas elegidas y un botón que abre una ventana con todas
 * las opciones. Los cambios dentro de la ventana solo se aplican al dar
 * "Aceptar"; Cancelar, Esc o un clic fuera los descartan. Usa <dialog>
 * nativo: el navegador atrapa el foco y cierra con Esc.
 *
 * Con `quitables`, cada temática elegida trae una × para quitarla sin abrir
 * la ventana, y el botón queda como "Agregar temáticas" (así en /cuenta).
 *
 * Con `unica`, se elige exactamente una temática (la de una campaña): tocar
 * otra reemplaza a la anterior y "Aceptar" pide que haya una marcada.
 */
export default function SelectorDeTemas({
  opciones,
  seleccionados,
  onAceptar,
  quitables = false,
  unica = false,
  deshabilitado = false,
  titulo,
  descripcion,
}: {
  opciones: string[];
  seleccionados: string[];
  onAceptar: (temas: string[]) => void;
  quitables?: boolean;
  unica?: boolean;
  deshabilitado?: boolean;
  titulo?: string;
  descripcion?: string;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [borrador, setBorrador] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState("");

  function abrir() {
    setBorrador(seleccionados);
    setBusqueda("");
    dialogo.current?.showModal();
  }

  function cerrar() {
    dialogo.current?.close();
  }

  function aceptar() {
    // Se respeta el orden de la lista original, no el orden en que se tocaron.
    onAceptar(opciones.filter((tema) => borrador.includes(tema)));
    cerrar();
  }

  function alternar(tema: string) {
    if (unica) {
      setBorrador([tema]);
      return;
    }
    setBorrador((prev) => (prev.includes(tema) ? prev.filter((t) => t !== tema) : [...prev, tema]));
  }

  const textoDelBoton =
    seleccionados.length === 0
      ? unica
        ? "+ Elegir temática"
        : "+ Elegir temáticas"
      : unica
        ? "Cambiar temática"
        : quitables
          ? "+ Agregar temáticas"
          : "Cambiar temáticas";

  const termino = busqueda.trim().toLowerCase();
  const visibles = termino ? opciones.filter((tema) => tema.toLowerCase().includes(termino)) : opciones;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {seleccionados.length === 0 ? (
          <p className="text-[12.5px] text-ink-3">Aún no eliges ninguna temática.</p>
        ) : quitables && !unica ? (
          seleccionados.map((tema) => (
            <button
              key={tema}
              type="button"
              onClick={() => onAceptar(seleccionados.filter((t) => t !== tema))}
              aria-label={`Quitar ${tema}`}
              className="inline-flex items-center gap-2 rounded-pill border border-accent bg-accent px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-deep"
            >
              {tema}
              <span className="font-mono text-[11px]" aria-hidden>
                ×
              </span>
            </button>
          ))
        ) : (
          seleccionados.map((tema) => (
            <Tag key={tema} tone="on">
              {tema}
            </Tag>
          ))
        )}
        <Button type="button" size="sm" onClick={abrir} disabled={deshabilitado}>
          {textoDelBoton}
        </Button>
      </div>

      <dialog
        ref={dialogo}
        aria-labelledby="selector-temas-titulo"
        // Clic en el fondo (fuera de la caja): se cierra sin aplicar cambios.
        onClick={(e) => {
          if (e.target === dialogo.current) cerrar();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-lg border border-line bg-surface p-0 text-ink shadow-lg backdrop:bg-ink/40"
      >
        <div className="flex max-h-[85vh] flex-col">
          <div className="border-b border-line p-5">
            <h2 id="selector-temas-titulo" className="text-lg font-extrabold text-ink">
              {titulo ?? (unica ? "Elige la temática" : "Elige tus temáticas")}
            </h2>
            <p className="mt-1 text-[12.5px] text-ink-2">
              {descripcion ??
                (unica
                  ? "Marca una; tocar otra la reemplaza."
                  : "Marca las que te interesen; te mostraremos campañas relacionadas.")}
            </p>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar temática"
              aria-label="Buscar temática"
              className="mt-3 w-full rounded border border-line-2 bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {visibles.length === 0 ? (
              <p className="text-[12.5px] text-ink-3">Ninguna temática coincide con «{busqueda}».</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {visibles.map((tema) => {
                  const activo = borrador.includes(tema);
                  return (
                    <button
                      key={tema}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => alternar(tema)}
                      className={`rounded-pill border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                        activo
                          ? "border-accent bg-accent text-white"
                          : "border-line-2 bg-surface text-ink-2 hover:border-accent"
                      }`}
                    >
                      {tema}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line p-4">
            <span className="font-mono text-[12px] text-ink-3">
              {borrador.length} {borrador.length === 1 ? "seleccionada" : "seleccionadas"}
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={cerrar}>
                Cancelar
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={aceptar} disabled={unica && borrador.length === 0}>
                Aceptar
              </Button>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
