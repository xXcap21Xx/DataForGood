"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getCampaignById, getInboxItemById } from "@/data/screensData";
import { Field, Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Tag from "@/components/ui/Tag";

const REJECTION_REASONS = [
  "Contenido borroso o ilegible",
  "No corresponde a la campaña",
  "Datos incompletos",
  "Contenido duplicado",
];

export default function RevisionAportePage() {
  const params = useParams<{ id: string; aporteId: string }>();
  const router = useRouter();
  const campaign = getCampaignById(params.id);
  const item = getInboxItemById(params.id, params.aporteId);

  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  if (!campaign || !item) {
    return <p className="text-sm text-ink-2">Aporte no encontrado.</p>;
  }

  function approve() {
    router.push(`/mis-campanas/${params.id}/aportes`);
  }

  function confirmReject(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/mis-campanas/${params.id}/aportes`);
  }

  const canReject = Boolean(reason) || customReason.trim().length > 0;

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
          <h1 className="text-xl font-extrabold text-ink">Aporte {item.id.replace("ap-", "")}</h1>
          <p className="mt-1 text-[13px] text-ink-2">{campaign.name}</p>
        </div>
        <Tag tone="warn">
          {item.firstPassBy
            ? `Validado por ${item.firstPassBy} · espera aprobación final`
            : "Sin revisar"}
        </Tag>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="flex h-44 items-center justify-center rounded-lg border border-dashed border-line-2 bg-sunken text-[12.5px] text-ink-3">
          Vista previa del archivo · {item.fileType}
          {item.fileSizeBytes && ` · ${(item.fileSizeBytes / 1_000_000).toFixed(1)} MB`}
        </div>

        <div>
          <p className="mb-1.5 text-[12.5px] font-medium text-ink">
            Descripción del participante
          </p>
          <p className="mb-4 text-[14px] leading-relaxed text-ink-2">{item.description}</p>

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
              <>
                <div className="flex justify-between">
                  <dt className="text-ink-2">Primera instancia</dt>
                  <dd className="font-medium text-ok">Aceptado</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-2">Revisor</dt>
                  <dd className="font-medium text-ink">{item.firstPassBy}</dd>
                </div>
              </>
            )}
          </dl>

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
              <Button variant="danger" type="submit" disabled={!canReject}>
                Confirmar rechazo
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <Button variant="danger" size="sm">
          Banear de la campaña
        </Button>
        <div className="flex gap-2">
          <Button onClick={() => setShowRejectForm(true)}>Rechazar</Button>
          <Button variant="primary" onClick={approve}>
            Aprobar aporte
          </Button>
        </div>
      </div>
    </div>
  );
}
