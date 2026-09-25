---
name: dataforgood-nextjs
description: Arquitectura, reglas de negocio, convenciones y flujo de trabajo de DataForGood, plataforma web responsiva de crowdsourcing de datos construida con Next.js 16 (App Router, estructura en la raíz) sin servidor personalizado, con route handlers en app/api, server actions, PostgreSQL vía `pg` con SQL directo (sin ORM) y MinIO, todo en Docker Compose. Úsala SIEMPRE que se trabaje en DataForGood o Data For Good, aunque no se mencione Next.js. Aplica a pantallas como /campanas, /mis-aportes, /mis-campanas, /revisiones, /supervision, /entrar o /registro, y al panel del SuperUsuario (/sistema, /usuarios, /supervisar); a route handlers de app/api, server actions de lib/, tablas en lib/db-schema.ts y subida de archivos a MinIO. También cubre campañas, aportes, cuotas, revisión en dos instancias, enlaces públicos, datos abiertos, XP, roles (Usuario común, Revisor de aportes, Supervisor, SuperUsuario), sanciones, Docker y diseño responsivo, y la revisión o depuración de código del proyecto.
---

# DataForGood · Next.js full-stack

DataForGood conecta organizaciones con personas que aportan información en campo (fotos, video, audio, documentos y texto) para campañas sociales, ambientales y comunitarias. Es la entrega de la residencia profesional de Carlos.

**El repositorio es la referencia.** Si esta skill y el código no coinciden, manda el código, y hay que actualizar la skill en el mismo commit. Si el código tiene un error evidente (algo que falla, es inválido o inseguro), señálalo y propón la corrección.

## Estado del proyecto (rama `migracion-github`, septiembre 2026)

- **Repositorio:** `gitlab.com/cicese-tepic-dev-1/dataforgood`. `main` está protegida; se trabaja en `migracion-github`.
- **Funciona de punta a punta con datos reales:** registro con verificación por correo, inicio de sesión (correo/contraseña y Google), campañas, aportes con archivo en MinIO, revisión en dos instancias, supervisión, notificaciones, catálogo de datos abiertos y panel del SuperUsuario.
- **Ya no existe `data/screensData.ts`:** ninguna pantalla usa datos simulados.
- **No hay pruebas automatizadas** (no hay Vitest ni otro runner).

| Zona | Rutas | Acceso |
| --- | --- | --- |
| Pública | `/`, `/datos`, `/datos/[id]`, `/contacto`, `/privacidad`, `/sobre-nosotros` | Libre |
| Cuenta, `(auth)` | `/entrar`, `/registro` → `/verificar` → `/bienvenida`; `/root` (entrada del SuperUsuario) | Libre |
| Participar, `(dashboard)` | `/campanas`, `/campanas/[id]`, `/campanas/[id]/aportar`, `/mis-aportes`, `/mis-aportes/[campanaId]`, `/cuenta` | Sesión de usuario |
| Administrar campañas propias | `/mis-campanas`, `/mis-campanas/nueva` (`?edit=id`), `/mis-campanas/[id]/{panel, aportes, aportes/[aporteId], aportes/agregar-revisor, compartir, especial}` | Creador |
| Revisión de aportes | `/revisiones`, `/revisiones/finalizadas`, `/revisiones/[aporteId]`, `/revisiones/campanas/[campaignId]/usuarios/...` | Revisor aceptado de la campaña |
| Supervisión (usuario promovido) | `/supervision`, `/supervision/campanas`, `/supervision/[campaignId]/{panel, usuarios/...}` | Rol `supervisor` |
| Panel del SuperUsuario, `(panel)` | `/sistema`, `/sistema/campanas{, /dashboard, /[id]}`, `/usuarios{, /dashboard, /[id]{, /roles, /sancion}, /sanciones, /supervisores{, /[id]{, /revertir/[accionId]}}}`, `/supervisar/...` | Sesión raíz (`root_sessions`) |
| Aún sin pantalla | enlace público `/c/[token]`, recuperar contraseña | — |

## Stack real

| Capa | Lo que hay |
| --- | --- |
| Frontend | Next.js **16.3.4**, React **19.2.8**, TypeScript, Tailwind CSS v4. Estructura **en la raíz** (`app/`, `components/`, `lib/`, `types/`), alias `@/*` → `./*` |
| Servidor | **El propio de Next** (`next start`, `output: "standalone"`). **No hay Express ni `server.ts`** |
| API | **Route handlers** en `app/api/**/route.ts` (sin versión: `/api/campanas`, no `/api/v1/...`) y **server actions** (`"use server"`) en `lib/**/acciones-*.ts` |
| Base de datos | PostgreSQL con **`pg` y SQL a mano** (`lib/db.ts`). **Sin ORM**: no hay Drizzle, Prisma ni migraciones versionadas; el DDL vive en `lib/db-schema.ts` |
| Validación | A mano (`lib/validation.ts`, regex, `Set` de valores permitidos). No hay Zod |
| Archivos | MinIO con el SDK `minio` (`lib/minio.ts`). El archivo pasa por el servidor (`putObject`), no hay URLs firmadas |
| Otros | `bcryptjs` (contraseñas), `nodemailer` + Gmail (códigos de verificación), `google-auth-library` (OAuth), `archiver` (ZIP de datos abiertos) |
| Infraestructura | Docker Compose con `postgres:16-alpine`, `quay.io/minio/minio` (solo la copia en caché: ya no se puede descargar), `minio-init` (usuario limitado) y la app (Dockerfile multi-stage, `node:24-alpine`). Secretos en `.env` (plantilla `.env.example`); Postgres y MinIO sin puertos publicados |

## Qué leer según la tarea

| Tarea | Archivo |
| --- | --- |
| Reglas de negocio: campañas, aportes, cuotas, revisión, supervisión, enlaces, XP, datos abiertos; **puntos abiertos** | `references/dominio.md` |
| Cómo fluye una petición, route handlers vs server actions, patrones de página, Docker | `references/arquitectura.md` |
| Tablas, esquema al arrancar, `audit_log`, JSONB, fechas y zonas horarias | `references/base-de-datos.md` |
| Sesiones (usuario y raíz), `proxy.ts` y `Origin`, roles, guardias, sanciones, bitácora | `references/roles-y-sesiones.md` |
| Subir o mostrar archivos; MinIO | `references/almacenamiento.md` |
| Tokens, componentes (`components/ui` y `components/sistema`), layouts, móvil | `references/ui-responsiva.md` |

## Reglas del proyecto

1. **Toda ruta o acción verifica la sesión y el permiso en el servidor.** `proxy.ts` solo redirige si falta la cookie y rechaza mutaciones de `/api` con `Origin` ajeno; no valida sesiones ni roles. Cada route handler llama a `getSessionUser()` (o `hasRootSession()`), cada server action empieza con su guardia y cada página de `(panel)` llama a `exigirSesionRoot()` además del layout. `getSessionUser()` ya devuelve `null` si la cuenta está suspendida o baneada (`lib/sanciones.ts`).
2. **Las acciones sensibles se registran en `audit_log`** con `registrarAuditoria()` (`lib/auditoria.ts`), después de completarse: cambios de rol, sanciones, dictámenes, tomar campaña, baneos por campaña, invitar o aceptar revisor, accesos a `/root`. Si agregas una acción de ese tipo, regístrala y amplía `AccionAuditada`.
3. **Las reglas de negocio se aplican en el servidor**, aunque la interfaz ya las muestre: cuota por persona, transiciones de estado, motivo obligatorio al rechazar, tamaño y formato de archivos, que el creador no aporte ni supervise sus campañas. La interfaz solo informa.
4. **Una regla, un lugar.** Si dos caminos (p. ej. `PATCH /api/campanas/[id]` y la server action del SuperUsuario) aplican la misma regla, se extrae a `lib/` (ejemplo: `lib/supervision/decision.ts`). No dupliques la lógica.
5. **SQL siempre parametrizado** (`$1, $2...`) con `pool.query` de `lib/db.ts`. Nunca concatenes valores del usuario. Si hay varias escrituras que deben ir juntas, usa una transacción con `pool.connect()` + `BEGIN/COMMIT/ROLLBACK`. Las operaciones con carrera (tomar una campaña) se resuelven con un `UPDATE ... WHERE` condicional, no con leer y luego escribir.
6. **El esquema vive solo en `lib/db-schema.ts`.** Columnas nuevas: agrégalas al `CREATE TABLE` **y** como `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. `ensureCoreSchema()` corre **una vez al arrancar** (`instrumentation.ts`); **no** lo llames en rutas ni acciones. Una tabla nueva va en su `ensureXTable()` y en `ensureCoreSchema()`. Las fechas con hora son `TIMESTAMPTZ`.
7. **`types/index.ts` es el contrato de datos del frontend de usuario** (campos en inglés camelCase, estados en español). Los route handlers mapean filas de snake_case a esos tipos. Si hay que cambiar un tipo, es un cambio consciente que se menciona al entregar.
8. **Cuál patrón usar:**
   - En `(dashboard)` las páginas suelen ser **componentes cliente que llaman a `/api/...` con `fetch`**. Si amplías una de esas pantallas, sigue ese patrón.
   - En `(panel)` las páginas son **Server Components que leen con funciones de `lib/`** y mutan con **server actions** + `revalidatePath`.
   - Pantalla nueva: prefiere Server Component que lee de `lib/` y un componente cliente hermano para la interacción.
9. **Módulos que usa el cliente no importan `pg`.** Constantes y tipos compartidos van en archivos sin imports de servidor (`lib/usuarios/rol-asignable.ts`, `lib/campanas/sistema-opciones.ts`). Un `import` de `pg` en un componente cliente rompe el build.
10. **`'use client'` nunca en una función `async`.** En las páginas, lee los parámetros con `await params` / `await searchParams`.
11. **La app vive bajo un `basePath`** (`/dataforgood` en producción, según `BASE_PATH` en el build). `<Link>`, `router.push`, `redirect()` y `revalidatePath` lo aplican solos. **Todo lo demás lo antepone a mano con `BASE_PATH` de `lib/base-path.ts`**: `fetch(\`${BASE_PATH}/api/...\`)`, `<img src>`, `<a href>` y `window.location`. No lo agregues a un `<Link>`, porque quedaría duplicado. Para URLs absolutas usa `absoluteUrl()` de `lib/app-url.ts` (`APP_ORIGIN` + `BASE_PATH`): `new URL(path, request.url)` da `http://0.0.0.0:3000` dentro de Docker y no lleva la subruta.
12. **Páginas prerenderizadas que leen Postgres** (`revalidate` o estáticas) envuelven sus consultas en `try/catch` con valores vacíos: `next build` corre sin base de datos dentro del Dockerfile.
13. **Reutiliza componentes y tokens** (`components/ui/*` para la zona de usuario, `components/sistema/*` para el panel; `bg-surface`, `text-ink-2`, `border-line`...). Nada de colores sueltos, otra tipografía ni botones nuevos. **No anides `<Link>` con `<Button>`**: usa `ButtonLink`.
14. **Diseño mobile-first.** Revisa cada pantalla en 360, 768 y 1280 px.
15. **Roles:**
    - Supervisor **solo lo asigna el SuperUsuario** (`asignarRol` en `lib/usuarios/acciones-usuarios.ts`).
    - Revisor de aportes es **por campaña**: invitación del creador que la persona acepta (`campana_revisores`).
    - Supervisor y Revisor no se excluyen.
    - El SuperUsuario no tiene fila en `usuarios`: solo supervisa y administra, no crea campañas ni aporta.
16. **Ubicación solo textual** (estado, ciudad, colonia). Nada de GPS ni `navigator.geolocation` sin petición explícita.
17. **Solo PostgreSQL**, también para pruebas. Sin SQLite, MySQL, MongoDB, `pg-mem` ni PGlite.
18. **Antes de usar una API de Next, lee su guía en `node_modules/next/dist/docs/`**, como exige `AGENTS.md`.
19. **No inventes reglas.** `references/dominio.md` lista los puntos abiertos. Si una tarea depende de uno, pregunta; si hay que avanzar, deja `// TODO(dominio): ...` y menciónalo.

## Estructura

```
DataForGood/
├── AGENTS.md, CLAUDE.md          # instrucciones de Next 16 para agentes
├── proxy.ts                      # redirige a /entrar o /root si falta la cookie (no autoriza)
├── app/
│   ├── layout.tsx, globals.css   # fuentes y tokens de diseño
│   ├── page.tsx, datos/, contacto/, privacidad/, sobre-nosotros/   # públicas
│   ├── (auth)/                   # entrar, registro, verificar, bienvenida, root
│   ├── (dashboard)/              # zona de usuario: TopBar + SidebarNav
│   ├── (panel)/                  # SuperUsuario: sistema, usuarios, supervisar (Topbar + Sidebar de components/sistema)
│   └── api/**/route.ts           # route handlers
├── components/
│   ├── ui/, cards/, layout/      # zona de usuario
│   ├── sistema/                  # kit del panel del SuperUsuario
│   ├── supervision/              # piezas compartidas entre /supervision y /supervisar
│   └── auth/
├── lib/
│   ├── db.ts, db-schema.ts       # pool de pg y DDL
│   ├── session.ts, rootSession.ts, verification.ts, password.ts, google.ts, roles.ts
│   ├── minio.ts, open-data.ts, campaign-date.ts, app-url.ts, validation.ts
│   ├── campanas/, supervision/, usuarios/, sistema/   # consultas y server actions por módulo
├── types/index.ts                # contrato de datos
├── sql/                          # scripts CREATE históricos: NO son la fuente del esquema
├── docker-compose.yml, Dockerfile, next.config.ts
└── .env (Compose) y .env.local (next dev): gitignored, ver arquitectura.md
```

## Flujo para una funcionalidad

1. **Ubica las reglas en `references/dominio.md`.** Si la tarea toca un punto abierto, pregunta.
2. **Esquema:** agrega o altera la tabla en `lib/db-schema.ts` (`CREATE TABLE IF NOT EXISTS` + `ALTER ... IF NOT EXISTS`) y, si es tabla nueva, inclúyela en `ensureCoreSchema()`.
3. **Lógica:** en `lib/<modulo>/` como funciones que reciben datos ya validados y aplican las reglas. Guardia primero, luego validación, luego SQL.
4. **Entrada:**
   - Si la llama la zona de usuario, usa un route handler en `app/api/...`: `getSessionUser()` → 401, validación → 400, permiso → 403, lógica, `NextResponse.json({ data })` o `{ error }`.
   - Si la llama el panel, usa una server action en `lib/<modulo>/acciones-*.ts`: guardia → validación → lógica → `revalidatePath`, y devuelve `{ ok: true } | { ok: false, error }`.
5. **Página:** sigue el patrón de su zona (regla 8).
6. **Documenta en `references/dominio.md`** las reglas nuevas o los puntos abiertos que se resuelvan, con fecha.

## Cambios de versión que rompen código viejo

- **Next 16:** `params`, `searchParams`, `cookies()` y `headers()` son asíncronos.
- **Next 16:** `middleware.ts` pasó a llamarse `proxy.ts` (función `proxy`) y no es control de acceso.
- **Next 16:** Turbopack es el bundler por defecto.
- **Next 16:** `request.url` ya no se arma con el header `Host` (ver regla 11).
- **`output: "standalone"`** funciona porque no hay servidor personalizado. Si algún día se agrega uno, deja de funcionar.

## Verificación antes de terminar

```bash
npx tsc --noEmit
npm run lint
docker compose up -d --build     # compila la imagen: detecta prerender que falla sin BD
docker compose logs -f app
```

No hay suite de pruebas. Prueba a mano en el navegador los flujos que tocaste, con los roles involucrados: usuario común, creador, revisor, supervisor y SuperUsuario. Revisa también 360, 768 y 1280 px.

## Al entregar el trabajo

Resume brevemente:

- los archivos creados o modificados;
- las reglas de `dominio.md` aplicadas o actualizadas;
- el resultado de las verificaciones (qué pasó y qué no se pudo ejecutar);
- los TODOs y puntos abiertos que requieren decisión del equipo.

No declares como probado algo que no ejecutaste.
