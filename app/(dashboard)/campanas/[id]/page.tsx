"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import Tag from "@/components/ui/Tag";
import type { Campaign } from "@/types";

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadCampaign() {
      try {
        const response = await fetch(`/api/campanas?id=${encodeURIComponent(params.id)}`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error ?? "No se pudo cargar la campaña");
        setCampaign(payload.data as Campaign);
        setIsCreator(Boolean(payload.viewer?.isCreator));
        setSaved(Boolean((payload.data as Campaign)?.isSaved));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudo cargar la campaña");
      }
    }
    void loadCampaign();
  }, [params.id]);

  async function alternarGuardado() {
    if (guardando) return;
    setGuardando(true);
    const metodo = saved ? "DELETE" : "POST";
    try {
      const response = await fetch(`/api/campanas/${encodeURIComponent(params.id)}/guardar`, {
        method: metodo,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "No se pudo actualizar");
      setSaved(Boolean(payload.data?.isSaved));
    } catch {
      // Si falla, el estado se queda como estaba: no hay nada que revertir.
    } finally {
      setGuardando(false);
    }
  }

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!campaign) return <p className="text-sm text-ink-2">Cargando campaña...</p>;

  const pct = Math.round(
    (campaign.currentContributions / campaign.goalContributions) * 100
  );

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <Link href="/campanas" className="mb-4 inline-block text-[13px] text-ink-2 hover:text-ink">
          ← Volver a campañas
        </Link>

        <div className="mb-2 flex items-center justify-between">
          <Tag tone="ok">{campaign.tag}</Tag>
            <Button variant="secondary" size="sm" onClick={() => {
              if (typeof navigator !== "undefined" && navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href);
                setShareMessage("Enlace copiado");
              }
            }}>
            Compartir
          </Button>
        </div>

        <h1 className="mb-2 text-[26px] font-extrabold text-ink">{campaign.name}</h1>

        <div className="mb-6 flex flex-wrap gap-5 text-[13px] text-ink-2">
          <span>
            {campaign.locationCity}, {campaign.locationState}
          </span>
          <span>
            {campaign.startDate && new Date(campaign.startDate).toLocaleDateString("es-MX", {
              day: "numeric",
              month: "short",
            })}{" "}
            –{" "}
            {campaign.endDate && new Date(campaign.endDate).toLocaleDateString("es-MX", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>

        <div className="mb-6 rounded-lg bg-accent-deep p-5 text-white">
          <p className="text-base font-bold">Tu observación suma conocimiento</p>
          <p className="mt-1 text-[13px] text-white/85">{campaign.description}</p>
        </div>

        <h2 className="mb-2 text-lg font-bold text-ink">¿De qué trata esta campaña?</h2>
        <p className="text-[14px] leading-relaxed text-ink-2">{campaign.description}</p>

        <h2 className="mb-2 mt-6 text-lg font-bold text-ink">¿Qué puedes aportar?</h2>
        <p className="mb-3 text-[13px] text-ink-2">
          Comparte la información que tengas. Cada aporte es valioso.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-line bg-surface p-4">
            <p className="text-[14px] font-bold text-ink">Imágenes</p>
            <p className="mt-1 text-[12px] text-ink-3">
              Fotos del ejemplar completo y de sus hojas.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-surface p-4">
            <p className="text-[14px] font-bold text-ink">Textos</p>
            <p className="mt-1 text-[12px] text-ink-3">
              Especie, estado de salud y notas de campo.
            </p>
          </div>
        </div>
      </div>

      <aside className="flex flex-col gap-4">
        <div className="rounded-lg border border-line bg-surface p-5">
          <h3 className="mb-1 text-[15px] font-bold text-ink">
            Tu participación hace la diferencia
          </h3>
          <p className="mb-4 text-[12.5px] text-ink-2">
            Esta campaña no recibe dinero. Aquí se comparte conocimiento.
          </p>

          <ProgressBar pct={pct} />
          <p className="mt-2 mb-4 font-mono text-[12.5px] text-ink-2">
            {campaign.currentContributions} de {campaign.goalContributions} aportes · tu
            cuota: {campaign.quotaPerUser}
          </p>

          {isCreator ? (
            <p className="rounded-lg bg-sunken p-3 text-center text-[12.5px] text-ink-2">Creaste esta campaña, por lo que no puedes aportar en ella.</p>
          ) : campaign.status === "activa" ? (
            <Link href={`/campanas/${campaign.id}/aportar`}>
              <Button variant="primary" className="w-full">Realizar un aporte</Button>
            </Link>
          ) : (
            <p className="rounded-lg bg-sunken p-3 text-center text-[12.5px] text-ink-2">Esta campaña no está recibiendo aportes.</p>
          )}
          <Button variant="secondary" className="mt-2.5 w-full" disabled={guardando} onClick={alternarGuardado}>
            {saved ? "Campaña guardada" : "Guardar campaña"}
          </Button>
          {shareMessage && <p className="mt-2 text-center text-[11.5px] text-ok">{shareMessage}</p>}
        </div>

        <div className="rounded-lg border border-line bg-surface p-5">
          <h3 className="mb-3 text-[15px] font-bold text-ink">Detalles de la campaña</h3>
          <dl className="flex flex-col gap-2.5 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-ink-2">Organiza</dt>
              <dd className="font-medium text-ink">{campaign.organizer ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-2">Tipo de dato</dt>
              <dd className="font-medium text-ink">
                {campaign.dataTypes.map((t) => t[0].toUpperCase() + t.slice(1)).join(" y ")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-2">Meta</dt>
              <dd className="font-medium text-ink">
                {campaign.goalContributions} aportes
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-2">Experiencia</dt>
              <dd className="font-medium text-ink">
                {campaign.xpPerContribution} XP por aporte aprobado
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-ok bg-ok-tint p-4">
          <p className="text-[13.5px] font-bold text-ok">Tus datos están seguros</p>
          <p className="mt-1 text-[12.5px] text-ok">Cada aporte se revisa antes de publicarse y tus archivos solo se usan dentro de esta campaña.</p>
        </div>
      </aside>
    </div>
  );
}
