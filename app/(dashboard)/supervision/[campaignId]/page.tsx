"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Tag from "@/components/ui/Tag";
import { BackLink } from "../_ui";

type Campaign = {
  id: string;
  name: string;
  status?: string;
  tag?: string;
  tematica?: string;
  creatorName?: string;
  goalContributions?: number;
  description?: string;
  dataTypes?: string[];
  endDate?: string | null;
};

export default function CampaignDetailPage() {
  const params = useParams<{ campaignId: string }>();
  const router = useRouter();
  const campaignId = params.campaignId;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCampaign() {
      try {
        const response = await fetch(`/api/campanas?id=${campaignId}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("No se pudo cargar la campaña");
        }

        const payload = await response.json();
        setCampaign(payload?.data ?? null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudo cargar la campaña");
      } finally {
        setLoading(false);
      }
    }

    if (campaignId) {
      void loadCampaign();
    }
  }, [campaignId]);

  async function handleDecision(action: "aceptada" | "rechazada" | "reportada") {
    if (!campaignId) return;

    try {
      setActionLoading(action);
      const response = await fetch(`/api/campanas/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, motivo: "Revisión realizada desde la UI de supervisión" }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo registrar la decisión");
      }

      if (action === "aceptada") {
        router.push("/supervision/campanas");
        return;
      }

      router.push("/supervision");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo registrar la decisión");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-4xl text-[13px] text-ink-2">Cargando campaña…</div>;
  }

  if (error || !campaign) {
    return (
      <div className="mx-auto max-w-4xl">
        <BackLink href="/supervision">Volver a supervisar</BackLink>
        <p className="text-[14px] text-ink-2">{error ?? "No se encontró la campaña."}</p>
      </div>
    );
  }

  const statusMap = {
    en_revision: { label: "En revisión", tone: "warn" },
    activa: { label: "Activa", tone: "ok" },
    rechazada: { label: "Rechazada", tone: "danger" },
    borrador: { label: "Borrador", tone: "default" },
    finalizada: { label: "Finalizada", tone: "default" },
    pausada: { label: "Pausada", tone: "default" },
  } as const;

  const currentStatus = statusMap[String(campaign.status ?? "en_revision") as keyof typeof statusMap] ?? { label: "En revisión", tone: "warn" };
  const endDateLabel = campaign.endDate ? new Date(campaign.endDate).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) : "sin fecha";
  const dataTypes = Array.isArray(campaign.dataTypes) && campaign.dataTypes.length > 0 ? campaign.dataTypes : ["texto"];

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink href="/supervision">Volver a supervisar</BackLink>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">Detalle de campaña</p>
          <h1 className="mt-2 text-2xl font-extrabold text-ink">{campaign.name}</h1>
          <p className="mt-1 text-[13px] text-ink-2">
            {(campaign.tag || campaign.tematica || "Sin temática")} · creada por {campaign.creatorName || "Usuario"} · meta {Number(campaign.goalContributions ?? 0)} aportes
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleDecision("rechazada")}
            disabled={actionLoading !== null}
            className="rounded-pill border border-danger/40 bg-danger-tint px-3.5 py-2 text-[12.5px] font-bold text-danger disabled:opacity-60"
          >
            {actionLoading === "rechazada" ? "Rechazando…" : "Rechazar"}
          </button>
          <button
            type="button"
            onClick={() => handleDecision("reportada")}
            disabled={actionLoading !== null}
            className="rounded-pill border border-line-2 bg-surface px-3.5 py-2 text-[12.5px] font-bold text-ink-2 disabled:opacity-60"
          >
            {actionLoading === "reportada" ? "Reportando…" : "Reportar"}
          </button>
          <button
            type="button"
            onClick={() => handleDecision("aceptada")}
            disabled={actionLoading !== null}
            className="rounded-pill border border-ok/40 bg-ok-tint px-3.5 py-2 text-[12.5px] font-bold text-ok disabled:opacity-60"
          >
            {actionLoading === "aceptada" ? "Aceptando…" : "Aceptar campaña"}
          </button>
        </div>
      </div>

      <div className="mb-5 rounded-lg border border-line bg-sunken p-4 text-[13px] text-ink-2">
        La decisión queda registrada y vinculada al supervisor que la toma.
      </div>

      <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
        <p className="text-[13.5px] leading-6 text-ink-2">{campaign.description}</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <div className="flex justify-between border-b border-line pb-3 text-[13px]">
              <span className="text-ink-2">Estado</span>
              <Tag tone={currentStatus.tone}>{currentStatus.label}</Tag>
            </div>
            <div className="flex justify-between border-b border-line pb-3 text-[13px]">
              <span className="text-ink-2">Tipo de aporte</span>
              <span>{dataTypes.join(" y ")}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between border-b border-line pb-3 text-[13px]">
              <span className="text-ink-2">Enviada</span>
              <span className="font-mono">hace 44 h</span>
            </div>
            <div className="flex justify-between border-b border-line pb-3 text-[13px]">
              <span className="text-ink-2">Vigencia</span>
              <span className="font-mono">hasta {endDateLabel}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={`/supervision/${campaign.id}/usuarios`} className="rounded-pill bg-accent px-5 py-3 text-[12.5px] font-bold text-white shadow-sm hover:bg-accent-deep">
            Ver usuarios de la campaña
          </Link>
          <Link href={`/supervision/${campaign.id}/panel`} className="rounded-pill border border-line-2 bg-surface px-5 py-3 text-[12.5px] font-bold text-ink-2 hover:border-accent hover:text-accent">
            Abrir panel
          </Link>
        </div>
      </section>
    </div>
  );
}