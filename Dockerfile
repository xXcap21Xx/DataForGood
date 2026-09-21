# Next.js 16 plano (sin servidor personalizado): next build -> output "standalone".
# Ver AGENTS.md antes de tocar este archivo si el proyecto llega a agregar
# un servidor Express propio; ese caso no es compatible con "standalone".

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# npm install en vez de npm ci: el lockfile se genera en Windows y algunos
# paquetes (lightningcss de Tailwind, unrs-resolver de eslint) traen
# binarios nativos opcionales por plataforma (linux-musl vs win32) que
# quedan inconsistentes entre Windows y esta imagen; instalar directo en
# Linux resuelve el binario correcto para cada uno.
RUN npm install

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
