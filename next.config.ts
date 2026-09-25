import type { NextConfig } from "next";

// Subruta de publicación (p. ej. "/dataforgood"). Se fija en el build: Next
// la incrusta en el bundle del cliente, así que cambiarla exige recompilar.
// Sin BASE_PATH la app queda en la raíz, como en `next dev`.
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Genera .next/standalone (server.js mínimo + solo los node_modules que se
  // usan en runtime), lo que usa el Dockerfile para no copiar node_modules
  // completo a la imagen. No hay servidor personalizado en este repo, así
  // que es compatible (ver AGENTS.md).
  output: "standalone",
  basePath,
  // Con basePath, la raíz del dominio queda en 404. Al abrir
  // http://localhost:3000/ se manda a la app. En producción el proxy solo
  // reenvía /dataforgood/..., así que esto no interfiere con otros sitios.
  async redirects() {
    if (!basePath) return [];
    return [{ source: "/", destination: basePath, basePath: false, permanent: false }];
  },
  env: {
    // Lo lee lib/base-path.ts para prefijar fetch, <img>, <a> y redirects.
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
