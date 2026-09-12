// Permisos que dependen de UNA campaña: creador, revisor aceptado, baneado.
// En la rama, quien crea la campaña la administra desde /mis-campanas/[id]/*.
import { and, eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { campaigns, campaignBans, campaignReviewers } from '@/server/db/schema';
import type { Actor } from '@/server/auth/permissions';
import { AppError } from '@/server/http/errors';

export async function getCampaignAccess(actor: Actor | null, campaignId: string) {
  const [campaign] = await db
    .select({ id: campaigns.id, creatorId: campaigns.creatorId, status: campaigns.status, dataTypes: campaigns.dataTypes })
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);
  if (!campaign) throw new AppError(404, 'NO_ENCONTRADO', 'La campaña no existe.');

  if (!actor) return { campaign, isOwner: false, isReviewer: false, isBanned: false };

  const [[reviewer], [ban]] = await Promise.all([
    db.select({ userId: campaignReviewers.userId }).from(campaignReviewers)
      .where(and(eq(campaignReviewers.campaignId, campaignId), eq(campaignReviewers.userId, actor.id), eq(campaignReviewers.status, 'aceptado')))
      .limit(1),
    db.select({ userId: campaignBans.userId }).from(campaignBans)
      .where(and(eq(campaignBans.campaignId, campaignId), eq(campaignBans.userId, actor.id)))
      .limit(1),
  ]);

  return { campaign, isOwner: campaign.creatorId === actor.id, isReviewer: !!reviewer, isBanned: !!ban };
}

// Bandeja, panel, compartir, especial, agregar revisor, editar, pausar: solo el creador.
export async function assertCampaignOwner(actor: Actor | null, campaignId: string) {
  if (!actor) throw new AppError(401, 'NO_AUTENTICADO', 'Inicia sesión para continuar.');
  const access = await getCampaignAccess(actor, campaignId);
  if (!access.isOwner) throw new AppError(403, 'SIN_PERMISO', 'Solo quien administra la campaña puede hacer esto.');
  return access;
}
