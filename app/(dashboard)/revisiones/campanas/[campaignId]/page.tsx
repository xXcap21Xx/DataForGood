"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Tag from "@/components/ui/Tag";
import type { Campaign, Contribution } from "@/types";

export default function ReviewerCampaignPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [campaignResponse, contributionsResponse] = await Promise.all([
          fetch(`/api/campanas/${campaignId}`, { cache: "no-store" }),
          fetch(`/api/aportes?campaignId=${campaignId}&reviewer=true`, { cache: "no-store" }),
        ]);
        const campaignPayload = await campaignResponse.json().catch(() => ({}));
        const contributionsPayload = await contributionsResponse.json().catch(() => ({}));
        if (!campaignResponse.ok) throw new Error(campaignPayload.error ?? "No se pudo cargar la campaña");
        if (!contributionsResponse.ok) throw new Error(contributionsPayload.error ?? "No se pudieron cargar los aportes");
        setCampaign(campaignPayload.data as Campaign);
        setContributions(Array.isArray(contributionsPayload.data) ? contributionsPayload.data as Contribution[] : []);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudo cargar la campaña");
      }
    }
    if (campaignId) void load();
  }, [campaignId]);

  if (error) return <p className="mx-auto max-w-4xl text-sm text-danger">{error}</p>;
  if (!campaign) return <p className="mx-auto max-w-4xl text-sm text-ink-2">Cargando campaña…</p>;

  const pending = contributions.filter((item) => item.status === "pendiente");
  const accepted = contributions.filter((item) => item.status === "aceptado");

  return (
    <div className="mx-auto max-w-4xl">
      <Link href={campaign.status === "finalizada" ? "/revisiones/finalizadas" : "/revisiones"} className="mb-5 inline-block text-[13px] text-ink-2 hover:text-ink">← Volver a campañas</Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div><p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">Revisor de aportes</p><h1 className="mt-2 text-2xl font-extrabold text-ink">{campaign.name}</h1><p className="mt-1 text-[13px] text-ink-2">{campaign.tag || "Sin temática"} · {campaign.participants} participantes</p></div>
        <Tag tone={campaign.status === "finalizada" ? "default" : "on"}>{campaign.status === "finalizada" ? "Finalizada" : "En curso"}</Tag>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <section className="rounded-lg border border-warn-tint bg-warn-tint p-5"><p className="text-[12px] font-bold uppercase tracking-wide text-warn">Por aceptar</p><p className="mt-2 text-3xl font-extrabold text-ink">{pending.length}</p><p className="mt-1 text-[13px] text-ink-2">Aportes que requieren tu revisión.</p></section>
        <Link href={`/revisiones/campanas/${campaignId}/usuarios`} className="rounded-lg border border-line bg-surface p-5 shadow-sm transition-colors hover:border-accent"><p className="text-[12px] font-bold uppercase tracking-wide text-ok">Aceptados por ti</p><p className="mt-2 text-3xl font-extrabold text-ink">{accepted.length}</p><p className="mt-1 text-[13px] text-ink-2">Explora usuarios y sus aportes aceptados.</p><p className="mt-4 text-[13px] font-bold text-accent">Ver usuarios →</p></Link>
      </div>

      <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-extrabold text-ink">Aportes por aceptar</h2><Tag tone="warn">{pending.length}</Tag></div>
        {pending.length === 0 ? <p className="text-[13px] text-ink-2">No hay aportes pendientes de validación.</p> : <div className="space-y-3">{pending.map((item) => <Link key={item.id} href={`/revisiones/${item.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded border border-line bg-sunken p-3 hover:border-accent"><div><p className="text-[13px] font-semibold text-ink">{item.participantName}</p><p className="mt-1 line-clamp-1 text-[12px] text-ink-2">{item.description}</p></div><span className="text-[12.5px] font-bold text-accent">Revisar aporte →</span></Link>)}</div>}
      </section>
    </div>
  );
}
