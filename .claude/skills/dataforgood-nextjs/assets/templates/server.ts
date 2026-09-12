// Punto de entrada único: un proceso Node con Express 5 (API) + Next.js 16 (páginas).
// No pasa por el compilador de Next: se ejecuta con tsx en dev y se empaqueta con esbuild para producción.
import { createServer } from 'node:http';
import next from 'next';
import { env } from '@/server/env';
import { createApp } from '@/server/http/app';
import { runMigrations } from '@/server/db/client';
import { waitForStorage } from '@/server/storage/s3';

async function main() {
  const dev = env.NODE_ENV !== 'production';

  if (env.RUN_MIGRATIONS) await runMigrations();
  await waitForStorage();

  // Crear el http.Server primero y pasárselo a Next permite que el HMR (websockets) funcione en dev.
  const httpServer = createServer();
  const nextApp = next({ dev, hostname: 'localhost', port: env.PORT, httpServer });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();

  const app = createApp(); // monta /api/v1 con su propio body parser y manejador de errores
  // Todo lo que no sea /api lo resuelve Next. Sin comodín: en Express 5 '*' ya no es válido.
  app.use((req, res) => handle(req, res));

  httpServer.on('request', app);
  httpServer.listen(env.PORT, env.HOST, () => {
    console.log(`> DataForGood en http://localhost:${env.PORT} (${dev ? 'desarrollo' : 'producción'})`);
  });
}

main().catch((err) => {
  console.error('Error al iniciar el servidor', err);
  process.exit(1);
});
