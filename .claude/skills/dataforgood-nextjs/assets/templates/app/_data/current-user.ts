// Lado Next: helpers para Server Components y layouts. `server-only` va AQUÍ y nunca dentro de
// server/**: ese paquete lanza un error al importarse desde Node plano y tumbaría Express.
import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, validateSession } from '@/server/auth/session';
import type { Permission } from '@/server/auth/permissions';

// cache() evita consultar la sesión varias veces en un mismo render (layout + page + componentes).
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value; // en Next 16 cookies() es async
  return token ? validateSession(token, { renew: false }) : null;
});

// Úsalo en el layout o page de cada zona protegida. Es control de acceso real (proxy.ts no lo es).
export async function requirePagePermission(permission: Permission) {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar');
  if (!user.permissions.has(permission)) redirect('/campanas');
  return user;
}
