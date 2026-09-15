import Link from "next/link";
import type { ReactNode } from "react";

import ProgressBar from "@/components/ui/ProgressBar";

const nf = new Intl.NumberFormat("es-MX");

export function formatearNumero(n: number): string {
  return nf.format(n);
}

const CLASES_ENLACE_BOTON =
  "inline-flex items-center justify-center gap-1.5 rounded-pill border border-line-2 bg-surface px-3.5 py-1.5 text-[12.5px] font-semibold text-ink transition-colors hover:border-ink-3 hover:bg-sunken";

/** Link con la misma apariencia de botón secundario que ya usa `/sistema`. */
export function EnlaceBoton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={CLASES_ENLACE_BOTON}>
      {children}
    </Link>
  );
}

/* ── encabezado ─────────────────────────────────────────────────────────── */

export function Encabezado({
  titulo,
  subtitulo,
  subtituloMono = false,
  acciones,
}: {
  titulo: string;
  subtitulo?: string;
  subtituloMono?: boolean;
  acciones?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-extrabold text-ink">{titulo}</h1>
        {subtitulo ? (
          <p className={`mt-1 text-[13px] text-ink-2 ${subtituloMono ? "font-mono" : ""}`}>
            {subtitulo}
          </p>
        ) : null}
      </div>
      {acciones ? <div className="flex flex-wrap items-center gap-2">{acciones}</div> : null}
    </header>
  );
}

export function TituloDeSeccion({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-[12.5px] font-semibold text-ink">{children}</p>;
}

/* ── reparto en barras ──────────────────────────────────────────────────── */

export type FilaDeReparto = {
  etiqueta: string;
  valor: number;
  /** Texto a la derecha. Si se omite se formatea el valor. */
  display?: string;
};

export function Reparto({
  filas,
  anchoEtiqueta = 120,
  anchoValor = 44,
  /** Base del 100% de la barra. Por defecto, el valor mayor de la lista. */
  maximo,
}: {
  filas: FilaDeReparto[];
  anchoEtiqueta?: number;
  anchoValor?: number;
  maximo?: number;
}) {
  const tope = maximo ?? Math.max(...filas.map((f) => f.valor), 1);

  return (
    <div className="flex flex-col gap-2.5">
      {filas.map((f) => (
        <div className="flex items-center gap-2.5 text-[12.5px]" key={f.etiqueta}>
          <span className="shrink-0 text-ink-2" style={{ width: anchoEtiqueta }}>
            {f.etiqueta}
          </span>
          <ProgressBar pct={(f.valor / tope) * 100} tone="ok" />
          <span
            className="shrink-0 text-right font-mono tabular-nums"
            style={{ width: anchoValor }}
          >
            {f.display ?? formatearNumero(f.valor)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── lista clave / valor ────────────────────────────────────────────────── */

export function ListaClaveValor({
  filas,
}: {
  filas: { clave: ReactNode; valor: ReactNode }[];
}) {
  return (
    <div className="divide-y divide-line">
      {filas.map((f, i) => (
        <div className="flex items-center justify-between gap-3.5 py-2.5 text-[13.5px]" key={i}>
          <span>{f.clave}</span>
          <span className="font-mono tabular-nums">{f.valor}</span>
        </div>
      ))}
    </div>
  );
}

/* ── pie de pantalla ────────────────────────────────────────────────────── */

export function PieDePantalla({
  volver,
  acciones,
}: {
  volver: { texto: string; href: string };
  acciones?: ReactNode;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
      <EnlaceBoton href={volver.href}>← {volver.texto}</EnlaceBoton>
      {acciones ? <div className="flex flex-wrap items-center gap-2">{acciones}</div> : null}
    </div>
  );
}
