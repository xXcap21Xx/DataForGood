"use client";

// Botones de /supervisar/[campaignId]. Llaman a las server actions tomarComoSuperUsuario y
// decidirComoSuperUsuario (lib/supervision/acciones-root.ts), que usan las reglas de lib/supervision/decision.ts.

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Textarea } from "@/components/ui/Input";
import { decidirComoSuperUsuario, tomarComoSuperUsuario } from "@/lib/supervision/acciones-root";
import Tag from "@/components/ui/Tag";
import type { AccionDeSupervision } from "@/lib/supervision/decision";

export default function AccionesDeSupervision({
  campaignId,
  status,
  supervision,
  encabezado,
}: {
  campaignId: string;
  status: string;
  supervision: "libre" | "mia" | "otro";
  encabezado: ReactNode;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [accionEnCurso, setAccionEnCurso] = useState<AccionDeSupervision | "tomar" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  function decidir(accion: AccionDeSupervision, motivo = "") {
    setError(null);
    setAccionEnCurso(accion);
    iniciar(async () => {
      const resultado = await decidirComoSuperUsuario(campaignId, accion, motivo);
      setAccionEnCurso(null);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      router.push(accion === "aceptada" ? "/supervisar/campanas" : "/supervisar");
    });
  }

  function tomar() {
    setError(null);
    setAccionEnCurso("tomar");
    iniciar(async () => {
      const resultado = await tomarComoSuperUsuario(campaignId);
      setAccionEnCurso(null);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  function confirmRejection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const motivo = rejectionReason.trim();
    if (!motivo) {
      setError("Debes explicar el motivo del rechazo");
      return;
    }
    decidir("rechazada", motivo);
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        {encabezado}

        {supervision === "libre" && status === "en_revision" ? (
          <button
            type="button"
            onClick={tomar}
            disabled={pendiente}
            className="rounded-pill bg-accent px-4 py-2 text-[12.5px] font-bold text-white shadow-sm hover:bg-accent-deep disabled:opacity-60"
          >
            {accionEnCurso === "tomar" ? "Tomando…" : "Supervisar esta campaña"}
          </button>
        ) : supervision !== "mia" ? (
          <Tag>{supervision === "otro" ? "La supervisa otro supervisor" : "Sin supervisor"}</Tag>
        ) : (
        <div className="flex flex-wrap gap-2">
          {status === "en_revision" && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setShowRejectForm(true);
              }}
              disabled={pendiente}
              className="rounded-pill border border-danger/40 bg-danger-tint px-3.5 py-2 text-[12.5px] font-bold text-danger disabled:opacity-60"
            >
              Rechazar
            </button>
          )}
          {status !== "finalizada" && (
            <button
              type="button"
              onClick={() => decidir("reportada")}
              disabled={pendiente}
              className="rounded-pill border border-line-2 bg-surface px-3.5 py-2 text-[12.5px] font-bold text-ink-2 disabled:opacity-60"
            >
              {accionEnCurso === "reportada" ? "Reportando…" : "Reportar"}
            </button>
          )}
          {status === "en_revision" && (
            <button
              type="button"
              onClick={() => decidir("aceptada")}
              disabled={pendiente}
              className="rounded-pill border border-ok/40 bg-ok-tint px-3.5 py-2 text-[12.5px] font-bold text-ok disabled:opacity-60"
            >
              {accionEnCurso === "aceptada" ? "Aceptando…" : "Aceptar campaña"}
            </button>
          )}
        </div>
        )}
      </div>

      {error && (
        <div className="mb-5 rounded-lg border border-danger/30 bg-danger-tint p-4 text-sm text-danger">{error}</div>
      )}

      {showRejectForm && supervision === "mia" && status === "en_revision" && (
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
              disabled={pendiente}
              className="rounded-pill border border-line-2 bg-surface px-3.5 py-2 text-[12.5px] font-bold text-ink-2 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pendiente || !rejectionReason.trim()}
              className="rounded-pill bg-danger px-3.5 py-2 text-[12.5px] font-bold text-white disabled:opacity-60"
            >
              {accionEnCurso === "rechazada" ? "Rechazando…" : "Confirmar rechazo"}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
