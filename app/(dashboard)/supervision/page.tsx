"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Tag from "@/components/ui/Tag";

type CampaignApiItem = {
  id: string;
  creatorId: string;
  creatorName: string;
  name: string;
  tag?: string;
  tematica?: string;
  status: string;
  latestSupervisionAction?: "aceptada" | "rechazada" | "reportada" | "reasignada" | null;
  currentContributions?: number;
  goalContributions?: number;
  participants?: number;
};

type TabKey = "pending" | "supervised" | "finished" | "flagged";

export default function SupervisionPage() {
  const [pendingCampaigns, setPendingCampaigns] = useState<CampaignApiItem[]>([]);
  const [supervisedCampaigns, setSupervisedCampaigns] = useState<CampaignApiItem[]>([]);
  const [finishedCampaigns, setFinishedCampaigns] = useState<CampaignApiItem[]>([]);
  const [flaggedCampaigns, setFlaggedCampaigns] = useState<CampaignApiItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [campaignsResponse, supervisedResponse, sessionResponse] = await Promise.all([
          fetch("/api/campanas", { cache: "no-store" }),
          fetch("/api/campanas?supervised=true", { cache: "no-store" }),
          fetch("/api/auth/sesion", { cache: "no-store" }),
        ]);

        if (!campaignsResponse.ok) {
          throw new Error("No se pudieron cargar las campañas");
        }

        if (!supervisedResponse.ok) {
          throw new Error("No se pudieron cargar las campañas supervisadas");
        }

        const campaignsPayload = await campaignsResponse.json();
        const supervisedPayload = await supervisedResponse.json();
        const sessionPayload = await sessionResponse.json().catch(() => ({ data: null }));
        const userId = sessionPayload?.data?.id ? String(sessionPayload.data.id) : null;

        const rows = Array.isArray(campaignsPayload?.data) ? campaignsPayload.data : [];
        const supervisedRows = Array.isArray(supervisedPayload?.data) ? supervisedPayload.data : [];
        const visible = rows.filter((campaign: CampaignApiItem) => {
          const isPending = String(campaign.status ?? "") === "en_revision";
          const isOwn = userId !== null && String(campaign.creatorId ?? "") === userId;
          return isPending && !isOwn;
        });

        setPendingCampaigns(visible);
        const supervised = supervisedRows as CampaignApiItem[];
        setSupervisedCampaigns(supervised.filter((campaign) => String(campaign.status ?? "") === "activa"));
        setFinishedCampaigns(supervised.filter((campaign) => String(campaign.status ?? "") === "finalizada"));
        setFlaggedCampaigns(supervised.filter((campaign) =>
          campaign.latestSupervisionAction === "reportada" || String(campaign.status ?? "") === "rechazada"
        ));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudieron cargar las campañas");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const pendingCount = useMemo(() => pendingCampaigns.length, [pendingCampaigns]);
  const supervisedCount = useMemo(() => supervisedCampaigns.length, [supervisedCampaigns]);
  const finishedCount = useMemo(() => finishedCampaigns.length, [finishedCampaigns]);
  const flaggedCount = useMemo(() => flaggedCampaigns.length, [flaggedCampaigns]);

  const renderPendingList = () => (
    <>
      <div className="mb-3 rounded-lg border border-line bg-sunken px-4 py-3 text-[13px] text-ink-2">
        Selecciona una campaña para ver su detalle. Desde ahí podrás consultar a sus participantes y el panel de campaña.
      </div>

      <div className="space-y-3">
        {pendingCampaigns.length === 0 ? (
          <div className="rounded-lg border border-line bg-surface p-5 text-[13px] text-ink-2">
            No hay campañas pendientes por revisar.
          </div>
        ) : (
          pendingCampaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/supervision/${campaign.id}`}
              className="block rounded-lg border border-line bg-surface p-5 shadow-sm transition-shadow hover:border-accent hover:shadow-md"
            >
              <div className="mb-1.5 flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-[15px] font-extrabold text-ink">{campaign.name}</h2>
                <Tag tone="warn">En revisión</Tag>
              </div>
              <p className="text-[12.5px] text-ink-3">
                {(campaign.creatorName || "Usuario")} · {(campaign.tag || campaign.tematica || "Sin temática")} · meta {Number(campaign.goalContributions ?? 0)} aportes
              </p>
            </Link>
          ))
        )}
      </div>
    </>
  );

  const renderSupervisedList = () => (
    <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-line bg-sunken px-4 py-3">
        <p className="text-[13px] font-semibold text-ink">Campañas que estás supervisando</p>
        <Tag tone="ok">{supervisedCount}</Tag>
      </div>

      {supervisedCampaigns.length === 0 ? (
        <div className="p-5 text-[13px] text-ink-2">Todavía no tienes campañas aceptadas bajo supervisión.</div>
      ) : (
        <div className="divide-y divide-line">
          {supervisedCampaigns.map((campaign) => {
            const progress = Number(campaign.goalContributions ?? 0) > 0
              ? `${Number(campaign.currentContributions ?? 0)} / ${Number(campaign.goalContributions ?? 0)}`
              : "0 / 0";
            const percent = Number(campaign.goalContributions ?? 0) > 0
              ? `${Math.min(100, Math.round((Number(campaign.currentContributions ?? 0) / Number(campaign.goalContributions ?? 1)) * 100))}%`
              : "0%";

            return (
              <div key={campaign.id} className="p-4">
                <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[15px] font-extrabold text-ink">{campaign.name}</h3>
                    <p className="text-[12.5px] text-ink-3">{campaign.tag || campaign.tematica || "Sin temática"}</p>
                  </div>
                  <Tag tone="ok">Activa</Tag>
                </div>

                <div className="flex items-center justify-between gap-4 text-[12px] text-ink-2">
                  <span>Progreso</span>
                  <span className="font-mono">{progress}</span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-pill bg-sunken">
                  <div className="h-full rounded-pill bg-ok" style={{ width: percent }} />
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-ink-2">
                  <span>{Number(campaign.participants ?? 0)} participantes</span>
                  <Link href={`/supervision/${campaign.id}`} className="font-bold text-accent">Ver detalle</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderFlaggedList = () => (
    <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-line bg-sunken px-4 py-3">
        <p className="text-[13px] font-semibold text-ink">Campañas reportadas o rechazadas</p>
        <Tag tone="danger">{flaggedCount}</Tag>
      </div>

      {flaggedCampaigns.length === 0 ? (
        <div className="p-5 text-[13px] text-ink-2">No tienes campañas reportadas o rechazadas.</div>
      ) : (
        <div className="divide-y divide-line">
          {flaggedCampaigns.map((campaign) => {
            const isReported = campaign.latestSupervisionAction === "reportada";
            return (
              <div key={campaign.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <h3 className="text-[15px] font-extrabold text-ink">{campaign.name}</h3>
                  <p className="text-[12.5px] text-ink-3">
                    {campaign.creatorName || "Usuario"} · {campaign.tag || campaign.tematica || "Sin temática"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Tag tone={isReported ? "warn" : "danger"}>{isReported ? "Reportada" : "Rechazada"}</Tag>
                  <Link href={`/supervision/${campaign.id}`} className="font-bold text-accent">Ver detalle</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderFinishedList = () => (
    <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-line bg-sunken px-4 py-3">
        <p className="text-[13px] font-semibold text-ink">Campañas finalizadas</p>
        <Tag>{finishedCount}</Tag>
      </div>

      {finishedCampaigns.length === 0 ? (
        <div className="p-5 text-[13px] text-ink-2">Todavía no tienes campañas finalizadas.</div>
      ) : (
        <div className="divide-y divide-line">
          {finishedCampaigns.map((campaign) => (
            <div key={campaign.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <h3 className="text-[15px] font-extrabold text-ink">{campaign.name}</h3>
                <p className="text-[12.5px] text-ink-3">
                  {campaign.creatorName || "Usuario"} · {campaign.tag || campaign.tematica || "Sin temática"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Tag>Finalizada</Tag>
                <Link href={`/supervision/${campaign.id}`} className="font-bold text-accent">Ver detalle</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return <div className="mx-auto max-w-4xl text-[13px] text-ink-2">Cargando campañas por supervisar…</div>;
  }

  if (error) {
    return <div className="mx-auto max-w-4xl rounded-lg border border-danger/30 bg-danger-tint p-4 text-sm text-danger">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">Supervisión</p>
          <h1 className="mt-2 text-2xl font-extrabold text-ink">
            {activeTab === "pending" ? "Campañas por supervisar" : activeTab === "supervised" ? "Campañas supervisadas" : activeTab === "finished" ? "Campañas finalizadas" : "Campañas reportadas / rechazadas"}
          </h1>
          <p className="mt-1 text-[13px] text-ink-2">
            {activeTab === "pending" ? `${pendingCount} esperando revisión` : activeTab === "supervised" ? `${supervisedCount} bajo supervisión` : activeTab === "finished" ? `${finishedCount} finalizadas` : `${flaggedCount} con incidencia`}
          </p>
        </div>
        <span className="rounded-pill border border-line-2 bg-surface px-4 py-2 text-[12.5px] font-bold text-ink-2">Temática ▾</span>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={activeTab === "pending" ? "rounded-pill bg-accent px-4 py-2 text-[12.5px] font-bold text-white shadow-sm" : "rounded-pill border border-line-2 bg-surface px-4 py-2 text-[12.5px] font-bold text-ink-2"}
        >
          Por supervisar&nbsp; <span className="font-mono text-[11px]">{pendingCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("supervised")}
          className={activeTab === "supervised" ? "rounded-pill bg-accent px-4 py-2 text-[12.5px] font-bold text-white shadow-sm" : "rounded-pill border border-line-2 bg-surface px-4 py-2 text-[12.5px] font-bold text-ink-2"}
        >
          Campañas supervisadas&nbsp; <span className="font-mono text-[11px]">{supervisedCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("flagged")}
          className={activeTab === "flagged" ? "rounded-pill bg-accent px-4 py-2 text-[12.5px] font-bold text-white shadow-sm" : "rounded-pill border border-line-2 bg-surface px-4 py-2 text-[12.5px] font-bold text-ink-2"}
        >
          Campañas reportadas / rechazadas&nbsp; <span className="font-mono text-[11px]">{flaggedCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("finished")}
          className={activeTab === "finished" ? "rounded-pill bg-accent px-4 py-2 text-[12.5px] font-bold text-white shadow-sm" : "rounded-pill border border-line-2 bg-surface px-4 py-2 text-[12.5px] font-bold text-ink-2"}
        >
          Campañas finalizadas&nbsp; <span className="font-mono text-[11px]">{finishedCount}</span>
        </button>
      </div>

      {activeTab === "pending" ? renderPendingList() : activeTab === "supervised" ? renderSupervisedList() : activeTab === "finished" ? renderFinishedList() : renderFlaggedList()}
    </div>
  );
}
