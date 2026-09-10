"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getCampaignById, reviewerCandidates } from "@/data/screensData";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Tag from "@/components/ui/Tag";

export default function AgregarRevisorPage() {
  const params = useParams<{ id: string }>();
  const campaign = getCampaignById(params.id);
  const [query, setQuery] = useState("");
  const [invitedId, setInvitedId] = useState<string | null>(null);

  if (!campaign) {
    return <p className="text-sm text-ink-2">Campaña no encontrada.</p>;
  }

  const filtered = reviewerCandidates.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.email.toLowerCase().includes(query.toLowerCase())
  );

  const invited = reviewerCandidates.find((c) => c.id === invitedId);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/mis-campanas/${params.id}/aportes`}
        className="mb-4 inline-block text-[13px] text-ink-2 hover:text-ink"
      >
        ← Volver a aportes
      </Link>

      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-ink">Agregar revisor</h1>
          <p className="mt-1 text-[13px] text-ink-2">{campaign.name}</p>
        </div>
        <Input
          placeholder="Buscar por nombre o correo"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-56"
        />
      </div>

      {invited && (
        <div className="mb-5 rounded-lg bg-accent-tint p-3.5 text-[12.5px] text-accent-deep">
          Invitaste a {invited.name} como revisor de aportes. Queda pendiente hasta que
          la acepte.
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-line">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-sunken text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="px-3 py-2.5">Usuario</th>
              <th className="px-3 py-2.5">Rol actual</th>
              <th className="px-3 py-2.5 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((candidate) => {
              const isInvited = candidate.id === invitedId;
              return (
                <tr key={candidate.id} className="border-t border-line">
                  <td className="px-3 py-3">
                    <p className="font-medium text-ink">{candidate.name}</p>
                    <p className="font-mono text-[11.5px] text-ink-3">{candidate.email}</p>
                  </td>
                  <td className="px-3 py-3">
                    <Tag tone={isInvited ? "warn" : candidate.currentRole === "Supervisor" ? "ok" : "default"}>
                      {isInvited ? "Invitación pendiente" : candidate.currentRole}
                    </Tag>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Button size="sm" disabled={isInvited} onClick={() => setInvitedId(candidate.id)}>
                      {isInvited ? "Invitado" : "Invitar para revisar"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[12.5px] text-ink-2">
        La persona invitada recibe una notificación; el rol de Revisor de aportes se
        aplica solo dentro de esta campaña.
      </p>
    </div>
  );
}
