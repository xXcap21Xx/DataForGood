import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema/index.ts',
  out: './drizzle', // las migraciones SQL generadas se versionan en git
  dbCredentials: { url: process.env.DATABASE_URL! },
  strict: true,
  verbose: true,
});
