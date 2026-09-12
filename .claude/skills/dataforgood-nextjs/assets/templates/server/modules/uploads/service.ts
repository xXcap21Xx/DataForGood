// Service = lógica de negocio + autorización. No conoce Express ni Next: recibe un actor y datos
// ya validados. Lo llaman tanto los routers de Express como los Server Components.
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '@/server/db/client';
import { mediaObjects } from '@/server/db/schema';
import { assertCan, type Actor } from '@/server/auth/permissions';
import { getCampaignAccess } from '@/server/modules/campanas/access';
import { AppError } from '@/server/http/errors';
import { BUCKET, s3Internal, s3Public } from '@/server/storage/s3';
import { KIND_RULES, type PresignInput } from './schemas';

const UPLOAD_URL_TTL_S = 5 * 60;
const VIEW_URL_TTL_S = 10 * 60;

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf',
  'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/x-m4a': 'm4a',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
};

// MediaRecorder reporta cosas como "audio/webm;codecs=opus": quedarse solo con el tipo base.
const normalizeMime = (mime: string) => mime.split(';')[0].trim().toLowerCase();

export async function createUploadIntent(actor: Actor, input: PresignInput) {
  assertCan(actor, 'aportes.crear');
  const access = await getCampaignAccess(actor, input.campaignId);
  if (access.campaign.status !== 'activa') {
    throw new AppError(409, 'CAMPANA_NO_ACTIVA', 'La campaña no está recibiendo aportes.');
  }
  if (access.isBanned) throw new AppError(403, 'BANEADO_EN_CAMPANA', 'No puedes aportar a esta campaña.');
  if (!access.campaign.dataTypes.includes(input.kind)) {
    throw new AppError(422, 'TIPO_NO_SOLICITADO', 'Esta campaña no solicita ese tipo de dato.');
  }
  // La cuota por persona se valida al CREAR el aporte (módulo aportes), no aquí: ver references/dominio.md.

  const rule = KIND_RULES[input.kind];
  const mimeType = normalizeMime(input.mimeType);
  if (!(rule.mimes as readonly string[]).includes(mimeType)) {
    throw new AppError(415, 'TIPO_NO_PERMITIDO', 'Este tipo de archivo no está permitido.');
  }
  if (input.sizeBytes > rule.maxBytes) {
    throw new AppError(413, 'ARCHIVO_DEMASIADO_GRANDE', 'El archivo supera el tamaño máximo permitido.');
  }

  const objectKey = `campanas/${input.campaignId}/aportes/${randomUUID()}.${EXT[mimeType] ?? 'bin'}`;
  const [row] = await db
    .insert(mediaObjects)
    .values({ ownerId: actor.id, campaignId: input.campaignId, kind: input.kind, objectKey, mimeType, sizeBytes: input.sizeBytes })
    .returning({ id: mediaObjects.id });

  // POST firmado (no PUT): permite que MinIO rechace archivos fuera de tamaño o con otro Content-Type.
  const { url, fields } = await createPresignedPost(s3Public, {
    Bucket: BUCKET,
    Key: objectKey,
    Conditions: [
      ['content-length-range', 1, rule.maxBytes],
      ['eq', '$Content-Type', mimeType],
    ],
    Fields: { 'Content-Type': mimeType },
    Expires: UPLOAD_URL_TTL_S,
  });

  return { uploadId: row.id, url, fields, expiresIn: UPLOAD_URL_TTL_S };
}

// El cliente llama a esto cuando termina de subir. No se confía en el cliente: se consulta MinIO.
export async function completeUpload(actor: Actor, uploadId: string) {
  assertCan(actor, 'aportes.crear');
  const [media] = await db
    .select()
    .from(mediaObjects)
    .where(and(eq(mediaObjects.id, uploadId), eq(mediaObjects.ownerId, actor.id)))
    .limit(1);

  if (!media) throw new AppError(404, 'NO_ENCONTRADO', 'La subida no existe.');
  if (media.status !== 'pendiente') return { id: media.id, status: media.status };

  const head = await s3Internal
    .send(new HeadObjectCommand({ Bucket: BUCKET, Key: media.objectKey }))
    .catch(() => null);
  if (!head) throw new AppError(409, 'SUBIDA_INCOMPLETA', 'El archivo aún no llega al almacenamiento.');

  const rule = KIND_RULES[media.kind];
  const size = head.ContentLength ?? 0;
  if (size > rule.maxBytes || normalizeMime(head.ContentType ?? '') !== media.mimeType) {
    await db.update(mediaObjects).set({ status: 'rechazada', updatedAt: new Date() }).where(eq(mediaObjects.id, media.id));
    throw new AppError(422, 'ARCHIVO_RECHAZADO', 'El archivo no cumple las reglas de la campaña.');
  }

  await db
    .update(mediaObjects)
    .set({ status: 'lista', sizeBytes: size, updatedAt: new Date() })
    .where(eq(mediaObjects.id, media.id));
  return { id: media.id, status: 'lista' as const };
}

// El bucket es privado: los aportes pueden contener rostros o voces de personas de la comunidad.
// Pueden ver el archivo: su autor, quien administra la campaña y sus revisores aceptados.
export async function getViewUrl(actor: Actor, mediaId: string) {
  const [media] = await db.select().from(mediaObjects).where(eq(mediaObjects.id, mediaId)).limit(1);
  if (!media || media.status !== 'lista') throw new AppError(404, 'NO_ENCONTRADO', 'Archivo no disponible.');
  if (media.ownerId !== actor.id) {
    const access = await getCampaignAccess(actor, media.campaignId);
    if (!access.isOwner && !access.isReviewer) {
      throw new AppError(403, 'SIN_PERMISO', 'No tienes permiso para ver este archivo.');
    }
  }
  const url = await getSignedUrl(s3Public, new GetObjectCommand({ Bucket: BUCKET, Key: media.objectKey }), {
    expiresIn: VIEW_URL_TTL_S,
  });
  return { url, expiresIn: VIEW_URL_TTL_S };
}
