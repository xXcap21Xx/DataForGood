import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { pool } from "@/lib/db";
import { ensureCoreSchema } from "@/lib/db-schema";
import { getSessionUser } from "@/lib/session";

export default async function ReviewerUsersPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  await ensureCoreSchema();
  const reviewer = await getSessionUser();
  if (!reviewer) redirect("/entrar");
  const campaignResult = await pool.query(`SELECT c.id, c.name FROM campanas c JOIN campana_revisores cr ON cr.campana_id = c.id WHERE c.id = $1 AND cr.usuario_id = $2 AND cr.estado = 'aceptado' LIMIT 1`, [campaignId, reviewer.id]);
  if (campaignResult.rowCount === 0) notFound();
  const users = await pool.query(`SELECT a.user_id AS id, MAX(a.participant_name) AS name, MAX(a.participant_email) AS email, COUNT(*)::int AS contributions, MAX(a.reviewed_at) AS last_reviewed FROM aportes a WHERE a.campaign_id = $1 AND a.first_pass_by_user_id = $2 AND a.status = 'aceptado' AND a.user_id IS NOT NULL GROUP BY a.user_id ORDER BY MAX(a.reviewed_at) DESC`, [campaignId, reviewer.id]);

  return <div className="mx-auto max-w-5xl">
    <Link href={`/revisiones/campanas/${campaignId}`} className="mb-5 inline-block text-[13px] text-ink-2 hover:text-ink">← Volver a campaña</Link>
    <div className="mb-6"><p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">Aportes aceptados por ti</p><h1 className="mt-2 text-2xl font-extrabold text-ink">Usuarios · {campaignResult.rows[0].name}</h1><p className="mt-1 text-[13px] text-ink-2">Selecciona un usuario para consultar sus aportes aceptados.</p></div>
    {users.rowCount === 0 ? <div className="rounded-lg border border-dashed border-line-2 p-6 text-sm text-ink-2">Aún no has aceptado aportes de usuarios en esta campaña.</div> : <div className="overflow-x-auto rounded-lg border border-line bg-surface p-5 shadow-sm"><table className="w-full min-w-[650px] text-left text-[13px]"><thead className="border-b border-line font-mono text-[10px] uppercase tracking-[.1em] text-ink-3"><tr><th className="pb-3 font-medium">Usuario</th><th className="pb-3 font-medium">Aportes aceptados</th><th className="pb-3 font-medium">Última revisión</th><th /></tr></thead><tbody>{users.rows.map((participant) => <tr key={participant.id} className="border-b border-line last:border-0"><td className="py-4"><p className="font-bold text-ink">{participant.name}</p><p className="font-mono text-[11px] text-ink-3">{participant.email || "Sin correo"}</p></td><td className="font-mono text-ink-2">{participant.contributions}</td><td className="font-mono text-[12px] text-ink-3">{participant.last_reviewed ? new Date(participant.last_reviewed).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) : "Sin dato"}</td><td className="text-right"><Link href={`/revisiones/campanas/${campaignId}/usuarios/${participant.id}/aportes`} className="rounded-pill border border-line-2 px-3 py-1.5 text-[12px] font-bold text-ink-2 hover:border-accent">Ver aportes</Link></td></tr>)}</tbody></table></div>}
  </div>;
}
