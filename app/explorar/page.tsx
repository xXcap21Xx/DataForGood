// Pantalla /explorar (pública): vitrina de campañas activas con filtros en searchParams.
// Datos: lib/campanas/publicas.ts. Al abrir una campaña va a /campanas/[id], que sí pide sesión.

import Link from "next/link";
import type { Metadata } from "next";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import ButtonLink from "@/components/ui/ButtonLink";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import Tag from "@/components/ui/Tag";
import { Input } from "@/components/ui/Input";
import {
  buscarCampanasActivas,
  contarCampanasActivas,
  obtenerEstadosActivos,
  obtenerTematicasActivas,
  type OrdenDeCampanas,
} from "@/lib/campanas/publicas";
import { DATA_TYPE_LABELS } from "@/lib/open-data";
import type { DataType } from "@/types";

export const metadata: Metadata = {
  title: "Explorar campañas",
  description: "Campañas ciudadanas activas en DataForGood a las que puedes sumarte con tus aportes.",
};

const nf = new Intl.NumberFormat("es-MX");

const ORDENES: { valor: OrdenDeCampanas; etiqueta: string }[] = [
  { valor: "participacion", etiqueta: "Más participación" },
  { valor: "recientes", etiqueta: "Más recientes" },
  { valor: "cierre", etiqueta: "Cierran pronto" },
];
const ORDENES_VALIDOS = new Set(ORDENES.map((o) => o.valor));

type Busqueda = Record<string, string | undefined>;

function textoDeCierre(dias: number | null): string {
  if (dias === null) return "sin fecha de cierre";
  if (dias === 0) return "cierra hoy";
  return dias === 1 ? "queda 1 día" : `quedan ${dias} días`;
}

export default async function ExplorarCampanasPage({
  searchParams,
}: {
  searchParams: Promise<Busqueda>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const tematica = sp.tematica || undefined;
  const locationState = sp.estado || undefined;
  const orden: OrdenDeCampanas = ORDENES_VALIDOS.has(sp.orden as OrdenDeCampanas)
    ? (sp.orden as OrdenDeCampanas)
    : "participacion";

  const [campanas, total, tematicas, estados] = await Promise.all([
    buscarCampanasActivas({ q, tematica, locationState, orden }),
    contarCampanasActivas(),
    obtenerTematicasActivas(),
    obtenerEstadosActivos(),
  ]);

  const activos = [q, tematica, locationState].filter(Boolean).length;

  function enlaceCon(cambios: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tematica) params.set("tematica", tematica);
    if (locationState) params.set("estado", locationState);
    if (orden !== "participacion") params.set("orden", orden);
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor) params.set(clave, valor);
      else params.delete(clave);
    }
    const qs = params.toString();
    return qs ? `/explorar?${qs}` : "/explorar";
  }

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-14">
        <p className="mb-2 font-mono text-[10.5px] uppercase tracking-widest text-accent">
          Campañas
        </p>
        <h1 className="max-w-2xl text-[32px] font-extrabold leading-tight tracking-tight text-ink">
          Campañas abiertas a la comunidad
        </h1>
        <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          {nf.format(total)} {total === 1 ? "campaña activa" : "campañas activas"} recibiendo
          aportes en este momento. Crea una cuenta o inicia sesión para participar.
        </p>

        <form className="mt-6 flex flex-wrap gap-2.5" action="/explorar" method="get">
          {orden !== "participacion" && <input type="hidden" name="orden" value={orden} />}
          {tematica && <input type="hidden" name="tematica" value={tematica} />}
          {locationState && <input type="hidden" name="estado" value={locationState} />}
          <Input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            aria-label="Buscar campañas"
            placeholder="Buscar por nombre, organización o municipio"
            className="max-w-sm"
          />
          <ButtonLink href="/registro" variant="primary">
            Quiero participar
          </ButtonLink>
        </form>

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
          <aside className="flex flex-col gap-6">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[12.5px] font-semibold text-ink">Filtros</p>
              {activos > 0 && (
                <Link
                  href={enlaceCon({ q: undefined, tematica: undefined, estado: undefined })}
                  className="text-[12.5px] font-medium text-accent hover:underline"
                >
                  Limpiar
                </Link>
              )}
            </div>

            {tematicas.length > 0 && (
              <div>
                <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">
                  Temática
                </p>
                <div className="flex flex-col gap-1">
                  {tematicas.map((t) => (
                    <Link
                      key={t.valor}
                      href={enlaceCon({ tematica: tematica === t.valor ? undefined : t.valor })}
                      className={`flex items-center justify-between rounded px-2 py-1.5 text-[13px] ${
                        tematica === t.valor
                          ? "bg-accent-tint font-semibold text-accent"
                          : "text-ink-2 hover:bg-sunken"
                      }`}
                    >
                      <span>{t.valor}</span>
                      <span className="font-mono text-[11px] text-ink-3">{t.total}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {estados.length > 0 && (
              <div>
                <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">
                  Estado
                </p>
                <div className="flex flex-col gap-1">
                  {estados.map((e) => (
                    <Link
                      key={e.valor}
                      href={enlaceCon({ estado: locationState === e.valor ? undefined : e.valor })}
                      className={`flex items-center justify-between rounded px-2 py-1.5 text-[13px] ${
                        locationState === e.valor
                          ? "bg-accent-tint font-semibold text-accent"
                          : "text-ink-2 hover:bg-sunken"
                      }`}
                    >
                      <span>{e.valor}</span>
                      <span className="font-mono text-[11px] text-ink-3">{e.total}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <div>
            <nav className="mb-4 flex flex-wrap gap-2" aria-label="Ordenar resultados">
              {ORDENES.map((o) => (
                <Link
                  key={o.valor}
                  href={enlaceCon({ orden: o.valor === "participacion" ? undefined : o.valor })}
                  className={`rounded-pill border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                    orden === o.valor
                      ? "border-accent bg-accent text-white"
                      : "border-line-2 bg-surface text-ink-2 hover:border-accent"
                  }`}
                >
                  {o.etiqueta}
                </Link>
              ))}
            </nav>

            <p className="mb-4 font-mono text-[12px] text-ink-2">
              {nf.format(campanas.length)} {campanas.length === 1 ? "campaña" : "campañas"}
              {activos > 0 ? ` · ${activos} ${activos === 1 ? "filtro activo" : "filtros activos"}` : ""}
            </p>

            {campanas.length === 0 ? (
              <p className="rounded-lg bg-sunken p-4 text-sm text-ink-2">
                {total === 0
                  ? "Por ahora no hay campañas activas. Vuelve pronto o crea la tuya."
                  : "Ninguna campaña coincide con estos filtros. Prueba quitando alguno o buscando por otro término."}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {campanas.map((c) => {
                  const pct = c.goalContributions
                    ? Math.min(100, Math.round((c.currentContributions / c.goalContributions) * 100))
                    : 0;
                  const lugar = [c.locationCity, c.locationState].filter(Boolean).join(", ");
                  return (
                    // Ver el detalle y aportar requiere sesión: sin ella, proxy.ts manda a /entrar.
                    <Link key={c.id} href={`/campanas/${c.id}`}>
                      <Card className="flex h-full flex-col transition-colors hover:border-accent">
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <p className="text-[15px] font-bold text-ink">{c.name}</p>
                          <Tag tone="ok">Activa</Tag>
                        </div>
                        <p className="text-[12.5px] text-ink-2">
                          {c.organizer || "Sin organización"}
                          {lugar ? ` · ${lugar}` : ""}
                        </p>
                        <p className="mt-2 text-[13px] leading-snug text-ink-2">
                          {c.description.length > 140 ? `${c.description.slice(0, 140)}…` : c.description}
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {c.tematica && <Tag>{c.tematica}</Tag>}
                          {c.dataTypes.map((dt) => (
                            <Tag key={dt}>{DATA_TYPE_LABELS[dt as DataType] ?? dt}</Tag>
                          ))}
                        </div>
                        <div className="mt-auto pt-3">
                          <ProgressBar pct={pct} tone="ok" />
                          <p className="mt-2 font-mono text-[11px] text-ink-3">
                            {nf.format(c.participants)} participantes · {pct}% de la meta ·{" "}
                            {textoDeCierre(c.daysRemaining)}
                          </p>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
