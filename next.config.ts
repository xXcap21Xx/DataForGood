import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Genera .next/standalone (server.js mínimo + solo los node_modules que se
  // usan en runtime), lo que usa el Dockerfile para no copiar node_modules
  // completo a la imagen. No hay servidor personalizado en este repo, así
  // que es compatible (ver AGENTS.md).
  output: "standalone",
};

export default nextConfig;
