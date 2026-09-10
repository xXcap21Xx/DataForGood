"use client";

import Link from "next/link";
import { useState } from "react";
import { campaigns, contributions, currentUser } from "@/data/screensData";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import Tag from "@/components/ui/Tag";

export default function MisAportesPage() {
  const [activeFilter, setActiveFilter] = useState("Todas");
  const [favorites, setFavorites] = useState<string[]>([]);
  const totalContributions = contributions.length;
  const campaignsWithContributions = campaigns.filter((c) =>
    contributions.some((ct) => ct.campaignId === c.id)
  );

  const campaignSummaries = campaignsWithContributions.map((campaign) => {
    const campaignContributions = contributions.filter((c) => c.campaignId === campaign.id);
    const usedQuota = campaignContributions.length;
    const quotaComplete = usedQuota >= campaign.quotaPerUser;

    return {
      campaign,
      campaignContributions,
      usedQuota,
      quotaComplete,
      canContribute: campaign.status === "activa" && !quotaComplete,
    };
  });

  const filters = [
    { label: "Todas", count: campaignSummaries.length },
    { label: "Puedo aportar", count: campaignSummaries.filter((item) => item.canContribute).length },
    { label: "Cuota completa", count: campaignSummaries.filter((item) => item.quotaComplete).length },
    { label: "Finalizadas", count: campaignSummaries.filter((item) => item.campaign.status === "finalizada").length },
    { label: "Favoritos", count: favorites.length },
  ];

  const visibleSummaries = campaignSummaries.filter(({ campaign, canContribute, quotaComplete }) => {
    if (activeFilter === "Puedo aportar") return canContribute;
    if (activeFilter === "Cuota completa") return quotaComplete;
    if (activeFilter === "Finalizadas") return campaign.status === "finalizada";
    if (activeFilter === "Favoritos") return favorites.includes(campaign.id);
    return true;
  });

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Mis aportes</h1>
          <p className="mt-1 text-[13px] text-ink-2">
            {totalContributions} aportes en {campaignsWithContributions.length} campañas
            · {currentUser.xpTotal.toLocaleString("es-MX")} XP acumulados · nivel{" "}
            {currentUser.level}
          </p>
        </div>
        <Link href="/campanas">
          <Button variant="primary" size="sm">
            Explorar campañas
          </Button>
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter.label}
            type="button"
            onClick={() => setActiveFilter(filter.label)}
            className={`rounded-pill border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
              activeFilter === filter.label
                ? "border-accent bg-accent text-white"
                : "border-line-2 bg-surface text-ink-2 hover:border-accent"
            }`}
          >
            {filter.label} <span className="ml-1 font-mono">{filter.count}</span>
          </button>
        ))}
      </div>

      {visibleSummaries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line-2 bg-surface p-8 text-center">
          <p className="text-sm font-semibold text-ink">No hay campañas en este filtro.</p>
          <p className="mt-1 text-[13px] text-ink-2">Explora campañas para encontrar nuevos proyectos.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {visibleSummaries.map(({ campaign, campaignContributions, usedQuota, quotaComplete, canContribute }) => {
          const accepted = campaignContributions.filter((c) => c.status === "aceptado").length;
          const pending = campaignContributions.filter((c) => c.status === "pendiente").length;
          const rejected = campaignContributions.filter((c) => c.status === "rechazado").length;
          const pct = Math.round((usedQuota / campaign.quotaPerUser) * 100);

          return (
            <div key={campaign.id} className={`rounded-lg border bg-surface p-4 ${quotaComplete ? "border-ok" : "border-line"}`}>
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <div>
                  <p className="text-[15px] font-bold text-ink">{campaign.name}</p>
                  <p className="text-[12.5px] text-ink-2">{campaign.tag} · {new Date(campaign.startDate).toLocaleDateString("es-MX", { day: "numeric", month: "short" })} – {new Date(campaign.endDate).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" aria-label={favorites.includes(campaign.id) ? "Quitar de favoritos" : "Guardar en favoritos"} onClick={() => setFavorites((current) => current.includes(campaign.id) ? current.filter((id) => id !== campaign.id) : [...current, campaign.id])} className="text-lg leading-none text-ink-3 hover:text-danger">
                    {favorites.includes(campaign.id) ? "♥" : "♡"}
                  </button>
                  <Tag tone={campaign.status === "activa" ? "ok" : "default"}>
                    {campaign.status === "activa" ? "Activa" : "Finalizada"}
                  </Tag>
                </div>
              </div>

              <div className="my-3">
                <ProgressBar pct={pct} />
                <p className="mt-1.5 font-mono text-[12px] text-ink-2">
                  {usedQuota} / {campaign.quotaPerUser}
                </p>
              </div>

              <p className="mb-3 text-[12.5px] text-ink-2">
                {quotaComplete ? <>Alcanzaste tu cuota · <b className="text-ok">bono de 300 XP otorgado</b>.</> : <>Tu cuota permite <b>{campaign.quotaPerUser - usedQuota} aportes más</b> en esta campaña.</>}
              </p>

              <div className="mb-3 flex gap-5">
                <div>
                  <p className="font-mono text-[15px] font-bold text-ok">{accepted}</p>
                  <p className="text-[11px] text-ink-3">aceptados</p>
                </div>
                <div>
                  <p className="font-mono text-[15px] font-bold text-warn">{pending}</p>
                  <p className="text-[11px] text-ink-3">pendientes</p>
                </div>
                <div>
                  <p className="font-mono text-[15px] font-bold text-ink">{rejected}</p>
                  <p className="text-[11px] text-ink-3">rechazados</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Link href={`/mis-aportes/${campaign.id}`} className="flex-1">
                  <Button size="sm" className="w-full">
                    Ver mis aportes
                  </Button>
                </Link>
                {canContribute ? (
                  <Link href={`/campanas/${campaign.id}/aportar`} className="flex-1">
                    <Button variant="primary" size="sm" className="w-full">
                      Aportar
                    </Button>
                  </Link>
                ) : (
                  <Tag tone={quotaComplete ? "ok" : "default"}>{quotaComplete ? "Cuota completa" : "Cerrada"}</Tag>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}
      <p className="mt-5 rounded-lg border border-line bg-surface p-3 text-[12px] text-ink-2">
        Un aporte rechazado no libera espacio en la cuota: cuenta como enviado. Solo eliminarlo mientras la campaña siga vigente devuelve el cupo.
      </p>
    </div>
  );
}
