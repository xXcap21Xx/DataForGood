import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import Subtabs from "@/components/sistema/subtabs";
import Tag from "@/components/sistema/Tag";
import { Aviso, Encabezado, EnlaceBoton, Paginacion, formatearNumero } from "@/components/sistema/ui";
import {
  ETIQUETA_DE_CAMPANA,
  NOMBRE_DE_TIPO,
  ESTADOS_DEL_LISTADO,
  PESTANAS_CAMPANAS,
  POR_PAGINA,
  buscarCampanas,
  contarPorEstado,
  diasRestantes,
  esEstado,
  esTipo,
  formatearFechaCampana,
  listarTematicas,
  type EstadoDeCampana,
} from "@/lib/campanas/sistema";
import FiltrosDeCampanas from "./filtros";

export const metadata: Metadata = { title: "Listado de campañas" };
export const dynamic = "force-dynamic";

type Busqueda = {
  q?: string;
  estado?: string;
  tematica?: string;
  tipo?: string;
  vigencia?: string;
  orden?: string;
  pagina?: string;
};

const BASE = "/sistema/campanas";

export default async function ListadoDeCampanasPage({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const sp = await searchParams;
  // Un ?estado=borrador escrito a mano se ignora: el listado no muestra borradores.
  const estado = ESTADOS_DEL_LISTADO.find((e) => e === esEstado(sp.estado));
  const pagina = Math.max(1, Number(sp.pagina ?? 1) || 1);

  const [conteos, { filas, total }, tematicas] = await Promise.all([
    contarPorEstado(),
    buscarCampanas({
      q: sp.q,
      estado,
      tematica: sp.tematica,
      tipo: esTipo(sp.tipo),
      vigencia: sp.vigencia,
      orden: sp.orden,
      pagina,
    }),
    listarTematicas(),
  ]);

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const desde = (pagina - 1) * POR_PAGINA + 1;
  const hasta = Math.min(pagina * POR_PAGINA, total);

  /** Enlace con los filtros actuales, cambiando solo lo indicado. */
  function enlace(cambios: { estado?: EstadoDeCampana | null; pagina?: number }) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (v && k !== "pagina" && k !== "estado") params.set(k, v);
    }
    const e = cambios.estado === undefined ? estado : cambios.estado;
    if (e) params.set("estado", e);
    if (cambios.pagina && cambios.pagina > 1) params.set("pagina", String(cambios.pagina));
    const qs = params.toString();
    return qs ? `${BASE}?${qs}` : BASE;
  }

  const subtitulo = estado
    ? `${formatearNumero(conteos.todas)} registradas · mostrando ${formatearNumero(conteos[estado])} ${ETIQUETA_DE_CAMPANA[estado].texto.toLowerCase()}`
    : `${formatearNumero(conteos.todas)} registradas`;

  const claseChip = (activo: boolean) =>
    `inline-flex items-center gap-1.5 rounded-pill border px-3 py-1 text-[11.5px] font-semibold transition-colors ${
      activo ? "border-accent bg-accent text-white" : "border-line-2 bg-surface text-ink-2 hover:border-ink-3 hover:text-ink"
    }`;

  return (
    <div>
      <Subtabs pestanas={PESTANAS_CAMPANAS} etiquetaAria="Secciones de campañas" />

      <Encabezado
        titulo="Campañas"
        subtitulo={subtitulo}
        acciones={<EnlaceBoton href={`${BASE}/dashboard`}>Ver dashboard</EnlaceBoton>}
      />

      <nav className="mb-3 flex flex-wrap gap-2" aria-label="Filtrar por estado">
        <Link href={enlace({ estado: null })} scroll={false} className={claseChip(!estado)} aria-current={!estado ? "true" : undefined}>
          Todas <span className="font-mono font-medium opacity-85">{formatearNumero(conteos.todas)}</span>
        </Link>
        {ESTADOS_DEL_LISTADO.map((e) => (
          <Link
            key={e}
            href={enlace({ estado: e })}
            scroll={false}
            className={claseChip(estado === e)}
            aria-current={estado === e ? "true" : undefined}
          >
            {ETIQUETA_DE_CAMPANA[e].texto}{" "}
            <span className="font-mono font-medium opacity-85">{formatearNumero(conteos[e])}</span>
          </Link>
        ))}
      </nav>

      <Suspense fallback={null}>
        <FiltrosDeCampanas
          q={sp.q ?? ""}
          tematica={sp.tematica ?? ""}
          tipo={sp.tipo ?? ""}
          vigencia={sp.vigencia ?? ""}
          orden={sp.orden ?? ""}
          tematicas={tematicas}
        />
      </Suspense>

      {filas.length === 0 ? (
        <p className="py-7 text-[13px] text-ink-2">
          Ninguna campaña coincide con estos filtros. Prueba quitando alguno o buscando por otro término.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface p-5 shadow-sm">
            <table className="w-full min-w-[820px] text-left text-[13.5px]">
              <thead className="border-b border-line font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
                <tr>
                  <th className="pb-3 font-medium">Campaña</th>
                  <th className="pb-3 font-medium">Tipo de dato</th>
                  <th className="pb-3 font-medium">Estado</th>
                  <th className="pb-3 text-right font-medium">Participan</th>
                  <th className="pb-3 text-right font-medium">Aportes</th>
                  <th className="pb-3 pl-4 font-medium">Vence</th>
                  <th className="pb-3 text-right font-medium">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((c) => {
                  const et = ETIQUETA_DE_CAMPANA[c.estado];
                  const dias = diasRestantes(c.venceEn);
                  return (
                    <tr key={c.id} className="border-b border-line last:border-0">
                      <td className="py-4 pr-3">
                        <p className="font-bold text-ink">{c.nombre}</p>
                        <p className="text-[12px] text-ink-3">
                          {c.tematica || "Sin temática"} · {c.creador || "Sin creador"}
                        </p>
                      </td>
                      <td className="text-[12.5px] text-ink-2">
                        {c.tiposDeDato.length > 0 ? c.tiposDeDato.map((t) => NOMBRE_DE_TIPO[t]).join(" · ") : "—"}
                      </td>
                      <td>
                        <Tag tone={et.tono}>{et.texto}</Tag>
                      </td>
                      <td className="text-right font-mono tabular-nums">{formatearNumero(c.participantes)}</td>
                      <td className="text-right font-mono tabular-nums">
                        {formatearNumero(c.aportes)}
                        <span className="text-ink-3">/{formatearNumero(c.meta)}</span>
                      </td>
                      <td className="pl-4 font-mono text-[12px] text-ink-2">
                        {c.venceEn ? (
                          <span title={dias !== null ? `Faltan ${dias} días` : undefined}>{formatearFechaCampana(c.venceEn, false)}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="text-right">
                        <EnlaceBoton href={`${BASE}/${c.id}`}>
                          Ver<span className="sr-only"> el panel de {c.nombre}</span>
                        </EnlaceBoton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Paginacion desde={desde} hasta={hasta} total={total} pagina={pagina} paginas={paginas} href={(p) => enlace({ pagina: p })} />
        </>
      )}

      <Aviso className="mt-5">
        Listado de consulta: filtra, ordena y abre el detalle de cualquier campaña. Aceptar, rechazar o reportar son
        acciones de supervisión y viven en <b className="font-semibold">Modo supervisor</b>.
      </Aviso>
    </div>
  );
}
