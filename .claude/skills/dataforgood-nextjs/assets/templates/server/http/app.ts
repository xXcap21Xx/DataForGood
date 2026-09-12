import express, { Router } from 'express';
import { apiErrorHandler } from './errors';
import { loadSession, sameOriginMutations } from './middleware';
import { uploadsRouter } from '@/server/modules/uploads/router';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // detrás de un proxy inverso (Nginx/Caddy) para leer IP y protocolo reales

  const api = Router();
  // El body parser vive SOLO dentro de /api. Montado global consumiría el cuerpo de las
  // peticiones que Next necesita leer (formularios, route handlers).
  api.use(express.json({ limit: '1mb' }));
  api.use(sameOriginMutations);
  api.use(loadSession);

  api.get('/health', (_req, res) => { // @public
    res.json({ ok: true });
  });

  // Un router por módulo de dominio. Agregar aquí cada módulo nuevo.
  api.use('/uploads', uploadsRouter);

  // 404 y errores de la API siempre en JSON; sin esto, /api/loquesea caería en la página 404 de Next.
  api.use((_req, res) => {
    res.status(404).json({ error: { code: 'NO_ENCONTRADO', message: 'Recurso no encontrado.' } });
  });
  api.use(apiErrorHandler);

  app.use('/api/v1', api);
  return app;
}
