import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./ui.module.css";

const nf = new Intl.NumberFormat("es-MX");

export function formatearNumero(n: number): string {
  return nf.format(n);
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
    <header className={styles.hd}>
      <div>
        <h1 className={styles.titulo}>{titulo}</h1>
        {subtitulo ? (
          <p className={`${styles.sub} ${subtituloMono ? styles.mono : ""}`}>
            {subtitulo}
          </p>
        ) : null}
      </div>
      {acciones ? <div className={styles.row}>{acciones}</div> : null}
    </header>
  );
}

export function TituloDeSeccion({ children }: { children: ReactNode }) {
  return <p className={styles.seccion}>{children}</p>;
}

/* ── métrica ────────────────────────────────────────────────────────────── */

export function Metrica({
  etiqueta,
  valor,
  enlaces,
}: {
  etiqueta: string;
  valor: number | string;
  /** Accesos opcionales al pie de la tarjeta. */
  enlaces?: { texto: string; href: string }[];
}) {
  return (
    <article className={styles.metric}>
      <p className={styles.metricLabel}>{etiqueta}</p>
      <p className={styles.metricValue}>
        {typeof valor === "number" ? formatearNumero(valor) : valor}
      </p>
      {enlaces?.length ? (
        <div className={styles.metricLinks}>
          {enlaces.map(({ texto, href }) => (
            <Link key={href + texto} href={href}>
              {texto}
              <span aria-hidden="true">›</span>
              <span className={styles.srOnly}>de {etiqueta.toLowerCase()}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </article>
  );
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
    <div>
      {filas.map((f) => (
        <div className={styles.reparto} key={f.etiqueta}>
          <span
            className={styles.repartoEtiqueta}
            style={{ width: anchoEtiqueta }}
          >
            {f.etiqueta}
          </span>
          <div className={styles.bar}>
            <i style={{ width: `${Math.round((f.valor / tope) * 100)}%` }} />
          </div>
          <span className={styles.repartoValor} style={{ width: anchoValor }}>
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
    <div>
      {filas.map((f, i) => (
        <div className={styles.kv} key={i}>
          <span>{f.clave}</span>
          <span className={styles.kvValor}>{f.valor}</span>
        </div>
      ))}
    </div>
  );
}

/* ── etiqueta de estado ─────────────────────────────────────────────────── */

export type TonoDeEtiqueta = "neutro" | "ok" | "aviso" | "riesgo";

const TONOS: Record<TonoDeEtiqueta, string> = {
  neutro: "",
  ok: styles.tagOk,
  aviso: styles.tagWarn,
  riesgo: styles.tagDanger,
};

export function Etiqueta({
  children,
  tono = "neutro",
}: {
  children: ReactNode;
  tono?: TonoDeEtiqueta;
}) {
  return <span className={`${styles.tag} ${TONOS[tono]}`}>{children}</span>;
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
    <div className={styles.pie}>
      <Link className={styles.btn} href={volver.href}>
        ← {volver.texto}
      </Link>
      {acciones ? <div className={styles.row}>{acciones}</div> : null}
    </div>
  );
}
