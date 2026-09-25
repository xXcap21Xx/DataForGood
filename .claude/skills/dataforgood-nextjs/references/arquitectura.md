# Arquitectura

## Contenido
1. Un solo proceso: Next.js
2. Flujo de una petición
3. Route handlers (zona de usuario)
4. Server actions (panel del SuperUsuario)
5. Patrones de página
6. Docker y variables de entorno
7. Problemas conocidos

## 1. Un solo proceso: Next.js

No hay servidor personalizado. `next start` (en Docker, el `server.js` de `.next/standalone`) atiende páginas, route handlers y server actions. Todo el código de servidor vive en `lib/` y se importa desde `app/`.

```
Navegador ──► proxy.ts (¿hay cookie? si no, redirect) ──► página / route handler / server action
                                                             │
                                                             ├─ lib/session.ts o lib/rootSession.ts  (¿quién es?)
                                                             ├─ lib/db-schema.ts ensureXTable()      (crea tablas si faltan)
                                                             ├─ lib/db.ts pool.query(sql, params)    (PostgreSQL)
                                                             └─ lib/minio.ts                         (archivos)
```

## 2. Flujo de una petición

1. **`proxy.ts`** (antes `middleware.ts`) mira solo si existe la cookie. Cubre `/campanas`, `/mis-aportes`, `/mis-campanas`, `/cuenta`, `/supervision` (cookie `session_token` → si falta, `/entrar`) y `/sistema` (cookie `root_session_token` → si falta, `/root`). **No valida el token ni el rol**, y no cubre `/revisiones`, `/usuarios` ni `/supervisar`: esas rutas dependen de sus layouts y páginas.
2. **Layout del grupo:** `(panel)/layout.tsx` llama a `hasRootSession()`; `(dashboard)/supervision/layout.tsx` exige rol `supervisor`.
3. **Página o handler:** vuelve a verificar. Los layouts no bastan porque no se vuelven a ejecutar en cada navegación cliente y no protegen los route handlers ni las server actions.

## 3. Route handlers (zona de usuario)

`app/api/**/route.ts`, sin versión en la URL. Forma habitual:

```ts
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureCoreSchema();
    const { id } = await context.params;
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Debes iniciar sesion" }, { status: 401 });
    // validar entrada → 400; comprobar permiso sobre la campaña → 403/404
    // pool.query(...) parametrizado; transacción si hay varias escrituras
    return NextResponse.json({ data });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Mensaje para la persona" }, { status: 500 });
  }
}
```

- **Respuesta:** `{ data }` si sale bien, `{ error }` si no. Los clientes leen `payload.error`.
- **Mapeo:** las filas vienen en snake_case y se convierten a los tipos de `types/index.ts` con una función `mapX(row)` en el mismo archivo.
- **Endpoints actuales:** `auth/{login, logout, root, sesion, verificar, verificar/reenviar, google, google/callback}`, `usuarios`, `usuarios/[id]`, `campanas`, `campanas/[id]{, /guardar, /revisores, /baneos, /recoleccion-diaria}`, `aportes`, `aportes/[id]{, /archivo}`, `revisiones`, `notificaciones`, `notificaciones/[id]/aceptar` y `datos/[id]/descarga` (ZIP con `archiver`).

## 4. Server actions (panel del SuperUsuario)

Archivos `"use server"` en `lib/`: `lib/usuarios/acciones-usuarios.ts` (`asignarRol`, `revocarRol`, `aplicarSancion`, `restaurarAcceso`), `lib/usuarios/acciones-supervisor.ts` (`revertirAccion`) y `lib/supervision/acciones-root.ts` (`decidirComoSuperUsuario`, `tomarComoSuperUsuario`).

```ts
"use server";
export async function hacerAlgo(id: string, ...): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await hasRootSession())) throw new Error("No autorizado");   // guardia SIEMPRE primero
  if (!/^\d+$/.test(id)) return { ok: false, error: "Petición inválida." };
  await ensureCoreSchema();
  // lógica (idealmente una función de lib/ compartida con el route handler equivalente)
  revalidatePath("/ruta", "layout");
  return { ok: true };
}
```

Una server action es un endpoint público: cualquiera puede invocarla con su ID. Por eso **la guardia va dentro de la acción**, no en la página que la usa.

## 5. Patrones de página

| Zona | Patrón actual |
| --- | --- |
| `(dashboard)` | Página `"use client"` que carga con `fetch("/api/...")` en `useEffect` y maneja `cargando` / `error`. Algunas, como `mis-campanas/nueva`, separan un formulario cliente (`NuevaCampanaForm.tsx`) |
| `(panel)` | Server Component `async` que llama a `exigirSesionRoot()` o a la función de `lib/` que ya la exige, lee con funciones de `lib/<modulo>/` y pasa props a componentes cliente hermanos (`filtros.tsx`, `botones-de-rol.tsx`, `formulario.tsx`) que llaman a server actions |
| Públicas (`/`, `/datos`) | Server Components. `/` usa `revalidate = 300`: sus consultas van en `try/catch` con valores por defecto porque el build no tiene base de datos |

Actualización en vivo: `components/supervision/RefrescoEnVivo.tsx` hace `router.refresh()` periódico (polling) en los paneles de campañas activas.

## 6. Docker y variables de entorno

- **Levantar:** `docker compose up -d` (agrega `--build` si cambió código, `Dockerfile` o dependencias). Logs: `docker compose logs -f app`.
- **Servicios:** `postgres` (16-alpine), `minio` (consola en 9001) y `app` (3000). Hoy los tres publican puertos y usan credenciales fijas en el compose: ver punto 7.
- **Dos `.env`, ambos gitignored y no intercambiables:**
  - `.env.local` lo lee `next dev`. Ahí un `$` literal se escapa con `\$`.
  - `.env` lo lee Compose para sustituir `${VAR}` en `docker-compose.yml`. Ahí un `$` literal se escapa con `$$`.
  - `ROOT_PASSWORD_HASH` (bcrypt, lleno de `$`) tiene que estar en los dos, cada uno con su escape.
- **Variables:** `DATABASE_URL` (o `POSTGRES_URL`), `MINIO_ENDPOINT/PORT/USE_SSL/ACCESS_KEY/SECRET_KEY/BUCKET`, `APP_ORIGIN`, `ROOT_USER_ID`, `ROOT_PASSWORD_HASH`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM`, `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI`.
- **Subruta (`basePath`):** en producción la app se publica en `https://multimodal-ai-lab.cicese.mx/dataforgood/`. `BASE_PATH` es un `ARG` del Dockerfile (por defecto `/dataforgood`; `docker-compose.yml` lo pasa como build arg) y `next.config.ts` lo usa como `basePath` y `NEXT_PUBLIC_BASE_PATH`. Como se incrusta en el bundle, cambiarlo exige reconstruir la imagen. El proxy inverso del servidor **debe reenviar la ruta completa, con `/dataforgood`**, sin recortarla. En local, con `docker compose`, la app queda en `http://localhost:3000/dataforgood`, y `next dev` sin `BASE_PATH` queda en la raíz. En Git Bash, `BASE_PATH=/dataforgood` se convierte en una ruta de Windows: usa PowerShell o `MSYS_NO_PATHCONV=1`.
- **`Dockerfile`:** multi-stage `deps → builder → runner` sobre `node:24-alpine`. Usa `npm install` (no `npm ci`) porque el lockfile se genera en Windows. El runner copia `.next/standalone`.

## 7. Problemas conocidos (pendientes de despliegue)

Diagnóstico del 2026-09-24, todavía sin aplicar:

- Postgres (5432) y MinIO (9000/9001) están publicados en el host.
- Credenciales fijas en `docker-compose.yml`, y la app usa el root de MinIO.
- MinIO sin versión fija (`quay.io/minio/minio`).
- Sin HTTPS ni proxy inverso, sin healthchecks, sin `.env.example` y sin respaldos.

No los "arregles de paso": son una tarea propia que hay que acordar.
