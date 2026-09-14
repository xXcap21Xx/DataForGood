"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Tag from "@/components/ui/Tag";
import Button from "@/components/ui/Button";
import type { Campaign, Contribution } from "@/types";

const STAGE_LABEL: Record<string, string> = {
  pendiente: "Sin revisar",
  espera_final: "Espera final",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
};

export default function BandejaAportesPage() {
  const params = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [inbox, setInbox] = useState<Contribution[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [campaignRes, aportesRes] = await Promise.all([
          fetch(`/api/campanas/${params.id}`, { cache: "no-store" }),
          fetch(`/api/aportes?campaignId=${encodeURIComponent(params.id)}`, { cache: "no-store" }),
        ]);

        const campaignPayload = await campaignRes.json().catch(() => ({}));
        if (!campaignRes.ok) throw new Error(campaignPayload.error ?? "No se pudo cargar la campaña");
        setCampaign(campaignPayload.data as Campaign);

        const aportesPayload = await aportesRes.json().catch(() => ({}));
        if (!aportesRes.ok) throw new Error(aportesPayload.error ?? "No se pudieron cargar los aportes");
        setInbox(Array.isArray(aportesPayload.data) ? (aportesPayload.data as Contribution[]) : []);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudo cargar la información");
      }
    }
    void load();
  }, [params.id]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!campaign) return <p className="text-sm text-ink-2">Cargando...</p>;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/mis-campanas" className="mb-4 inline-block text-[13px] text-ink-2 hover:text-ink">
        ← Volver a mis campañas
      </Link>

      <h1 className="text-xl font-extrabold text-ink">Aportes recibidos</h1>
      <p className="mb-4 text-[13px] text-ink-2">{campaign.name}</p>

      <div className="mb-4 flex flex-wrap gap-2">
        <Tag tone="on">
          {campaign.hasReviewerAssigned ? "Pendientes" : "Por revisar"}{" "}
          {campaign.pendingContributions}
        </Tag>
        <Tag>Aceptados {campaign.approvedContributions}</Tag>
        <Tag>Rechazados {campaign.rejectedContributions}</Tag>
      </div>

      {campaign.hasReviewerAssigned ? (
        <div className="mb-5 rounded-lg bg-accent-tint p-3.5 text-[12.5px] text-accent-deep">
          Esta campaña tiene revisor asignado: los aportes marcados como validados ya
          pasaron la primera instancia.
        </div>
      ) : (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3 rounded-lg bg-warn-tint p-4 text-[12.5px] text-warn">
          <span>
            Esta campaña no tiene revisor de aportes asignado. Todos los envíos llegan
            sin filtro previo y tú decides en una sola instancia.
          </span>
          <Link href={`/mis-campanas/${campaign.id}/aportes/agregar-revisor`}>
            <Button size="sm">Agregar revisor</Button>
          </Link>
        </div>
      )}

      {inbox.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-2 p-6 text-sm text-ink-2">
          Aún no llegan aportes a esta campaña.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-sunken text-[11px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-3 py-2.5">Participante</th>
                <th className="px-3 py-2.5">Descripción</th>
                <th className="px-3 py-2.5">Tipo</th>
                <th className="px-3 py-2.5">Etapa</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {inbox.map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-ink">{item.participantName}</p>
                    <p className="font-mono text-[11.5px] text-ink-3">
                      {new Date(item.submittedAt).toLocaleDateString("es-MX", {
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      ·{" "}
                      {new Date(item.submittedAt).toLocaleTimeString("es-MX", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-ink-2">{item.description}</td>
                  <td className="px-3 py-3 text-ink-2">{item.fileType}</td>
                  <td className="px-3 py-3">
                    <Tag tone={item.status === "espera_final" ? "warn" : "default"}>
                      {STAGE_LABEL[item.status]}
                    </Tag>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link href={`/mis-campanas/${campaign.id}/aportes/${item.id}`}>
                      <Button size="sm">Abrir</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!campaign.hasReviewerAssigned && (
        <div className="mt-4 rounded-lg bg-sunken p-3.5 text-[12.5px] text-ink-2">
          Sin revisor, la cola de pendientes crece: los aportes que normalmente se
          filtran en primera instancia también aparecen aquí.
        </div>
      )}
    </div>
  );
}
