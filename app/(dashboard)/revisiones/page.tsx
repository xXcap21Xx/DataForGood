"use client";

import { useEffect, useState } from "react";
import Tag from "@/components/ui/Tag";
import Button from "@/components/ui/Button";
import type { Contribution } from "@/types";

type ReviewCampaign = {
  id: string;
  name: string;
  description: string;
  tag: string;
  pendingContributions: number;
  participants: number;
};

export default function RevisionesPage() {
  const [campaigns, setCampaigns] = useState<ReviewCampaign[]>([]);
  const [contributions, setContributions] = useState<Record<string, Contribution[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/revisiones", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error ?? "No se pudieron cargar las campañas");

        const rows = Array.isArray(payload.data) ? payload.data as ReviewCampaign[] : [];
        const entries = await Promise.all(rows.map(async (campaign) => {
          const aportesResponse = await fetch(`/api/aportes?campaignId=${campaign.id}&reviewer=true`, { cache: "no-store" });
          const aportesPayload = await aportesResponse.json().catch(() => ({}));
          return [campaign.id, Array.isArray(aportesPayload.data) ? aportesPayload.data as Contribution[] : []] as const;
        }));

        setCampaigns(rows);
        setContributions(Object.fromEntries(entries));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudieron cargar las campañas");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  async function acceptContribution(contributionId: string) {
    setActionId(contributionId);
    setError(null);
    const response = await fetch(`/api/aportes/${contributionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "espera_final" }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error ?? "No se pudo aceptar el aporte");
    } else {
      setContributions((current) => Object.fromEntries(
        Object.entries(current).map(([campaignId, items]) => [
          campaignId,
          items.map((item) => item.id === contributionId ? { ...item, status: "espera_final", firstPassBy: "Tú" } : item),
        ])
      ));
    }
    setActionId(null);
  }

  if (loading) return <div className="mx-auto max-w-4xl text-[13px] text-ink-2">Cargando campañas de revisión…</div>;
  if (error && campaigns.length === 0) return <div className="mx-auto max-w-4xl rounded-lg border border-danger/30 bg-danger-tint p-4 text-sm text-danger">{error}</div>;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">Revisor de aportes</p>
        <h1 className="mt-2 text-2xl font-extrabold text-ink">Campañas asignadas</h1>
        <p className="mt-1 text-[13px] text-ink-2">Valida los aportes pendientes para que el creador haga la aprobación final.</p>
      </div>

      {error && <p className="mb-4 rounded border border-danger bg-danger-tint p-3 text-[12.5px] text-danger">{error}</p>}

      {campaigns.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line-2 p-6 text-sm text-ink-2">No tienes campañas asignadas para revisar.</div>
      ) : (
        <div className="space-y-5">
          {campaigns.map((campaign) => {
            const pending = (contributions[campaign.id] ?? []).filter((item) => item.status === "pendiente");
            return (
              <section key={campaign.id} className="rounded-lg border border-line bg-surface p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-extrabold text-ink">{campaign.name}</h2>
                    <p className="mt-1 text-[12.5px] text-ink-2">{campaign.tag} · {campaign.participants} participantes</p>
                  </div>
                  <Tag tone="warn">{pending.length} pendientes</Tag>
                </div>

                {pending.length === 0 ? (
                  <p className="text-[13px] text-ink-2">No hay aportes pendientes de validación.</p>
                ) : (
                  <div className="space-y-3">
                    {pending.map((item) => (
                      <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-line bg-sunken p-3">
                        <div>
                          <p className="text-[13px] font-semibold text-ink">{item.participantName}</p>
                          <p className="mt-1 text-[12px] text-ink-2">{item.description}</p>
                        </div>
                        <Button size="sm" variant="primary" disabled={actionId === item.id} onClick={() => void acceptContribution(item.id)}>
                          {actionId === item.id ? "Aceptando…" : "Aceptar aporte"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
