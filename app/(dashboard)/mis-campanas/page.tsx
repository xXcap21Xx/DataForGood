import Link from "next/link";
import { getMyCampaigns, currentUser } from "@/data/screensData";
import Button from "@/components/ui/Button";
import Tag from "@/components/ui/Tag";
import ProgressBar from "@/components/ui/ProgressBar";
import type { CampaignStatus } from "@/types";

const STATUS_LABEL: Record<CampaignStatus, string> = {
  borrador: "Borrador",
  en_revision: "En revisión",
  activa: "Activa",
  pausada: "Pausada",
  finalizada: "Finalizada",
  rechazada: "Rechazada",
};

export default function MisCampanasPage() {
  const myCampaigns = getMyCampaigns();
  const activeCount = myCampaigns.filter((c) => c.status === "activa").length;
  const finishedCount = myCampaigns.filter((c) => c.status === "finalizada").length;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Mis campañas</h1>
          <p className="mt-1 text-[13px] text-ink-2">{currentUser.alias}</p>
        </div>
        <Link href="/mis-campanas/nueva">
          <Button variant="primary" size="sm">
            Nueva campaña
          </Button>
        </Link>
      </div>

      <div className="mb-5 mt-4 flex flex-wrap gap-2">
        <Tag tone="on">Activas {activeCount}</Tag>
        <Tag>Finalizadas {finishedCount}</Tag>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {myCampaigns.map((campaign) => {
          const pct =
            campaign.status === "finalizada"
              ? 100
              : Math.round(
                  (campaign.currentContributions / campaign.goalContributions) * 100
                );
          return (
            <div key={campaign.id} className="rounded-lg border border-line bg-surface p-4">
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="text-[13.5px] font-medium text-ink">{campaign.name}</p>
                <Tag tone={campaign.status === "activa" ? "ok" : "default"}>
                  {STATUS_LABEL[campaign.status]}
                </Tag>
              </div>
              <p className="mb-2.5 font-mono text-[11.5px] text-ink-2">
                {new Date(campaign.startDate).toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "short",
                })}{" "}
                –{" "}
                {new Date(campaign.endDate).toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>

              <ProgressBar pct={pct} tone={campaign.status === "finalizada" ? "ok" : "accent"} />

              <p className="my-2.5 font-mono text-[12px] text-ink-2">
                {campaign.currentContributions} / {campaign.goalContributions}
                {campaign.status === "activa" &&
                  ` · ${campaign.pendingContributions} aportes pendientes`}
                {campaign.status === "finalizada" &&
                  ` · cerrada el ${new Date(campaign.endDate).toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "short",
                  })}`}
              </p>

              <div className="flex flex-wrap gap-1.5">
                {campaign.status === "activa" ? (
                  <>
                    <Link href={`/mis-campanas/${campaign.id}/aportes`}>
                      <Button variant="primary" size="sm">
                        Revisar {campaign.pendingContributions} aportes
                      </Button>
                    </Link>
                    <Link href={`/mis-campanas/${campaign.id}/panel`}>
                      <Button size="sm">Panel</Button>
                    </Link>
                    <Link href={`/mis-campanas/nueva?edit=${campaign.id}`}>
                      <Button size="sm">Editar</Button>
                    </Link>
                    <Link href={`/mis-campanas/${campaign.id}/especial`}>
                      <Button size="sm">Hacer especial</Button>
                    </Link>
                    <Link href={`/mis-campanas/${campaign.id}/compartir`}>
                      <Button size="sm">Compartir</Button>
                    </Link>
                    <Button size="sm">Pausar</Button>
                  </>
                ) : (
                  <>
                    <Link href={`/mis-campanas/${campaign.id}/panel`}>
                      <Button size="sm">Ver datos</Button>
                    </Link>
                    <Link href={`/mis-campanas/${campaign.id}/aportes`}>
                      <Button size="sm">Descargar</Button>
                    </Link>
                    <Link href={`/mis-campanas/${campaign.id}/compartir`}>
                      <Button size="sm">Compartir aportes</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-lg bg-sunken p-4">
        <p className="mb-1.5 text-[12px] font-medium text-ink">Transiciones permitidas</p>
        <p className="font-mono text-[11.5px] leading-relaxed text-ink-2">
          Borrador → En revisión → Activa ⇄ Pausada → Finalizada
        </p>
        <p className="mt-1.5 text-[12.5px] text-ink-2">
          Una campaña finalizada pasa a solo lectura y no puede reactivarse.
        </p>
      </div>
    </div>
  );
}
