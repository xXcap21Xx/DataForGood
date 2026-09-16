"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import Tag from "@/components/ui/Tag";
import type { Campaign } from "@/types";

export default function MisAportesPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filter, setFilter] = useState("Todas");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCampaigns() {
      try {
        const response = await fetch("/api/campanas?misAportes=true", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error ?? "No se pudieron cargar las campañas");
        setCampaigns(Array.isArray(payload.data) ? payload.data as Campaign[] : []);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudieron cargar las campañas");
      }
    }
    void loadCampaigns();
  }, []);

  const visible = campaigns.filter((campaign) => {
    if (filter === "Puedo aportar") return campaign.status === "activa";
    if (filter === "Finalizadas") return campaign.status === "finalizada";
    return true;
  });

  return <div>
    <div className="mb-6 flex items-start justify-between gap-4">
      <div><h1 className="text-2xl font-extrabold text-ink">Mis aportes</h1><p className="mt-1 text-[13px] text-ink-2">Campañas en las que ya aportaste o que guardaste para después.</p></div>
      <Link href="/campanas"><Button variant="primary" size="sm">Explorar campañas</Button></Link>
    </div>
    <div className="mb-6 flex flex-wrap gap-2">{["Todas", "Puedo aportar", "Finalizadas"].map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`rounded-pill border px-3.5 py-1.5 text-[13px] font-semibold ${filter === item ? "border-accent bg-accent text-white" : "border-line-2 bg-surface text-ink-2"}`}>{item}</button>)}</div>
    {error ? <p className="rounded-lg bg-danger-tint p-4 text-sm text-danger">{error}</p> : visible.length === 0 ? <p className="rounded-lg border border-dashed border-line-2 p-6 text-sm text-ink-2">Todavía no aportaste ni guardaste ninguna campaña.</p> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{visible.map((campaign) => {
      const pct = campaign.goalContributions > 0 ? Math.min(100, Math.round(campaign.currentContributions / campaign.goalContributions * 100)) : 0;
      const canContribute = campaign.status === "activa";
      return <div key={campaign.id} className="rounded-lg border border-line bg-surface p-4"><div className="mb-1.5 flex items-start justify-between gap-2"><div><p className="text-[15px] font-bold text-ink">{campaign.name}</p><p className="text-[12.5px] text-ink-2">{campaign.tag} · {campaign.locationCity}, {campaign.locationState}</p></div><Tag tone={canContribute ? "ok" : "default"}>{canContribute ? "Activa" : campaign.status}</Tag></div><p className="mb-3 text-[12.5px] text-ink-2">{campaign.description}</p><ProgressBar pct={pct} /><p className="my-2.5 font-mono text-[12px] text-ink-2">{campaign.currentContributions} de {campaign.goalContributions} aportes · cuota: {campaign.quotaPerUser}</p><div className="flex gap-2"><Link href={`/campanas/${campaign.id}`} className="flex-1"><Button size="sm" className="w-full">Ver campaña</Button></Link>{canContribute && <Link href={`/campanas/${campaign.id}/aportar`} className="flex-1"><Button variant="primary" size="sm" className="w-full">Aportar</Button></Link>}</div></div>;
    })}</div>}
  </div>;
}