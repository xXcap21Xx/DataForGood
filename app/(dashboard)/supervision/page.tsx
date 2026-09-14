import Link from "next/link";
import Tag from "@/components/ui/Tag";

const pendingCampaigns = [
  ["ruido-nocturno", "Ruido nocturno en el centro", "Luis Márquez · Salud urbana · meta 300 aportes", "56 h sin asignar", "danger"],
  ["fauna-urbana", "Fauna urbana en parques", "Mara Ortiz · Protección animal · meta 400 aportes", "9 h sin asignar", "warn"],
  ["huertos-comunitarios", "Huertos comunitarios", "Ana Ruiz · Medio ambiente · meta 250 aportes", "Recién publicada", "ok"],
  ["bibliotecas-barrio", "Bibliotecas de barrio", "Ana R. · Educación · meta 200 aportes", "3 h sin asignar", "default"],
] as const;

export default function SupervisionPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">Supervisión</p>
          <h1 className="mt-2 text-2xl font-extrabold text-ink">Campañas por supervisar</h1>
          <p className="mt-1 text-[13px] text-ink-2">6 esperando revisión</p>
        </div>
        <span className="rounded-pill border border-line-2 bg-surface px-4 py-2 text-[12.5px] font-bold text-ink-2">Temática ▾</span>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <Tag tone="on">Por supervisar&nbsp; <span className="font-mono text-[11px]">6</span></Tag>
        <Link href="/supervision/campanas"><Tag>Campañas supervisadas&nbsp; <span className="font-mono text-[11px]">3</span></Tag></Link>
      </div>

      <div className="mb-3 rounded-lg border border-line bg-sunken px-4 py-3 text-[13px] text-ink-2">Selecciona una campaña para ver su detalle. Desde ahí podrás consultar a sus participantes y el panel de campaña.</div>

      <div className="space-y-3">
        {pendingCampaigns.map(([id, title, detail, status, tone]) => (
          <Link key={id} href={`/supervision/${id}`} className="block rounded-lg border border-line bg-surface p-5 shadow-sm transition-shadow hover:border-accent hover:shadow-md">
            <div className="mb-1.5 flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-[15px] font-extrabold text-ink">{title}</h2>
              <Tag tone={tone}>{status}</Tag>
            </div>
            <p className="text-[12.5px] text-ink-3">{detail}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
