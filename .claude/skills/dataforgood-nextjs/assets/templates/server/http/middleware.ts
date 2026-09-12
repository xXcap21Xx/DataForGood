import type { RequestHandler } from 'express';
import { parse as parseCookie } from 'cookie';
import { env } from '@/server/env';
import { SESSION_COOKIE, sessionCookieOptions, validateSession, type SessionUser } from '@/server/auth/session';
import type { Permission } from '@/server/auth/permissions';
import { AppError } from './errors';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser | null;
    }
  }
}

export const loadSession: RequestHandler = async (req, res, next) => {
  const token = parseCookie(req.headers.cookie ?? '')[SESSION_COOKIE];
  req.user = token ? await validateSession(token, { renew: true }) : null;
  if (token && req.user?.renewed) {
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions(req.user.sessionExpiresAt));
  }
  if (token && !req.user) res.clearCookie(SESSION_COOKIE, { path: '/' });
  next();
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) throw new AppError(401, 'NO_AUTENTICADO', 'Inicia sesión para continuar.');
  next();
};

// Guardia de ruta. El service vuelve a verificar con assertCan: defensa en profundidad.
export const requirePermission =
  (permission: Permission): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) throw new AppError(401, 'NO_AUTENTICADO', 'Inicia sesión para continuar.');
    if (!req.user.permissions.has(permission)) {
      throw new AppError(403, 'SIN_PERMISO', 'No tienes permiso para realizar esta acción.');
    }
    next();
  };

// Protección CSRF: la cookie es SameSite=Lax y además toda mutación debe venir de nuestro origen.
// Los navegadores envían Origin en POST/PUT/PATCH/DELETE, incluso en peticiones del mismo origen.
const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
export const sameOriginMutations: RequestHandler = (req, _res, next) => {
  if (UNSAFE.has(req.method) && req.get('origin') !== env.APP_ORIGIN) {
    throw new AppError(403, 'ORIGEN_NO_PERMITIDO', 'Petición rechazada.');
  }
  next();
};
