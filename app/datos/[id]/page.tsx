import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import ButtonLink from "@/components/ui/ButtonLink";
import Card from "@/components/ui/Card";
import Tag from "@/components/ui/Tag";
import { DATA_TYPE_LABELS, obtenerConjuntoAbierto } from "@/lib/open-data";

export const revalidate = 300;

const nf = new Intl.NumberFormat("es-MX");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const conjunto = await obtenerConjuntoAbierto(id);
  if (!conjunto) return { title: "Conjunto no encontrado" };
  return {
    title: conjunto.name,
    description: conjunto.description || undefined,
  };
}

export default async function ConjuntoAbiertoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const conjunto = await obtenerConjuntoAbierto(id);
  if (!conjunto) notFound();

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-14">
        <Link href="/datos" className="text-[12.5px] font-medium text-accent hover:underline">
          ← Volver al catálogo
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-ink">
              {conjunto.name}
            </h1>
            {conjunto.verified && <Tag tone="ok">Verificado</Tag>}
          </div>
          <Tag tone="ok">{nf.format(conjunto.approvedContributions)} aportes aprobados</Tag>
        </div>
        <p className="mt-2 text-[13.5px] text-ink-2">
          {conjunto.organizer || "Sin organización"}
          {conjunto.closedAt
            ? ` · cerró el ${new Date(conjunto.closedAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}`
            : ""}
        </p>

        {conjunto.description && (
          <p className="mt-5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
            {conjunto.description}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-1.5">
          <Tag>{conjunto.tematica || "Sin temática"}</Tag>
          <Tag>{conjunto.license}</Tag>
          {(conjunto.locationCity || conjunto.locationState) && (
            <Tag>{[conjunto.locationCity, conjunto.locationState].filter(Boolean).join(", ")}</Tag>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <p className="text-[11px] text-ink-2">Tamaño</p>
            <p className="font-mono text-[15px] font-bold text-ink">{conjunto.sizeLabel}</p>
          </Card>
          <Card>
            <p className="text-[11px] text-ink-2">Descargas</p>
            <p className="font-mono text-[15px] font-bold text-ink">{nf.format(conjunto.downloads)}</p>
          </Card>
          <Card>
            <p className="text-[11px] text-ink-2">Calidad</p>
            <p className="font-mono text-[15px] font-bold text-ink">
              {conjunto.quality != null ? `${conjunto.quality.toFixed(1)}/10` : "—"}
            </p>
          </Card>
          <Card>
            <p className="text-[11px] text-ink-2">Formatos</p>
            <p className="font-mono text-[15px] font-bold text-ink">{conjunto.formats.length || "—"}</p>
          </Card>
        </div>

        <Card className="mt-4">
          <p className="mb-3 text-[13px] font-semibold text-ink">Tipos de dato incluidos</p>
          <div className="flex flex-wrap gap-1.5">
            {conjunto.dataTypes.length > 0 ? (
              conjunto.dataTypes.map((dt) => <Tag key={dt}>{DATA_TYPE_LABELS[dt] ?? dt}</Tag>)
            ) : (
              <p className="text-[12.5px] text-ink-3">Sin especificar</p>
            )}
          </div>
        </Card>

        <Card className="mt-4 bg-sunken">
          <p className="text-[13px] font-semibold text-ink">Descarga del conjunto</p>
          {conjunto.sizeBytes > 0 ? (
            <>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
                ZIP con los archivos de los aportes aprobados ({conjunto.formats.join(", ")}),
                renombrados sin nombre ni correo de quien participó. {conjunto.sizeLabel} en total.
              </p>
              <ButtonLink
                href={`/api/datos/${conjunto.id}/descarga`}
                variant="primary"
                className="mt-3 inline-flex"
              >
                Descargar ZIP ({conjunto.sizeLabel})
              </ButtonLink>
            </>
          ) : (
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
              Los aportes aprobados de esta campaña no tienen archivo asociado (por ejemplo, si
              fueron de texto), así que todavía no hay un ZIP que descargar.
            </p>
          )}
        </Card>
      </main>

      <PublicFooter />
    </div>
  );
}
