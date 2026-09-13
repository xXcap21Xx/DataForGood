import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampaignById } from "@/data/screensData";
import Tag from "@/components/ui/Tag";
import MetricCard from "@/components/ui/MetricCard";
import ProgressBar from "@/components/ui/ProgressBar";

const DAILY_COLLECTION = [30, 40, 52, 46, 66, 82, 75, 60, 70, 86, 96, 80, 91, 104];

export default async function PanelCampanaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = getCampaignById(id);
  if (!campaign) notFound();

  const isFinished = campaign.status === "finalizada";
  const pct = Math.round(
    (campaign.currentContributions / campaign.goalContributions) * 100
  );
  const maxDaily = Math.max(...DAILY_COLLECTION);

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/mis-campanas"
        className="mb-4 inline-block text-[13px] text-ink-2 hover:text-ink"
      >
        ← Volver a mis campañas
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-ink">{campaign.name}</h1>
          <p className="mt-1 font-mono text-[13px] text-ink-2">
            {campaign.startDate && new Date(campaign.startDate).toLocaleDateString("es-MX", {
              day: "numeric",
              month: "short",
            })}{" "}
            –{" "}
            {campaign.endDate && new Date(campaign.endDate).toLocaleDateString("es-MX", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}{" "}
            · {campaign.status}
          </p>
        </div>
        <Tag tone={isFinished ? "default" : "ok"}>
          {isFinished ? "Solo lectura" : "En vivo · actualiza cada 3 s"}
        </Tag>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Aportes aprobados" value={campaign.approvedContributions} />
        <MetricCard label="Participantes" value={campaign.participants} />
        {isFinished ? (
          <MetricCard label="Meta alcanzada" value="100%" />
        ) : (
          <MetricCard label="Pendientes" value={campaign.pendingContributions} />
        )}
        <MetricCard label="Meta" value={`${pct}%`} />
      </div>

      {!isFinished && (
        <>
          <p className="mb-3 text-[12.5px] font-medium text-ink">Recolección diaria</p>
          <div className="mb-8 flex h-32 items-end gap-1.5 border-b border-line">
            {DAILY_COLLECTION.map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-accent"
                style={{ height: `${(v / maxDaily) * 100}%` }}
              />
            ))}
          </div>
        </>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-3 text-[12.5px] font-medium text-ink">
            {isFinished ? "Resultado por tipo de dato" : "Por tipo de dato"}
          </p>
          <div className="mb-2.5 flex items-center gap-2.5 text-[12.5px]">
            <span className="w-16 flex-none text-ink-2">Foto</span>
            <div className="flex-1">
              <ProgressBar pct={92} />
            </div>
            <span className="w-8 text-right font-mono">
              {Math.round(campaign.approvedContributions * 0.92)}
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-[12.5px]">
            <span className="w-16 flex-none text-ink-2">Texto</span>
            <div className="flex-1">
              <ProgressBar pct={8} />
            </div>
            <span className="w-8 text-right font-mono">
              {Math.round(campaign.approvedContributions * 0.08)}
            </span>
          </div>
        </div>

        <div>
          <p className="mb-3 text-[12.5px] font-medium text-ink">
            {isFinished ? "Cierre" : "Progreso hacia la meta"}
          </p>
          {isFinished ? (
            <div className="flex flex-col gap-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-ink-2">Meta</span>
                <span className="font-mono font-medium text-ink">
                  {campaign.approvedContributions} de {campaign.goalContributions}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-2">Cerrada el</span>
                <span className="font-mono font-medium text-ink">
                  {campaign.endDate && new Date(campaign.endDate).toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          ) : (
            <>
              <ProgressBar pct={pct} tone="ok" />
              <div className="my-3 flex justify-between font-mono text-[12.5px] text-ink-2">
                <span>
                  {campaign.currentContributions} de {campaign.goalContributions} aportes
                </span>
                <span>{campaign.daysRemaining} días restantes</span>
              </div>
              <div className="rounded-lg bg-sunken p-3.5 text-[12px] leading-relaxed text-ink-2">
                Al ritmo actual, la meta se alcanza antes de la fecha de cierre.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
