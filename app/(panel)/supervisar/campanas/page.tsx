// Pantalla /supervisar/campanas: campañas supervisadas por el SuperUsuario.
// Server Component. Datos: listarCampanasParaRoot().

import Link from "next/link";
import Tag from "@/components/ui/Tag";
import { listarCampanasParaRoot } from "@/lib/supervision/root";
import { BackLink } from "../_ui";

export default async function SupervisedCampaignsPage() {
  const { supervisadas } = await listarCampanasParaRoot();
  const campaigns = supervisadas.filter((c) => c.status === "activa" || c.status === "aceptada");

  return (
    <div className="mx-auto max-w-5xl">
      <BackLink href="/supervisar">Volver a supervisar</BackLink>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div><p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">Modo supervisor · SuperUsuario</p><h1 className="mt-2 text-2xl font-extrabold text-ink">Campañas supervisadas</h1><p className="mt-1 text-[13px] text-ink-2">{campaigns.length} registradas · mostrando todas</p></div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-surface p-5 shadow-sm">
        <table className="w-full min-w-[700px] text-left text-[13px]">
          <thead className="border-b border-line font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3"><tr><th className="pb-3 font-medium">Campaña</th><th className="pb-3 font-medium">Estado</th><th className="pb-3 font-medium">Progreso</th><th className="pb-3 font-medium">Participantes</th><th className="pb-3" /></tr></thead>
          <tbody>
            {campaigns.map((campaign) => {
              const percent = campaign.goalContributions > 0
                ? `${Math.min(100, Math.round((campaign.currentContributions / campaign.goalContributions) * 100))}%`
                : "0%";

              return (
                <tr key={campaign.id} className="border-b border-line last:border-0">
                  <td className="py-4"><p className="font-bold text-ink">{campaign.name}</p><p className="text-[12px] text-ink-3">{campaign.tag || "Sin temática"}</p></td>
                  <td><Tag tone={campaign.status === "activa" ? "ok" : "warn"}>{campaign.status === "activa" ? "Activa" : "Aceptada"}</Tag></td>
                  <td className="w-44"><div className="h-2 overflow-hidden rounded-pill bg-sunken"><div className="h-full rounded-pill bg-ok" style={{ width: percent }} /></div><p className="mt-1 font-mono text-[11px] text-ink-3">{campaign.currentContributions} / {campaign.goalContributions}</p></td>
                  <td className="font-mono text-ink-2">{campaign.participants}</td>
                  <td><div className="flex justify-end gap-2"><Link href={`/supervisar/${campaign.id}/usuarios`} className="rounded-pill border border-line-2 px-3 py-1.5 text-[12px] font-bold text-ink-2 hover:border-accent">Usuarios</Link><Link href={`/supervisar/${campaign.id}/panel`} className="rounded-pill border border-line-2 px-3 py-1.5 text-[12px] font-bold text-ink-2 hover:border-accent">Panel</Link></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
