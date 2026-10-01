// Pantalla /supervisar/[campaignId]: revisar una campaña y dictaminar como SuperUsuario.
// Server Component. Datos: obtenerCampanaParaRoot(). Botones en acciones.tsx.

import Link from "next/link";
import { notFound } from "next/navigation";
import Tag from "@/components/ui/Tag";
import { obtenerCampanaParaRoot } from "@/lib/supervision/root";
import { BackLink } from "../_ui";
import AccionesDeSupervision from "./acciones";

const statusMap = {
  en_revision: { label: "En revisión", tone: "warn" },
  aceptada: { label: "Aceptada", tone: "warn" },
  activa: { label: "Activa", tone: "ok" },
  rechazada: { label: "Rechazada", tone: "danger" },
  borrador: { label: "Borrador", tone: "default" },
  finalizada: { label: "Finalizada", tone: "default" },
  pausada: { label: "Pausada", tone: "default" },
} as const;

function formatDate(date: string | null) {
  if (!date) return "sin fecha";
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return "sin fecha";
  return new Date(year, month - 1, day).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function SupervisarCampanaPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const campaign = await obtenerCampanaParaRoot(campaignId);
  if (!campaign) notFound();

  const currentStatus = statusMap[campaign.status as keyof typeof statusMap] ?? { label: "En revisión", tone: "warn" };
  const dataTypes = campaign.dataTypes.length > 0 ? campaign.dataTypes : ["texto"];
  const location = [campaign.locationColonia, campaign.locationCity, campaign.locationState].filter(Boolean).join(", ") || "Sin ubicación";

  const filas: [string, React.ReactNode][][] = [
    [
      ["Usuario de la campaña", <span key="c" className="font-semibold">{campaign.creatorName || "Usuario"}</span>],
      ["Organizador", campaign.organizer || "Sin especificar"],
      ["Temática", campaign.tag || "Sin temática"],
      ["Estado", <Tag key="s" tone={currentStatus.tone}>{currentStatus.label}</Tag>],
      ["Tipo de aporte", dataTypes.join(" y ")],
    ],
    [
      ["Ubicación", location],
      ["Periodo", <span key="p" className="font-mono">{formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}</span>],
      ["Progreso", <span key="g" className="font-mono">{campaign.currentContributions} / {campaign.goalContributions} aportes</span>],
      ["Participantes", <span key="n" className="font-mono">{campaign.participants}</span>],
      ["Cuota por usuario", <span key="q" className="font-mono">{campaign.quotaPerUser}</span>],
    ],
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink href="/supervisar">Volver a supervisar</BackLink>

      <AccionesDeSupervision
        campaignId={campaign.id}
        status={campaign.status}
        supervision={campaign.supervision}
        encabezado={
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">Detalle de campaña</p>
            <h1 className="mt-2 text-2xl font-extrabold text-ink">{campaign.name}</h1>
            <p className="mt-1 text-[13px] text-ink-2">
              {campaign.tag || "Sin temática"} · creada por {campaign.creatorName || "Usuario"} · meta {campaign.goalContributions} aportes
            </p>
          </div>
        }
      />

      <div className="mb-5 rounded-lg border border-line bg-sunken p-4 text-[13px] text-ink-2">
        La decisión queda registrada como tomada por el SuperUsuario.
      </div>

      <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
        <p className="text-[13.5px] leading-6 text-ink-2">{campaign.description}</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {filas.map((columna, i) => (
            <div key={i} className="space-y-3">
              {columna.map(([etiqueta, valor]) => (
                <div key={etiqueta} className="flex justify-between gap-4 border-b border-line pb-3 text-[13px]">
                  <span className="text-ink-2">{etiqueta}</span>
                  <span className="text-right">{valor}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {(campaign.status === "activa" || campaign.status === "finalizada") && (
            <Link href={`/supervisar/${campaign.id}/usuarios`} className="rounded-pill bg-accent px-5 py-3 text-[12.5px] font-bold text-white shadow-sm hover:bg-accent-deep">
              Ver participantes
            </Link>
          )}
          {campaign.supervision === "mia" && (
            <Link href={`/supervisar/${campaign.id}/panel`} className="rounded-pill border border-line-2 bg-surface px-5 py-3 text-[12.5px] font-bold text-ink-2 hover:border-accent hover:text-accent">
              Abrir panel
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
