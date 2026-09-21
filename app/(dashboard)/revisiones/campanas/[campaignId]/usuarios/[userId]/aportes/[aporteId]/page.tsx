import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Tag from "@/components/ui/Tag";
import { pool } from "@/lib/db";
import { ensureCoreSchema } from "@/lib/db-schema";
import { getSessionUser } from "@/lib/session";

export default async function ReviewerContributionDetailPage({ params }: { params: Promise<{ campaignId: string; userId: string; aporteId: string }> }) {
  const { campaignId, userId, aporteId } = await params;
  await ensureCoreSchema();
  const reviewer = await getSessionUser();
  if (!reviewer) redirect("/entrar");

  const result = await pool.query(
    `SELECT a.id, a.participant_name, a.participant_email, a.description, a.file_type,
            a.file_size_bytes, a.caracteristicas, a.submitted_at, a.reviewed_at,
            c.name AS campaign_name
     FROM aportes a
     JOIN campanas c ON c.id = a.campaign_id
     JOIN campana_revisores cr ON cr.campana_id = c.id
     WHERE a.id = $1 AND a.campaign_id = $2 AND a.user_id = $3
       AND a.first_pass_by_user_id = $4 AND a.status = 'aceptado'
       AND cr.usuario_id = $4 AND cr.estado = 'aceptado'
     LIMIT 1`,
    [aporteId, campaignId, userId, reviewer.id]
  );
  if (result.rowCount === 0) notFound();

  const contribution = result.rows[0];
  const features = Array.isArray(contribution.caracteristicas) ? contribution.caracteristicas : [];
  const fileSize = contribution.file_size_bytes ? ` · ${(Number(contribution.file_size_bytes) / 1_000_000).toFixed(1)} MB` : "";

  return (
    <div className="mx-auto max-w-4xl">
      <Link href={`/revisiones/campanas/${campaignId}/usuarios/${userId}/aportes`} className="mb-5 inline-block text-[13px] text-ink-2 hover:text-ink">
        ← Volver a aportes
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[.12em] text-accent">Detalle del aporte</p>
          <h1 className="mt-2 text-2xl font-extrabold text-ink">Aporte #{contribution.id}</h1>
          <p className="mt-1 text-[13px] text-ink-2">{contribution.participant_name} · {contribution.campaign_name}</p>
        </div>
        <Tag tone="ok">Aceptado por ti</Tag>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,.9fr)]">
        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="mb-3 text-[15px] font-extrabold text-ink">Archivo aprobado</h2>
          {contribution.file_type === "foto" ? (
            <a href={`/api/aportes/${aporteId}/archivo`} target="_blank" rel="noreferrer" className="block">
              <img
                src={`/api/aportes/${aporteId}/archivo`}
                alt={`Imagen aportada por ${contribution.participant_name}`}
                className="aspect-video w-full rounded-lg border border-line-2 bg-sunken object-contain"
              />
              <span className="mt-3 inline-block text-[12.5px] font-bold text-accent">Abrir imagen en tamaño completo</span>
            </a>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-line-2 bg-sunken text-[12.5px] text-ink-3">
              Vista previa no disponible para {contribution.file_type}
            </div>
          )}
          <p className="mt-3 font-mono text-[11.5px] text-ink-3">{contribution.file_type}{fileSize}</p>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-[15px] font-extrabold text-ink">Datos del aporte</h2>
          <dl className="mt-4 space-y-3 text-[13px]">
            <div className="flex justify-between gap-4 border-b border-line pb-3"><dt className="text-ink-2">Participante</dt><dd className="text-right font-medium text-ink">{contribution.participant_name}</dd></div>
            <div className="flex justify-between gap-4 border-b border-line pb-3"><dt className="text-ink-2">Correo</dt><dd className="text-right text-ink">{contribution.participant_email || "Sin correo"}</dd></div>
            <div className="border-b border-line pb-3"><dt className="text-ink-2">Descripción</dt><dd className="mt-1 leading-6 text-ink">{contribution.description}</dd></div>
            <div className="border-b border-line pb-3"><dt className="text-ink-2">Características</dt><dd className="mt-2 flex flex-wrap gap-1.5">{features.length > 0 ? features.map((item: string) => <Tag key={item}>{item}</Tag>) : "Sin características"}</dd></div>
            <div className="flex justify-between gap-4 border-b border-line pb-3"><dt className="text-ink-2">Enviado</dt><dd className="text-right font-mono">{new Date(contribution.submitted_at).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-ink-2">Aceptado</dt><dd className="text-right font-mono">{contribution.reviewed_at ? new Date(contribution.reviewed_at).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) : "Sin dato"}</dd></div>
          </dl>
        </section>
      </div>
    </div>
  );
}
