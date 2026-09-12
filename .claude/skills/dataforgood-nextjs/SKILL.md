---
name: dataforgood-nextjs
description: Arquitectura, reglas de negocio, convenciones, plantillas probadas y flujo de trabajo de DataForGood, plataforma web responsiva de crowdsourcing de datos construida con Next.js 16 (App Router, estructura en la raíz, rama Prueba1) más un servidor Node.js + Express 5 en el mismo proceso, estrictamente PostgreSQL (Drizzle, JSONB) y MinIO Community Edition, todo en Docker Compose. Úsala SIEMPRE que se trabaje en DataForGood o Data For Good, aunque no se mencione Next.js. Aplica a pantallas como /campanas, /mis-aportes, /mis-campanas, /entrar o /registro; a conectar los datos simulados de data/screensData.ts con la base de datos; y a endpoints /api, tablas, migraciones y subida de fotos, audio, video o documentos. También cubre campañas, aportes, cuotas, revisión en dos instancias, enlaces públicos, XP, roles (Usuario común, Revisor de aportes, Supervisor, SuperUsuario), Docker y diseño responsivo, y la revisión o depuración de código del proyecto.
---

# DataForGood · Next.js full-stack

DataForGood conecta organizaciones con personas que aportan información en campo (fotos, video, audio, documentos y texto) para campañas sociales, ambientales y comunitarias. Es la entrega de la residencia profesional de Carlos.

**El repositorio es la referencia.** Cuando esta skill y el código de la rama no coincidan en convenciones, estructura o reglas de negocio, manda el repositorio. Si el código tiene un error evidente (algo que falla o es inválido), señálalo y propón la corrección.

## Estado del proyecto (rama `Prueba1`, septiembre 2026)

- **Frontend completo con datos simulados:** 18 rutas, componentes UI propios, tokens de diseño en `app/globals.css`, tipos en `types/index.ts` y datos simulados en `data/screensData.ts`.
- **Todavía no existe:** backend, base de datos, subida real de archivos, sesión ni Docker.
- **Siguiente paso:** integrar las plantillas de esta skill y conectar pantalla por pantalla (`references/conectar-mocks.md`).

| Zona | Rutas |
| --- | --- |
| Pública | `/` (landing) |
| Cuenta, `(auth)` | `/entrar`, `/registro` → `/verificar` → `/bienvenida` |
| Participar, `(dashboard)` | `/campanas`, `/campanas/[id]`, `/campanas/[id]/aportar`, `/mis-aportes`, `/mis-aportes/[campanaId]` |
| Administrar campañas propias | `/mis-campanas`, `/mis-campanas/nueva` (`?edit=id`), `/mis-campanas/[id]/{panel, aportes, aportes/[aporteId], aportes/agregar-revisor, compartir, especial}` |
| Aún sin pantalla | enlace público `/c/[token]`, perfil, notificaciones, zona de Supervisor, panel de SuperUsuario, recuperar contraseña |

## Stack

Decisiones del equipo (no cambiarlas sin que lo pidan):

| Capa | Decisión |
| --- | --- |
| Frontend | Next.js **16.3.4**, React **19.2**, TypeScript, Tailwind CSS v4. Estructura **en la raíz** (`app/`, `components/`), alias `@/*` → `./*` |
| Servidor y API | Node.js + Express 5 como servidor personalizado de Next, en un solo proceso |
| Base de datos | **Estrictamente PostgreSQL** (`postgres:17-alpine`), también en pruebas |
| Archivos | **MinIO Community Edition**, imagen oficial final `minio/minio:RELEASE.2025-09-07T16-13-09Z`, sin parches: se usa con las medidas de `references/almacenamiento.md` |
| Infraestructura | **Todo en Docker Compose**: app, PostgreSQL, MinIO y su configuración inicial |

Valores por defecto de esta skill: Drizzle **0.45.x** (fijado), Zod 4, sesión en cookie httpOnly con tabla `sessions`, Vitest (requiere `@types/node` 24).

## Qué leer según la tarea

| Tarea | Archivo |
| --- | --- |
| Reglas de negocio: campañas, aportes, cuotas, revisión, enlaces, XP, cuentas; **puntos abiertos** | `references/dominio.md` |
| Conectar una pantalla con datos reales; errores detectados en la rama | `references/conectar-mocks.md` |
| Servidor personalizado, flujo de una petición, Docker | `references/arquitectura.md` |
| Tablas, migraciones, JSONB, consultas | `references/base-de-datos.md` |
| Subir o mostrar archivos; MinIO | `references/almacenamiento.md` |
| Registro, verificación, sesión, roles, permisos, baneos | `references/roles-y-sesiones.md` |
| Tokens, componentes existentes, layouts, móvil, captura multimedia | `references/ui-responsiva.md` |

Las plantillas de `assets/templates/` están **probadas integradas en la rama `Prueba1`**. Compilan con `tsc`, pasan lint y Vitest, generan la migración con drizzle-kit, y superaron 12 comprobaciones contra PostgreSQL real: verificación de cuenta, campaña activa, tipo de dato, límite de 10 MB, baneo en campaña, dueño y revisor.

## Reglas del proyecto

1. **La lógica vive en services** (`server/modules/<modulo>/service.ts`) y la autorización se verifica ahí. Hay dos niveles:
   - `assertCan` para permisos globales;
   - `getCampaignAccess` o `assertCampaignOwner` para lo que depende de una campaña (creador, revisor aceptado, baneado).
2. **`types/index.ts` es el contrato de datos.** Los services devuelven esos tipos (campos en inglés camelCase, valores de estado en español). Si hay que cambiar un tipo, es un cambio consciente que se menciona al entregar.
3. **Las reglas de negocio se aplican en el servidor**, aunque la interfaz ya las muestre: cuota por persona, máximo 5 campañas activas, transiciones de estado, motivo obligatorio al rechazar, tamaño y formato de archivos. La interfaz solo informa.
4. **Las mutaciones van por Express** (`/api/v1/...`), sin Server Actions. Para leer, los Server Components llaman al service directamente.
5. **Server Components por defecto.** Usa `'use client'` solo para interactividad, y **nunca en una función `async`**: en la rama eso produce un 500. En las páginas, lee los parámetros con `await params`. `useParams` no sirve para cargar datos del servidor.
6. **Reutiliza los componentes y tokens existentes** (`components/ui/*`, `bg-surface`, `text-ink-2`, `border-line`...). No introduzcas colores sueltos, otra tipografía ni botones nuevos. **No anides `<Link>` con `<Button>`**: usa `ButtonLink` (`references/ui-responsiva.md`).
7. **Todo singleton va en `globalThis`** (pool de Postgres, clientes S3). Sin eso, Express y Next crean instancias duplicadas; está comprobado.
8. **`import 'server-only'` solo va en `app/_data/*`**, nunca en `server/**`: tumba el proceso de Express.
9. **`express.json()` se monta solo dentro del router `/api`.** El traspaso a Next se hace con `app.use((req, res) => handle(req, res))`.
10. **Los archivos van directo del navegador a MinIO** con POST firmado. El bucket es privado.
11. **La sesión va en cookie httpOnly `SameSite=Lax`**, y toda mutación verifica `Origin`. Nada de tokens en localStorage.
12. **Diseño mobile-first**, respetando los patrones responsivos que ya existen. Revisa cada pantalla en 360, 768 y 1280 px.
13. **Roles:**
    - Supervisor lo asignan el SuperUsuario o un Supervisor activo.
    - Revisor de aportes es un rol **por campaña** (invitación que la persona acepta).
    - Asignaciones, baneos y dictámenes se registran en `audit_log`.
14. **Ubicación solo textual** (estado y ciudad). Nada de GPS, coordenadas ni `navigator.geolocation` sin petición explícita.
15. **Solo PostgreSQL**, sin SQLite, MySQL, MongoDB, `pg-mem` ni PGlite. **Todo corre en Docker** (`docker compose exec app ...`).
16. **MinIO sin parches:**
    - la app usa un usuario limitado a su bucket, nunca el root;
    - la consola solo en `127.0.0.1`;
    - en producción, la API S3 solo detrás de un proxy con TLS;
    - no cambies la imagen sin acuerdo.
17. **Antes de usar una API de Next, lee su guía en `node_modules/next/dist/docs/`**, como exige `AGENTS.md` de la rama.
18. **No inventes reglas.** `references/dominio.md` lista las contradicciones abiertas de la rama. Si una tarea depende de una, pregunta; si hay que avanzar, deja `// TODO(dominio): ...` y menciónalo.

## Estructura

```
DataForGood/                       (rama Prueba1 + lo que agregan las plantillas ✚)
├── AGENTS.md, CLAUDE.md           # instrucciones de Next 16 para agentes
├── app/
│   ├── layout.tsx, globals.css    # fuentes y tokens de diseño
│   ├── page.tsx                   # landing
│   ├── (auth)/                    # entrar, registro, verificar, bienvenida
│   ├── (dashboard)/               # campanas, mis-aportes, mis-campanas (TopBar + SidebarNav)
│   └── _data/current-user.ts   ✚  # helpers de servidor para páginas (server-only)
├── components/{ui, cards, layout}/  # Button, Card, Input, Tag, ProgressBar, MetricCard...
├── types/index.ts                 # contrato de datos
├── data/screensData.ts            # datos simulados: se reemplazan por services
├── lib/upload-media.ts         ✚  # subida desde el navegador
├── server/                     ✚  # SOLO servidor
│   ├── env.ts, db/{client.ts, schema/{core,campanas}.ts}
│   ├── auth/{permissions.ts, session.ts}, http/{app,middleware,errors}.ts
│   ├── storage/s3.ts
│   └── modules/<modulo>/{schemas,service,router}.ts  (campanas/access.ts, uploads, aportes, auth...)
├── server.ts                   ✚  # entrada única: Express + Next
├── docker/, docker-compose.yml, docker-compose.dev.yml, Dockerfile, .dockerignore  ✚
├── drizzle/, drizzle.config.ts, vitest.config.ts  ✚
└── scripts/check-integrity.mjs ✚
```

## Integrar el backend en la rama

1. **Copia `assets/templates/` a la raíz del repositorio** conservando rutas. Renombra `env.example` a `.env` y `dockerignore` a `.dockerignore`, y copia `scripts/check-integrity.mjs` a `scripts/`.
2. **Fusiona `package.scripts.json` con `package.json`** sin tocar las versiones que ya existen, sube `@types/node` a `24.x` e instala.
3. **En `.env`, cambia todas las claves.** La contraseña de Postgres debe tener solo letras, números y guiones.
4. **Ejecuta `npm run db:generate`**, revisa el SQL y versiona `drizzle/`.
5. **Levanta todo con `npm run docker:dev`**, aplica las migraciones con `docker compose exec app npm run db:migrate` y abre `/api/v1/health`.
6. **Conecta las pantallas una por una** siguiendo `references/conectar-mocks.md`.

`next/font/google` (Plus Jakarta Sans y JetBrains Mono) descarga las fuentes al compilar. Sin internet, `next build` falla; esto se comprobó.

## Flujo para una funcionalidad

1. **Ubica las reglas en `references/dominio.md`.** Si la tarea toca un punto abierto, pregunta.
2. **Esquema:** crea `server/db/schema/<modulo>.ts`, reexpórtalo, ejecuta `npm run db:generate` y **lee el SQL**.
3. **Service:** valida con Zod, luego `assertCan` o `assertCampaignOwner`, aplica las reglas de negocio, usa una transacción si hay varias escrituras, registra en `audit_log` y devuelve tipos de `types/index.ts`.
4. **Router:** mantenlo delgado (`requireAuth` o `requirePermission`, luego `parseInput`, luego el service) y móntalo en `server/http/app.ts`.
5. **Página:** un Server Component que obtiene el usuario, lee con el service y pasa props a un componente cliente hermano (patrón `NuevaCampanaForm.tsx`) que llama a la API y ejecuta `router.refresh()`.
6. **Pruebas:** reglas de permisos y de negocio del service, contra `dataforgood_test`.

## Cambios de versión que rompen código viejo

- **Next 16:** `params`, `searchParams`, `cookies()` y `headers()` son asíncronos.
- **Next 16:** `middleware.ts` pasó a llamarse `proxy.ts` y no es control de acceso.
- **Next 16:** Turbopack es el bundler por defecto y `output: 'standalone'` no funciona con servidor personalizado.
- **Next 16:** los headers propios se fijan **antes** de `handle(req, res)`.
- **Express 5:** los comodines necesitan nombre (`/{*splat}`), `req.query` es de solo lectura y los errores de handlers `async` llegan solos al manejador de errores.
- **Drizzle:** fija la versión 0.45.x; la documentación de la 1.0 beta usa otras APIs.

## Verificación antes de terminar

```bash
docker compose exec app sh -c "npx tsc --noEmit && npm run lint && npm run check:integridad"
docker compose exec -e DATABASE_URL=postgres://USUARIO:CLAVE@postgres:5432/dataforgood_test app npm test
docker compose build app
```

`check:integridad` revisa varias familias de problemas:

- **React y navegación:** componentes cliente `async`, `<Link>` anidado con `<Button>`, enlaces a rutas inexistentes.
- **Pendientes:** archivos que aún usan `data/screensData.ts`.
- **Seguridad y fronteras:** rutas de Express sin guardia, imports de `server/` desde componentes cliente, `server-only` dentro de `server/`, singletons fuera de `globalThis`, tokens en localStorage.
- **Decisiones del proyecto:** GPS, motores distintos de PostgreSQL, imagen de MinIO sin versión fija, app usando el root de MinIO y consola expuesta.
- **Registro SCR-WEB:** solo si existe `lib/screens.json` (opcional; la rama no lo usa).

Además, revisa cada pantalla en 360, 768 y 1280 px y con teclado.

## Al entregar el trabajo

Resume brevemente:

- los archivos creados o modificados;
- las reglas de `dominio.md` aplicadas;
- el resultado de las verificaciones (qué pasó y qué no se pudo ejecutar);
- los TODOs y puntos abiertos que requieren decisión del equipo.

No declares como probado algo que no ejecutaste.
