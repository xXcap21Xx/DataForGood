"use client";

// Pantalla /revisiones/[aporteId]: revisar un aporte como revisor.
// Componente cliente. Datos: GET /api/aportes/[id]. Acción: PATCH /api/aportes/[id] { status: "aceptado" }.
// Aporte anónimo: "Marcar como inapropiado" con POST /api/aportes/[id]/inapropiado (no cambia
// el estado; decide el creador).
// El servidor lo deja en "espera_final": la aprobación final es del creador.

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Tag from "@/components/ui/Tag";
import type { Contribution } from "@/types";
import { BASE_PATH } from "@/lib/base-path";

const STATUS_LABELS: Record<string, string> = {
  pendiente: "Sin revisar",
  espera_final: "Validado · espera aprobación final",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
};

export default function RevisionAportePage() {
  const { aporteId } = useParams<{ aporteId: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Contribution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`${BASE_PATH}/api/aportes/${aporteId}`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error ?? "No se pudo cargar el aporte");
        setItem(payload.data as Contribution);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudo cargar el aporte");
      }
    }

    void load();
  }, [aporteId]);

  async function acceptContribution() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${BASE_PATH}/api/aportes/${aporteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "aceptado" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "No se pudo validar el aporte");
      router.push("/revisiones");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo validar el aporte");
      setSubmitting(false);
    }
  }

  async function marcarInapropiado() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${BASE_PATH}/api/aportes/${aporteId}/inapropiado`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "No se pudo marcar el aporte");
      setItem((actual) => (actual ? { ...actual, inapropiado: true } : actual));
      setAviso(payload.message ?? "Marcado como inapropiado");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo marcar el aporte");
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !item) {
    return <p className="mx-auto max-w-3xl text-sm text-danger">{error}</p>;
  }

  if (!item) {
    return <p className="mx-auto max-w-3xl text-sm text-ink-2">Cargando aporte...</p>;
  }

  const alreadyValidated = item.status !== "pendiente";
  const statusTone = item.status === "aceptado" ? "ok" : item.status === "rechazado" ? "danger" : "warn";
  const submittedAt = new Date(item.submittedAt);

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/revisiones" className="mb-5 inline-block text-[13px] text-ink-2 hover:text-ink">
        ← Volver a revisiones
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">Revisor de aportes</p>
          <h1 className="mt-2 text-2xl font-extrabold text-ink">Vista previa del aporte</h1>
          <p className="mt-1 text-[13px] text-ink-2">Revisa el contenido antes de validarlo para la aprobación final del creador.</p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {item.inapropiado && <Tag tone="danger">Contenido inapropiado</Tag>}
          <Tag tone={statusTone}>{STATUS_LABELS[item.status] ?? item.status}</Tag>
        </div>
      </div>

      {error && <p className="mb-4 rounded border border-danger bg-danger-tint p-3 text-[12.5px] text-danger">{error}</p>}
      {aviso && <p className="mb-4 rounded border border-warn bg-warn-tint p-3 text-[12.5px] text-warn">{aviso}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,.9fr)]">
        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <p className="mb-3 text-[12.5px] font-semibold text-ink">Archivo enviado</p>
          {item.archivoBorrado ? (
            <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-line-2 bg-sunken text-[12.5px] text-ink-3">
              El creador borró este archivo
            </div>
          ) : item.fileType === "foto" ? (
            <img
              src={`${BASE_PATH}/api/aportes/${item.id}/archivo`}
              alt={`Vista previa del aporte de ${item.participantName}`}
              className="aspect-video w-full rounded-lg border border-line-2 bg-sunken object-contain"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-line-2 bg-sunken text-[12.5px] text-ink-3">
              Vista previa no disponible para {item.fileType}
            </div>
          )}
          <p className="mt-3 font-mono text-[11.5px] text-ink-3">
            {item.fileType} {item.fileSizeBytes ? `· ${(item.fileSizeBytes / 1_000_000).toFixed(1)} MB` : ""}
          </p>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-lg font-extrabold text-ink">Datos del aporte</h2>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Participante</p>
              <p className="mt-1 text-sm font-semibold text-ink">{item.participantName}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Descripción</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{item.description}</p>
            </div>
            {item.caracteristicas && item.caracteristicas.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Características</p>
                <div className="flex flex-wrap gap-2">
                  {item.caracteristicas.map((feature) => <Tag key={feature}>{feature}</Tag>)}
                </div>
              </div>
            )}
            <dl className="space-y-2 border-t border-line pt-4 text-[13px]">
              <div className="flex justify-between gap-4"><dt className="text-ink-2">Enviado</dt><dd className="font-mono text-right text-ink">{submittedAt.toLocaleDateString("es-MX", { day: "numeric", month: "short" })} · {submittedAt.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-2">Tipo</dt><dd className="text-ink">{item.fileType}</dd></div>
            </dl>
          </div>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <p className="max-w-xl text-[12.5px] text-ink-2">
          Al aceptar, el aporte queda validado y pasa a la aprobación final de quien creó la campaña.
        </p>
        <div className="flex flex-wrap gap-2">
          {item.userId === null && !item.inapropiado && (
            <Button variant="danger" disabled={submitting} onClick={() => void marcarInapropiado()}>
              Marcar como inapropiado
            </Button>
          )}
          <Button variant="primary" disabled={alreadyValidated || submitting} onClick={() => void acceptContribution()}>
            {submitting ? "Validando..." : alreadyValidated ? "Aporte ya validado" : "Aceptar aporte"}
          </Button>
        </div>
      </div>
    </div>
  );
}
