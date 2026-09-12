// Validar variables de entorno al arrancar: mejor fallar al inicio que a mitad de una petición.
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  HOST: z.string().default('0.0.0.0'), // no usar HOSTNAME: Docker lo rellena con el id del contenedor
  APP_ORIGIN: z.url(), // p. ej. http://localhost:3000 — se compara con el header Origin en mutaciones
  DATABASE_URL: z.url(),
  RUN_MIGRATIONS: z.stringbool().default(false),
  S3_INTERNAL_ENDPOINT: z.url(), // cómo llega el SERVIDOR a MinIO (p. ej. http://minio:9000 dentro de Docker)
  S3_PUBLIC_ENDPOINT: z.url(), // cómo llega el NAVEGADOR a MinIO; las URLs firmadas se generan con este host
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().default('dataforgood-aportes'),
});

export type Env = z.infer<typeof schema>;

// `next build` importa las páginas para analizarlas y eso ejecuta este archivo. Durante la
// compilación (p. ej. dentro de Docker) no existen los secretos, así que ahí no se valida.
// En tiempo de ejecución la validación es estricta.
const isNextBuild = process.env.NEXT_PHASE === 'phase-production-build';

export const env: Env = isNextBuild ? (process.env as unknown as Env) : schema.parse(process.env);
export const isProd = env.NODE_ENV === 'production';
