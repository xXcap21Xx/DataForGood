---
name: dataforgood-nextjs
description: Arquitectura, reglas de negocio, convenciones y flujo de trabajo de DataForGood, plataforma web responsiva de crowdsourcing de datos construida con Next.js 16 (App Router, estructura en la raíz) sin servidor personalizado, con route handlers en app/api, server actions, PostgreSQL vía `pg` con SQL directo (sin ORM) y MinIO, todo en Docker Compose. Úsala SIEMPRE que se trabaje en DataForGood o Data For Good, aunque no se mencione Next.js. Aplica a pantallas como /campanas, /mis-aportes, /mis-campanas, /revisiones, /supervision, /entrar o /registro, y al panel del SuperUsuario (/sistema, /usuarios, /supervisar); a route handlers de app/api, server actions de lib/, tablas en lib/db-schema.ts y subida de archivos a MinIO. También cubre campañas, aportes, cuotas, revisión en dos instancias, enlaces públicos, datos abiertos, XP, roles (Usuario común, Revisor de aportes, Supervisor, SuperUsuario), sanciones, Docker y diseño responsivo, y la revisión o depuración de código del proyecto.
---

# DataForGood · Next.js full-stack

DataForGood conecta organizaciones con personas que aportan información en campo (fotos, video, audio, documentos y texto) para campañas sociales, ambientales y comunitarias. Es la entrega de la residencia profesional de Carlos.

**El repositorio es la referencia.** Si esta skill y el código no coinciden, manda el código, y hay que actualizar la skill en el mismo commit. Si el código tiene un error evidente (algo que falla, es inválido o inseguro), señálalo y propón la corrección.

## Estado del proyecto (rama `migracion-github`, octubre 2026)

- **Repositorio:** `gitlab.com/cicese-tepic-dev-1/dataforgood`. `main` está protegida; se trabaja en `migracion-github`.
- **Funciona de punta a punta con datos reales:** registro con verificación por correo, inicio de sesión (correo/contraseña y Google), campañas, aportes con archivo en MinIO, revisión en dos instancias, supervisión, notificaciones, catálogo de datos abiertos y panel del SuperUsuario.
- **Ya no existe `data/screensData.ts`:** ninguna pantalla usa datos simulados.
- **No hay pruebas automatizadas** (no hay Vitest ni otro runner).
- **2026-09-30:** `/explorar` público, regreso a la pantalla pedida tras iniciar sesión (`?next=`), `/cuenta-bloqueada`, baneos por campaña reversibles, checklists con título, 23 temáticas compartidas (commit `c9fb7b7`).
- **Último avance (2026-10-01, commits `de9a367` a `3e18424`):**
  - **Aporte anónimo** desde `/c/[token]` con cuota por dispositivo, espera de 60 s y tope por IP en memoria. **La IP de una persona sin cuenta no se guarda en ningún lado** (hubo un HMAC de la IP y se quitó a pedido del usuario: no volver a proponerlo).
  - **Sanciones para anónimos** en 4 niveles (inapropiado, bloqueo del dispositivo en la campaña, interruptor "Permitir aportes sin cuenta", bloqueo global por dispositivo).
  - **Fotos:** firma real JPG/PNG, máximo 50 MP y re-codificación con `sharp` sin EXIF/GPS (`lib/aportes/imagen.ts`).
  - **Contadores** recalculados desde `aportes`, **revisión en dos instancias** real (`espera_final`), cuota sin carrera (candados de Postgres).
  - **Seguridad:** registro solo con rol `usuario`, `GET /api/usuarios/[id]` solo la cuenta propia, `POST /api/campanas` con sesión y solo `borrador`/`en_revision`, ids validados en `proxy.ts`, cabeceras de seguridad en `next.config.ts`, login sin enumerar correos.
  - Prueba de punta a punta y revisión en Chrome: hallazgos y estado en la memoria del proyecto.
- **Pendiente:**
  - **Antes del próximo despliegue:** correr una vez `scripts/limpiar-metadatos.mjs` en el servidor (lista; luego `--aplicar`) y que el puerto de la app solo sea accesible desde el proxy (el tope y la espera por IP confían en `X-Forwarded-For`; lo está consultando el usuario con el encargado).
  - Revisar las pantallas a 360 px.
  - Números provisionales (`TODO(dominio)`): 3 inapropiados en 30 días → 30 días de bloqueo, 60 s de espera, 20 aportes anónimos por IP por hora, 50 MP.

| Zona | Rutas | Acceso |
| --- | --- | --- |
| Documentación de la API | `/api/docs` (Swagger UI de `openapi.yaml`) | Abierta en `next dev`; sesión raíz en producción |
| Pública | `/`, `/explorar` (campañas activas), `/datos`, `/datos/[id]`, `/c/[token]` (enlace público de una campaña), `/contacto`, `/privacidad`, `/sobre-nosotros` | Libre |
| Cuenta, `(auth)` | `/entrar`, `/registro` → `/verificar` → `/bienvenida`; `/root` (entrada del SuperUsuario); `/cuenta-bloqueada` (fuera del grupo: cuenta suspendida o baneada) | Libre |
| Participar, `(dashboard)` | `/campanas`, `/campanas/[id]`, `/campanas/[id]/aportar`, `/mis-aportes`, `/mis-aportes/[campanaId]`, `/cuenta` | Sesión de usuario |
| Administrar campañas propias | `/mis-campanas`, `/mis-campanas/nueva` (`?edit=id`), `/mis-campanas/[id]/{panel, aportes, aportes/[aporteId], aportes/agregar-revisor, especial}` (compartir es un cuadro en `/campanas/[id]`) | Creador |
| Revisión de aportes | `/revisiones`, `/revisiones/finalizadas`, `/revisiones/[aporteId]`, `/revisiones/campanas/[campaignId]/usuarios/...` | Revisor aceptado de la campaña |
| Supervisión (usuario promovido) | `/supervision`, `/supervision/campanas`, `/supervision/[campaignId]/{panel, usuarios/...}` | Rol `supervisor` |
| Panel del SuperUsuario, `(panel)` | `/sistema`, `/sistema/campanas{, /dashboard, /[id]}`, `/usuarios{, /dashboard, /[id]{, /roles, /sancion}, /sanciones, /supervisores{, /[id]{, /revertir/[accionId]}}}`, `/supervisar/...` | Sesión raíz (`root_sessions`) |
| Persona anónima | Solo `/c/[token]` (ficha de la campaña compartida y formulario de aporte sin cuenta, `POST /api/c/[token]/aportes`) | Sin sesión, con enlace vigente |
| Aún sin pantalla | recuperar contraseña | — |

## Stack real

| Capa | Lo que hay |
| --- | --- |
| Frontend | Next.js **16.3.4**, React **19.2.8**, TypeScript, Tailwind CSS v4. Estructura **en la raíz** (`app/`, `components/`, `lib/`, `types/`), alias `@/*` → `./*` |
| Servidor | **El propio de Next** (`next start`, `output: "standalone"`). **No hay Express ni `server.ts`** |
| API | **Route handlers** en `app/api/**/route.ts` (sin versión: `/api/campanas`, no `/api/v1/...`) y **server actions** (`"use server"`) en `lib/**/acciones-*.ts` |
| Base de datos | PostgreSQL con **`pg` y SQL a mano** (`lib/db.ts`). **Sin ORM**: no hay Drizzle, Prisma ni migraciones versionadas; el DDL vive en `lib/db-schema.ts` |
| Validación | A mano (`lib/validation.ts`, regex, `Set` de valores permitidos). No hay Zod |
| Archivos | MinIO con el SDK `minio` (`lib/minio.ts`). El archivo pasa por el servidor (`putObject`), no hay URLs firmadas |
| Otros | `bcryptjs` (contraseñas), `nodemailer` + Gmail (códigos de verificación), `google-auth-library` (OAuth), `archiver` (ZIP de datos abiertos), `sharp` (valida y limpia las fotos de los aportes), `qrcode` (QR del enlace público) |
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

1. **Toda ruta o acción verifica la sesión y el permiso en el servidor.** `proxy.ts` solo redirige si falta la cookie, rechaza mutaciones de `/api` con `Origin` ajeno y responde 404/400 a ids que no son enteros positivos de hasta 9 dígitos (en `/api/{aportes,campanas,datos,notificaciones,usuarios}/[id]` y en `?id=`/`?campaignId=`); no valida sesiones ni roles. Las cabeceras de seguridad (X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, sin X-Powered-By) están en `next.config.ts`. Cada route handler llama a `getSessionUser()` (o `hasRootSession()`), cada server action empieza con su guardia y cada página de `(panel)` debe llamar a `exigirSesionRoot()` además del layout (hoy `/sistema` y `/usuarios/**` no lo hacen: ver `references/roles-y-sesiones.md` § 8). `getSessionUser()` ya devuelve `null` si la cuenta está suspendida o baneada (`lib/sanciones.ts`). **Páginas y layouts de servidor de la zona de usuario usan `exigirUsuario()`** (`lib/session.ts`), no `getSessionUser()` + `redirect("/entrar")`: manda a `/cuenta-bloqueada` si la cuenta está sancionada y a `/entrar` si no hay sesión, y layout y página deben coincidir porque corren en paralelo.
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
├── proxy.ts                      # redirige a /entrar?next=... o /root si falta la cookie (no autoriza)
├── app/
│   ├── layout.tsx, globals.css   # fuentes y tokens de diseño
│   ├── page.tsx, explorar/, datos/, contacto/, privacidad/, sobre-nosotros/   # públicas
│   ├── cuenta-bloqueada/         # lo único que ve una cuenta suspendida o baneada
│   ├── (auth)/                   # entrar, registro, verificar, bienvenida, root
│   ├── (dashboard)/              # zona de usuario: TopBar + SidebarNav
│   ├── (panel)/                  # SuperUsuario: sistema, usuarios, supervisar (Topbar + Sidebar de components/sistema)
│   └── api/**/route.ts           # route handlers
├── components/
│   ├── ui/, cards/, layout/      # zona de usuario (ui/SelectorDeTemas, layout/CuentaBloqueada, layout/VigilanteDeSesion)
│   ├── sistema/                  # kit del panel del SuperUsuario
│   ├── supervision/              # piezas compartidas entre /supervision y /supervisar
│   └── auth/
├── lib/
│   ├── db.ts, db-schema.ts       # pool de pg y DDL
│   ├── session.ts, rootSession.ts, verification.ts, password.ts, google.ts, roles.ts
│   ├── minio.ts, open-data.ts, campaign-date.ts, app-url.ts, validation.ts
│   ├── sanciones.ts, redireccion.ts (?next= seguro), intereses.ts (temáticas = intereses)
│   ├── campanas/, supervision/, usuarios/, sistema/   # consultas y server actions por módulo
│   │   └── campanas/{baneos, checklist, publicas}.ts  # baneos por campaña, checklists con título (sin pg), /explorar
├── types/index.ts                # contrato de datos
├── sql/                          # scripts CREATE históricos: NO son la fuente del esquema
├── docs/                         # guía para desarrolladores (README, rutas, datos, permisos, lib)
├── openapi.yaml                  # documentación de la API (a mano); se ve en /api/docs
├── dataforgood-insomnia.json     # colección de Insomnia con las mismas rutas
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
7. **Si tocaste un route handler, actualiza `openapi.yaml`** (y la colección de Insomnia si cambió la forma de la petición).
8. **Documenta en el código y en `docs/`.** Todo archivo nuevo de `app/`, `lib/` o `components/` lleva un comentario de cabecera (`//`) que dice qué es; en páginas: URL, acceso, de dónde salen los datos y qué acciones hace; en route handlers: un comentario por método. Si agregas o cambias una pantalla, endpoint, tabla o módulo, actualiza `docs/rutas.md`, `docs/datos.md` o `docs/lib.md`, y `docs/README.md` § 8 si cierras o encuentras un hueco.

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

Si `docker compose up --build` falla con `Can't resolve '@vercel/turbopack-next/internal/font/google/font'`, es la descarga de Google Fonts (`next/font/google` en `app/layout.tsx`) durante el build: reintenta. Pasó dos veces el 2026-09-30; la solución de fondo es `next/font/local` (pendiente).

No hay suite de pruebas. Prueba a mano en el navegador los flujos que tocaste, con los roles involucrados: usuario común, creador, revisor, supervisor y SuperUsuario. Revisa también 360, 768 y 1280 px.

**Cómo probar sin dañar datos reales** (lecciones del 2026-10-01):
- Crea tus propios datos con un prefijo reconocible (usuarios `qa-prueba-*@example.test`, campañas `QA-PRUEBA ...`) y bórralos al terminar, incluida su carpeta `campanas/<id>/` en MinIO. Nunca uses aportes o campañas existentes para probar acciones destructivas: MinIO no tiene versionado y un archivo borrado no se recupera.
- Las sesiones de prueba se crean insertando el sha256 del token en `sessions` (o `root_sessions`); bórralas al final.
- En Chrome, el usuario tiene su sesión real en `localhost:3000`: entrar con una cuenta de prueba la cierra. Avísale antes.
- **Si tocas candados o transacciones, prueba envíos simultáneos.** El recálculo de contadores bloquea la campaña con `FOR NO KEY UPDATE`: con `FOR UPDATE` choca con el candado de la llave foránea que toma cada `INSERT` en `aportes` y Postgres aborta transacciones con deadlock.

## Al entregar el trabajo

Resume brevemente:

- los archivos creados o modificados;
- las reglas de `dominio.md` aplicadas o actualizadas;
- el resultado de las verificaciones (qué pasó y qué no se pudo ejecutar);
- los TODOs y puntos abiertos que requieren decisión del equipo.

No declares como probado algo que no ejecutaste.
