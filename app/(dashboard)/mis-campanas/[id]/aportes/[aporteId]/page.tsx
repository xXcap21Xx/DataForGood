"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Field, Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Tag from "@/components/ui/Tag";
import type { Contribution } from "@/types";

const REJECTION_REASONS = [
  "Contenido borroso o ilegible",
  "No corresponde a la campaña",
  "Datos incompletos",
  "Contenido duplicado",
];

export default function RevisionAportePage() {
  const params = useParams<{ id: string; aporteId: string }>();
  const router = useRouter();

  const [item, setItem] = useState<Contribution | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/aportes/${params.aporteId}`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error ?? "No se pudo cargar el aporte");
        setItem(payload.data as Contribution);
      } catch (cause) {
        setLoadError(cause instanceof Error ? cause.message : "No se pudo cargar el aporte");
      }
    }
    void load();
  }, [params.aporteId]);

  if (loadError) return <p className="text-sm text-danger">{loadError}</p>;
  if (!item) return <p className="text-sm text-ink-2">Cargando...</p>;

  async function review(status: "aceptado" | "rechazado", rejectionReason?: string) {
    setSubmitting(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/aportes/${params.aporteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectionReason }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "No se pudo actualizar el aporte");
      router.push(`/mis-campanas/${params.id}/aportes`);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "No se pudo actualizar el aporte");
      setSubmitting(false);
    }
  }

  function approve() {
    void review("aceptado");
  }

  function confirmReject(e: React.FormEvent) {
    e.preventDefault();
    void review("rechazado", customReason.trim() || reason);
  }

  const canReject = Boolean(reason) || customReason.trim().length > 0;
  const alreadyReviewed = item.status === "aceptado" || item.status === "rechazado";

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/mis-campanas/${params.id}/aportes`}
        className="mb-4 inline-block text-[13px] text-ink-2 hover:text-ink"
      >
        ← Volver a aportes
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-ink">Aporte {item.id}</h1>
        </div>
        <Tag tone={item.status === "aceptado" ? "ok" : item.status === "rechazado" ? "danger" : "warn"}>
          {item.status === "aceptado"
            ? "Aceptado"
            : item.status === "rechazado"
              ? "Rechazado"
              : item.firstPassBy
                ? `Validado por ${item.firstPassBy} · espera aprobación final`
                : "Sin revisar"}
        </Tag>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {item.fileType === "foto" ? (
          <img
            src={`/api/aportes/${item.id}/archivo`}
            alt="Archivo del aporte"
            className="h-44 w-full rounded-lg border border-line-2 bg-sunken object-contain"
          />
        ) : (
          <div className="flex h-44 items-center justify-center rounded-lg border border-dashed border-line-2 bg-sunken text-[12.5px] text-ink-3">
            Vista previa del archivo · {item.fileType}
            {item.fileSizeBytes && ` · ${(item.fileSizeBytes / 1_000_000).toFixed(1)} MB`}
          </div>
        )}

        <div>
          <p className="mb-1.5 text-[12.5px] font-medium text-ink">
            Descripción del participante
          </p>
          <p className="mb-4 text-[14px] leading-relaxed text-ink-2">{item.description}</p>

          {item.caracteristicas && item.caracteristicas.length > 0 && (
            <div className="mb-4">
              <p className="mb-1.5 text-[12.5px] font-medium text-ink">Marcó como aplicable</p>
              <div className="flex flex-wrap gap-1.5">
                {item.caracteristicas.map((c) => (
                  <Tag key={c}>{c}</Tag>
                ))}
              </div>
            </div>
          )}

          <dl className="mb-4 flex flex-col gap-2 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-ink-2">Autor</dt>
              <dd className="font-medium text-ink">{item.participantName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-2">Enviado</dt>
              <dd className="font-mono font-medium text-ink">
                {new Date(item.submittedAt).toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "short",
                })}{" "}
                ·{" "}
                {new Date(item.submittedAt).toLocaleTimeString("es-MX", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </dd>
            </div>
            {item.firstPassBy && (
              <div className="flex justify-between">
                <dt className="text-ink-2">Revisor</dt>
                <dd className="font-medium text-ink">{item.firstPassBy}</dd>
              </div>
            )}
            {item.status === "rechazado" && item.rejectionReason && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-2">Motivo de rechazo</dt>
                <dd className="text-right font-medium text-danger">{item.rejectionReason}</dd>
              </div>
            )}
          </dl>

          {actionError && (
            <p className="mb-3 rounded border border-danger bg-danger-tint p-2 text-[12px] text-danger">{actionError}</p>
          )}

          {showRejectForm && (
            <form onSubmit={confirmReject} className="mb-4 rounded-lg border border-danger p-4">
              <p className="mb-2 text-[13px] font-medium text-ink">
                Motivo del rechazo <span className="text-danger">*</span>
              </p>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mb-2.5 w-full rounded border border-line-2 bg-surface px-3 py-2.5 text-[13px] text-ink outline-none focus:border-accent"
              >
                <option value="">Selecciona un motivo ▾</option>
                {REJECTION_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <Field label="O redacta el motivo">
                <Textarea
                  rows={3}
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Motivo técnico o de contenido"
                />
              </Field>
              <p className="mb-3 text-[11.5px] text-ink-3">
                Obligatorio al rechazar. El participante lo recibirá por notificación.
              </p>
              <Button variant="danger" type="submit" disabled={!canReject || submitting}>
                Confirmar rechazo
              </Button>
            </form>
          )}
        </div>
      </div>

      {!alreadyReviewed && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <Button variant="danger" size="sm">
            Banear de la campaña
          </Button>
          <div className="flex gap-2">
            <Button onClick={() => setShowRejectForm(true)} disabled={submitting}>Rechazar</Button>
            <Button variant="primary" onClick={approve} disabled={submitting}>
              Aprobar aporte
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
