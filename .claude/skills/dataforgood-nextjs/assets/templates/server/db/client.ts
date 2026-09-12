// Pool único guardado en globalThis. Next empaqueta aparte el código que importan las páginas,
// así que sin esto Express y Next crean DOS pools (comprobado con Next 16 + servidor personalizado).
import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from './schema';
import { env } from '@/server/env';

export type DB = NodePgDatabase<typeof schema>;

const g = globalThis as typeof globalThis & { __dfgPool?: Pool; __dfgDb?: DB };

const pool = (g.__dfgPool ??= new Pool({ connectionString: env.DATABASE_URL, max: 10 }));
export const db: DB = (g.__dfgDb ??= drizzle({ client: pool, schema }));

export async function runMigrations() {
  await migrate(db, { migrationsFolder: './drizzle' });
}
