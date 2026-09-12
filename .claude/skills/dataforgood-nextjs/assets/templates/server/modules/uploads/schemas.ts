import { z } from 'zod';

const MB = 1024 * 1024;

// Reglas por tipo de archivo. El servidor decide, nunca el cliente.
// foto: tomado de la rama (/campanas/[id]/aportar): .jpg .jpeg .png, máximo 10 MB, sin compresión automática.
// video, audio y documento: la rama aún no los define. Valores PROVISIONALES: confirmarlos con el equipo.
// Audio: Chrome/Android graba audio/webm y Safari/iOS audio/mp4 con MediaRecorder; ambos deben permitirse.
export const KIND_RULES = {
  foto: { maxBytes: 10 * MB, mimes: ['image/jpeg', 'image/png'] },
  video: { maxBytes: 300 * MB, mimes: ['video/mp4', 'video/webm', 'video/quicktime'] }, // provisional
  audio: { maxBytes: 50 * MB, mimes: ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-m4a'] }, // provisional
  documento: { maxBytes: 20 * MB, mimes: ['application/pdf'] }, // provisional
} as const;

export type MediaKind = keyof typeof KIND_RULES;

export const presignSchema = z.object({
  campaignId: z.uuid(),
  kind: z.enum(['foto', 'video', 'audio', 'documento']),
  mimeType: z.string().min(3).max(100),
  sizeBytes: z.number().int().positive(),
});
export type PresignInput = z.infer<typeof presignSchema>;

export const uploadIdSchema = z.object({ id: z.uuid() });
