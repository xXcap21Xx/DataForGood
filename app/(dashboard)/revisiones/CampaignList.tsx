"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Tag from "@/components/ui/Tag";

type ReviewCampaign = {
  id: string;
  name: string;
  description: string;
  tag: string;
  participants: number;
  status: string;
  pendingContributions: number;
};

export default function CampaignList({ completed = false }: { completed?: boolean }) {
  const [campaigns, setCampaigns] = useState<ReviewCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/revisiones", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error ?? "No se pudieron cargar las campañas");
        const rows = Array.isArray(payload.data) ? payload.data as ReviewCampaign[] : [];
        setCampaigns(rows);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudieron cargar las campañas");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [completed]);

  const activeTab = completed ? "finalizadas" : "curso";
  const title = completed ? "Campañas finalizadas" : "Campañas en curso";
  const currentCount = campaigns.filter((campaign) => campaign.status !== "finalizada").length;
  const completedCount = campaigns.filter((campaign) => campaign.status === "finalizada").length;
  const visibleCampaigns = campaigns.filter((campaign) => completed ? campaign.status === "finalizada" : campaign.status !== "finalizada");

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">Revisor de aportes</p>
        <h1 className="mt-2 text-2xl font-extrabold text-ink">Mis campañas</h1>
        <p className="mt-1 text-[13px] text-ink-2">Administra las campañas que tienes asignadas para revisar.</p>
      </div>

      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Estado de campañas">
        <Link href="/revisiones" className={`rounded-pill border px-4 py-2 text-[13px] font-bold transition-colors ${activeTab === "curso" ? "border-accent bg-accent text-white" : "border-line-2 bg-surface text-ink-2 hover:border-accent"}`}>En curso {currentCount}</Link>
        <Link href="/revisiones/finalizadas" className={`rounded-pill border px-4 py-2 text-[13px] font-bold transition-colors ${activeTab === "finalizadas" ? "border-accent bg-accent text-white" : "border-line-2 bg-surface text-ink-2 hover:border-accent"}`}>Finalizadas {completedCount}</Link>
      </nav>

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold text-ink">{title}</h2>
        {!loading && <Tag tone={completed ? "default" : "on"}>{visibleCampaigns.length}</Tag>}
      </div>

      {loading ? <p className="text-[13px] text-ink-2">Cargando campañas…</p> : error ? <p className="rounded border border-danger bg-danger-tint p-3 text-sm text-danger">{error}</p> : visibleCampaigns.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line-2 p-6 text-sm text-ink-2">No tienes campañas {completed ? "finalizadas" : "en curso"} asignadas.</div>
      ) : (
        <div className="space-y-3">
          {visibleCampaigns.map((campaign) => (
            <Link key={campaign.id} href={`/revisiones/campanas/${campaign.id}`} className="block rounded-lg border border-line bg-surface p-5 shadow-sm transition-colors hover:border-accent">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-[16px] font-extrabold text-ink">{campaign.name}</h3>
                  <p className="mt-1 text-[12.5px] text-ink-2">{campaign.tag || "Sin temática"} · {campaign.participants} participantes</p>
                  {campaign.description && <p className="mt-3 line-clamp-2 max-w-2xl text-[13px] leading-5 text-ink-2">{campaign.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {!completed && <Tag tone="warn">{campaign.pendingContributions} pendientes</Tag>}
                  <span className="text-[12.5px] font-bold text-accent">Abrir campaña →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
