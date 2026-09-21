"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Tag from "@/components/ui/Tag";
import { Textarea } from "@/components/ui/Input";
import { BackLink } from "../_ui";

type Campaign = {
  id: string;
  name: string;
  status?: string;
  tag?: string;
  tematica?: string;
  creatorName?: string;
  supervisorId?: string | null;
  organizer?: string;
  goalContributions?: number;
  currentContributions?: number;
  participants?: number;
  quotaPerUser?: number;
  description?: string;
  dataTypes?: string[];
  locationCity?: string;
  locationState?: string;
  locationColonia?: string;
  startDate?: string | null;
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
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

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

  async function handleDecision(action: "aceptada" | "rechazada" | "reportada", motivo = "") {
    if (!campaignId) return;

    try {
      setActionLoading(action);
      const response = await fetch(`/api/campanas/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, motivo }),
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

  function confirmRejection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const motivo = rejectionReason.trim();
    if (!motivo) {
      setError("Debes explicar el motivo del rechazo");
      return;
    }
    void handleDecision("rechazada", motivo);
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
    aceptada: { label: "Aceptada", tone: "warn" },
    activa: { label: "Activa", tone: "ok" },
    rechazada: { label: "Rechazada", tone: "danger" },
    borrador: { label: "Borrador", tone: "default" },
    finalizada: { label: "Finalizada", tone: "default" },
    pausada: { label: "Pausada", tone: "default" },
  } as const;

  const parseDateOnly = (date: string | null | undefined) => {
    if (!date) return null;
    const [year, month, day] = date.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const currentStatus = statusMap[String(campaign.status ?? "en_revision") as keyof typeof statusMap] ?? { label: "En revisión", tone: "warn" };
  const formatDate = (date: string | null | undefined) => {
    const parsed = parseDateOnly(date);
    return parsed ? parsed.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "sin fecha";
  };
  const dataTypes = Array.isArray(campaign.dataTypes) && campaign.dataTypes.length > 0 ? campaign.dataTypes : ["texto"];
  const location = [campaign.locationColonia, campaign.locationCity, campaign.locationState].filter(Boolean).join(", ") || "Sin ubicación";

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
          {campaign.status === "en_revision" && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setShowRejectForm(true);
              }}
              disabled={actionLoading !== null}
              className="rounded-pill border border-danger/40 bg-danger-tint px-3.5 py-2 text-[12.5px] font-bold text-danger disabled:opacity-60"
            >
              Rechazar
            </button>
          )}
          {campaign.status !== "finalizada" && (
            <button
              type="button"
              onClick={() => handleDecision("reportada")}
              disabled={actionLoading !== null}
              className="rounded-pill border border-line-2 bg-surface px-3.5 py-2 text-[12.5px] font-bold text-ink-2 disabled:opacity-60"
            >
              {actionLoading === "reportada" ? "Reportando…" : "Reportar"}
            </button>
          )}
          {campaign.status === "en_revision" && (
            <button
              type="button"
              onClick={() => handleDecision("aceptada")}
              disabled={actionLoading !== null}
              className="rounded-pill border border-ok/40 bg-ok-tint px-3.5 py-2 text-[12.5px] font-bold text-ok disabled:opacity-60"
            >
              {actionLoading === "aceptada" ? "Aceptando…" : "Aceptar campaña"}
            </button>
          )}
        </div>
      </div>

      {showRejectForm && campaign.status === "en_revision" && (
        <form onSubmit={confirmRejection} className="mb-5 rounded-lg border border-danger/40 bg-danger-tint p-4">
          <label htmlFor="campaign-rejection-reason" className="mb-2 block text-[13px] font-semibold text-ink">
            Motivo del rechazo <span className="text-danger">*</span>
          </label>
          <Textarea
            id="campaign-rejection-reason"
            rows={4}
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            placeholder="Explica al creador por qué se rechaza la campaña"
            required
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowRejectForm(false)}
              disabled={actionLoading !== null}
              className="rounded-pill border border-line-2 bg-surface px-3.5 py-2 text-[12.5px] font-bold text-ink-2 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={actionLoading !== null || !rejectionReason.trim()}
              className="rounded-pill bg-danger px-3.5 py-2 text-[12.5px] font-bold text-white disabled:opacity-60"
            >
              {actionLoading === "rechazada" ? "Rechazando…" : "Confirmar rechazo"}
            </button>
          </div>
        </form>
      )}

      <div className="mb-5 rounded-lg border border-line bg-sunken p-4 text-[13px] text-ink-2">
        La decisión queda registrada y vinculada al supervisor que la toma.
      </div>

      <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
        <p className="text-[13.5px] leading-6 text-ink-2">{campaign.description}</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <div className="flex justify-between gap-4 border-b border-line pb-3 text-[13px]">
              <span className="text-ink-2">Usuario de la campaña</span>
              <span className="text-right font-semibold">{campaign.creatorName || "Usuario"}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-line pb-3 text-[13px]">
              <span className="text-ink-2">Organizador</span>
              <span className="text-right">{campaign.organizer || "Sin especificar"}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-line pb-3 text-[13px]">
              <span className="text-ink-2">Temática</span>
              <span className="text-right">{campaign.tag || campaign.tematica || "Sin temática"}</span>
            </div>
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
            <div className="flex justify-between gap-4 border-b border-line pb-3 text-[13px]">
              <span className="text-ink-2">Ubicación</span>
              <span className="text-right">{location}</span>
            </div>
            <div className="flex justify-between border-b border-line pb-3 text-[13px]">
              <span className="text-ink-2">Periodo</span>
              <span className="text-right font-mono">{formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}</span>
            </div>
            <div className="flex justify-between border-b border-line pb-3 text-[13px]">
              <span className="text-ink-2">Progreso</span>
              <span className="font-mono">{Number(campaign.currentContributions ?? 0)} / {Number(campaign.goalContributions ?? 0)} aportes</span>
            </div>
            <div className="flex justify-between border-b border-line pb-3 text-[13px]">
              <span className="text-ink-2">Participantes</span>
              <span className="font-mono">{Number(campaign.participants ?? 0)}</span>
            </div>
            <div className="flex justify-between border-b border-line pb-3 text-[13px]">
              <span className="text-ink-2">Cuota por usuario</span>
              <span className="font-mono">{Number(campaign.quotaPerUser ?? 0)}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {(campaign.status === "activa" || campaign.status === "finalizada") && (
            <Link href={`/supervision/${campaign.id}/usuarios`} className="rounded-pill bg-accent px-5 py-3 text-[12.5px] font-bold text-white shadow-sm hover:bg-accent-deep">
              Ver participantes
            </Link>
          )}
          <Link href={`/supervision/${campaign.id}/panel`} className="rounded-pill border border-line-2 bg-surface px-5 py-3 text-[12.5px] font-bold text-ink-2 hover:border-accent hover:text-accent">
            Abrir panel
          </Link>
        </div>
      </section>
    </div>
  );
}