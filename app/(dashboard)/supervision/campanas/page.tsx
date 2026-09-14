import Link from "next/link";
import Tag from "@/components/ui/Tag";
import { BackLink } from "../_ui";

const campaigns = [
  ["censo-arboles", "Censo de árboles urbanos", "Medio ambiente", "Activa", "90 / 200", "45%", "12"],
  ["mapa-bancas", "Mapa de bancas públicas", "Movilidad", "Activa", "142 / 250", "57%", "18"],
  ["huertos-comunitarios", "Huertos comunitarios", "Medio ambiente", "Pausada", "74 / 250", "30%", "9"],
] as const;

export default function SupervisedCampaignsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <BackLink href="/supervision">Volver a supervisar</BackLink>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div><p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">Supervisión</p><h1 className="mt-2 text-2xl font-extrabold text-ink">Campañas supervisadas</h1><p className="mt-1 text-[13px] text-ink-2">3 registradas · mostrando todas</p></div>
        <span className="rounded-pill border border-line-2 bg-surface px-4 py-2 text-[12.5px] text-ink-3">Buscar campaña</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-surface p-5 shadow-sm">
        <table className="w-full min-w-[700px] text-left text-[13px]">
          <thead className="border-b border-line font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3"><tr><th className="pb-3 font-medium">Campaña</th><th className="pb-3 font-medium">Estado</th><th className="pb-3 font-medium">Progreso</th><th className="pb-3 font-medium">Participantes</th><th className="pb-3" /></tr></thead>
          <tbody>{campaigns.map(([id, name, theme, status, progress, percent, participants]) => <tr key={id} className="border-b border-line last:border-0"><td className="py-4"><p className="font-bold text-ink">{name}</p><p className="text-[12px] text-ink-3">{theme}</p></td><td><Tag tone={status === "Activa" ? "ok" : "warn"}>{status}</Tag></td><td className="w-44"><div className="h-2 overflow-hidden rounded-pill bg-sunken"><div className="h-full rounded-pill bg-ok" style={{ width: percent }} /></div><p className="mt-1 font-mono text-[11px] text-ink-3">{progress}</p></td><td className="font-mono text-ink-2">{participants}</td><td><div className="flex justify-end gap-2"><Link href={`/supervision/${id}/usuarios`} className="rounded-pill border border-line-2 px-3 py-1.5 text-[12px] font-bold text-ink-2 hover:border-accent">Usuarios</Link><Link href={`/supervision/${id}/panel`} className="rounded-pill border border-line-2 px-3 py-1.5 text-[12px] font-bold text-ink-2 hover:border-accent">Panel</Link></div></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
