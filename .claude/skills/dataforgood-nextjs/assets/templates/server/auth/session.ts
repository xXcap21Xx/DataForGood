// Sesiones guardadas en PostgreSQL con cookie httpOnly. Un solo origen (Next + Express en el mismo
// proceso) hace innecesarios los JWT en localStorage, que además quedan expuestos a XSS.
import { createHash, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { sessions, users, userRoles } from '@/server/db/schema';
import { isProd } from '@/server/env';
import { permissionsFor, type Actor, type GlobalRole } from './permissions';

export const SESSION_COOKIE = 'dfg_session';
const SESSION_DAYS = 30;
const RENEW_WHEN_DAYS_LEFT = 15;
const DAY_MS = 24 * 60 * 60 * 1000;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export interface SessionUser extends Actor {
  email: string;
  alias: string;
  verified: boolean; // false mientras la cuenta está en pendiente_verificacion
  sessionExpiresAt: Date;
  renewed: boolean; // true si validateSession extendió la sesión: Express debe reenviar la cookie
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY_MS);
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });
  return { token, expiresAt };
}

// renew=false en Server Components: durante el render no se pueden escribir cookies,
// así que la renovación solo ocurre en peticiones que pasan por Express.
export async function validateSession(token: string, { renew }: { renew: boolean }): Promise<SessionUser | null> {
  const id = hashToken(token);
  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id))
    .limit(1);

  if (!row) return null;
  // Suspendidas y baneadas no tienen sesión. Pendientes de verificar sí (para completar /verificar),
  // pero sin permisos de participación.
  const blocked = row.user.status === 'suspendido' || row.user.status === 'baneado';
  if (row.session.expiresAt.getTime() <= Date.now() || blocked) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }

  let expiresAt = row.session.expiresAt;
  let renewed = false;
  if (renew && expiresAt.getTime() - Date.now() < RENEW_WHEN_DAYS_LEFT * DAY_MS) {
    expiresAt = new Date(Date.now() + SESSION_DAYS * DAY_MS);
    await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id));
    renewed = true;
  }

  const roleRows = await db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, row.user.id));
  const roles = roleRows.map((r) => r.role as GlobalRole);
  const verified = row.user.status === 'activo' && row.user.emailVerifiedAt !== null;

  return {
    id: row.user.id,
    email: row.user.email,
    alias: row.user.alias,
    verified,
    roles,
    permissions: permissionsFor(roles, { verified }),
    sessionExpiresAt: expiresAt,
    renewed,
  };
}

export async function invalidateSession(token: string) {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

// Al banear o quitar roles, cerrar todas las sesiones para que el cambio aplique de inmediato.
export async function invalidateAllSessionsForUser(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export const sessionCookieOptions = (expires: Date) => ({
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  path: '/',
  expires,
});
