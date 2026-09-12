// Router = capa delgada: validar entrada, llamar al service, responder. Sin lógica de negocio.
// Toda ruta lleva requireAuth / requirePermission, o el comentario // @public si es abierta a propósito
// (el script check-integrity lo verifica).
import { Router } from 'express';
import { requireAuth, requirePermission } from '@/server/http/middleware';
import { parseInput } from '@/server/http/errors';
import { presignSchema, uploadIdSchema } from './schemas';
import * as uploads from './service';

export const uploadsRouter = Router();

// RF-WEB-XX: el colaborador sube evidencia multimedia a una campaña
uploadsRouter.post('/presign', requirePermission('aportes.crear'), async (req, res) => {
  const input = parseInput(presignSchema, req.body);
  res.status(201).json(await uploads.createUploadIntent(req.user!, input));
});

uploadsRouter.post('/:id/complete', requirePermission('aportes.crear'), async (req, res) => {
  const { id } = parseInput(uploadIdSchema, req.params);
  res.json(await uploads.completeUpload(req.user!, id));
});

uploadsRouter.get('/:id/view-url', requireAuth, async (req, res) => {
  const { id } = parseInput(uploadIdSchema, req.params);
  res.json(await uploads.getViewUrl(req.user!, id));
});
