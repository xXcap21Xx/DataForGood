# Arquitectura

## Contenido
1. Un proceso, dos responsabilidades
2. Flujo de una petición
3. Leer datos en páginas
4. Mutaciones desde el cliente
5. Servidor personalizado: detalles que importan
6. Docker: desarrollo y despliegue
7. Probar desde un teléfono real
8. Errores, carga y estados vacíos
9. Notificaciones
10. Pruebas

## 1. Un proceso, dos responsabilidades

`server.ts` crea un `http.Server` y cuelga de él una app de Express:

- **Express** atiende `/api/v1/*`: JSON, sesión, validación, permisos y errores con formato único.
- **Next.js** atiende todo lo demás: páginas, layouts, assets y `/_next/*`.

Ambos importan los mismos módulos de `server/`, así que no hay que duplicar la lógica. La otra cara es que hay dos grafos de módulos: Next empaqueta su copia y Express usa la suya. Por eso los singletons van en `globalThis` (regla 3).

El proceso corre dentro del contenedor `app` y alcanza a `postgres` y `minio` por sus nombres de servicio en la red interna de Docker.

## 2. Flujo de una petición

```
Navegador ──► http.Server ──► Express
                               ├─ /api/v1/* ─► json() → sameOriginMutations → loadSession
                               │               → router del módulo → requirePermission
                               │               → parseInput (Zod) → service (assertCan) → Drizzle / S3
                               │               → JSON  |  error → apiErrorHandler → { error: {code, message} }
                               └─ resto ─────► handle(req, res) de Next
                                               → proxy.ts (opcional, solo redirecciones)
                                               → layout/page (Server Components)
                                               → _data/current-user → service → Drizzle
```

## 3. Leer datos en páginas

La página es un Server Component asíncrono. Obtiene el actor, llama al service y pasa datos serializables (los tipos de `types/index.ts`) a un componente cliente hermano.

```tsx
// app/(dashboard)/mis-campanas/[id]/aportes/page.tsx
import { notFound } from "next/navigation";
import { requirePagePermission } from "@/app/_data/current-user";
import { getCampaignInbox } from "@/server/modules/aportes/service";
import BandejaView from "./BandejaView";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePagePermission("campanas.ver");
  const { id } = await params;                       // Next 16: siempre await
  const data = await getCampaignInbox(user, id);     // hace assertCampaignOwner adentro
  if (!data) notFound();
  return <BandejaView campaign={data.campaign} inbox={data.inbox} />;
}
```

Reglas:

- **Verifica permisos en la página y en el service, no solo en el layout.** En la navegación del lado del cliente, los layouts compartidos no vuelven a renderizarse.
- **Nunca `'use client'` en una función `async`:** en la rama eso produce un 500 (`conectar-mocks.md`, sección 6).
- **Pasa a los componentes cliente solo datos serializables.**
- **Los datos de cada usuario son dinámicos:** no uses `'use cache'` en funciones que dependen de la sesión.

## 4. Mutaciones desde el cliente

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Button from "@/components/ui/Button";

export default function AprobarAporte({ aporteId }: { aporteId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button
        variant="primary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await fetch(`/api/v1/aportes/${aporteId}/decision`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ decision: "aceptado" }),
            });
            if (!res.ok) return setError((await res.json()).error?.message ?? "No se pudo aprobar");
            router.refresh(); // vuelve a renderizar los Server Components con datos nuevos
          })
        }
      >
        {pending ? "Aprobando…" : "Aprobar aporte"}
      </Button>
      {error && <p role="alert" className="mt-2 text-[12px] text-danger">{error}</p>}
    </>
  );
}
```

Para no repetir `fetch`, crea en `lib/api.ts` un helper `apiFetch` que agregue el header JSON y convierta `{ error }` en excepción. El navegador envía `Origin` por su cuenta.

## 5. Servidor personalizado: detalles que importan

- **Crea el `http.Server` antes y pásalo a `next({ httpServer })`.** Así el HMR por websockets funciona en desarrollo.
- **`server.ts` no pasa por el compilador de Next.** Se ejecuta con `tsx` en desarrollo y se empaqueta con esbuild para producción. esbuild resuelve los alias `@/` de `tsconfig.json`.
- **Fija los headers propios antes de `handle(req, res)`.** Después de esa llamada se descartan sin aviso.
- **Usa la variable `HOST` para escuchar, no `HOSTNAME`.** Docker rellena `HOSTNAME` con el id del contenedor.
- **Configura `app.set('trust proxy', 1)`** cuando haya Nginx o Caddy delante; si no, `req.ip` y `req.protocol` salen equivocados.
- **No uses `output: 'standalone'`.** Ignora el servidor personalizado.
- **Los websockets propios** (por ejemplo, avisos en vivo a revisores) se cuelgan del mismo `httpServer`. Filtra el evento `upgrade` por ruta para no interceptar el HMR de Next.
- **`next build` importa las páginas**, y con ellas `env.ts`. Por eso `env.ts` no valida durante `NEXT_PHASE === 'phase-production-build'`. No agregues código con efectos secundarios al nivel superior de los módulos (conexiones, lecturas de archivos): usa inicialización perezosa.

## 6. Docker: desarrollo y despliegue

Todo el sistema corre en contenedores. No hay Postgres ni MinIO instalados en la máquina.

| Servicio | Imagen | Función |
| --- | --- | --- |
| `postgres` | `postgres:17-alpine` | Base de datos, sin puertos publicados en el compose base |
| `minio` | `minio/minio:RELEASE.2025-09-07T16-13-09Z` | Almacenamiento; API 9000, consola solo en `127.0.0.1:9001` |
| `minio-setup` | la misma de MinIO | Crea el bucket privado y el usuario de la app, y termina |
| `app` | `Dockerfile` (etapa `dev` o `runtime`) | Express + Next; arranca cuando Postgres está sano y `minio-setup` terminó bien |

| Tarea | Comando |
| --- | --- |
| Desarrollo con recarga | `npm run docker:dev` (añade `-V` tras cambiar `package.json`) |
| Migraciones en desarrollo | `docker compose exec app npm run db:migrate` |
| Cualquier script | `docker compose exec app npm run <script>` |
| Despliegue o demo | `docker compose up -d --build` (aplica migraciones al arrancar) |
| Logs | `docker compose logs -f app minio-setup` |

Detalles:

- **El override de desarrollo** monta el código con un bind mount y guarda `node_modules` y `.next` en volúmenes del contenedor, para no mezclar binarios del sistema anfitrión (por ejemplo, `@node-rs/argon2`) con los de Linux.
- **En Windows, clona el repositorio dentro de WSL2.** Sobre carpetas de Windows montadas, los cambios de archivo pueden no detectarse y la recarga falla.
- **`.dockerignore` excluye `.env`.** Los secretos llegan por `environment` en tiempo de ejecución, nunca dentro de la imagen.
- **`next build` corre dentro de la etapa `build`, sin variables de entorno** (por eso `env.ts` no valida en esa fase). `next/font/google` descarga Plus Jakarta Sans y JetBrains Mono durante la compilación: sin internet el build falla (comprobado con la rama). Si el servidor de despliegue no tiene salida a internet, cambia a `next/font/local` con los archivos de las fuentes en el repositorio.
- **`RUN_MIGRATIONS=true` en `runtime`** sirve para una sola instancia de la app, que es el caso del proyecto.
- **La imagen `runtime` tiene `HEALTHCHECK`** contra `/api/v1/health` y corre como usuario `node`.
- **Respaldos:** `docker compose exec postgres pg_dump -U <usuario> <base> > respaldo.sql`, más una copia del volumen `miniodata`.

## 7. Probar desde un teléfono real

Es parte central del proyecto, porque la mayoría de quienes aportan usarán el celular. Hay tres trampas comunes:

1. **Al abrir `http://192.168.x.x:3000`, el header `Origin` ya no coincide con `APP_ORIGIN`** y las mutaciones responden 403 (se resuelve con el paso siguiente).
2. **`S3_PUBLIC_ENDPOINT=http://localhost:9000` no existe desde el teléfono.** En `.env`, cambia `APP_ORIGIN` y `S3_PUBLIC_ENDPOINT` a la IP de tu máquina y recrea los contenedores con `docker compose up -d`. El CORS de MinIO sigue a `APP_ORIGIN` automáticamente.
3. **`getUserMedia` (cámara y micrófono en vivo) solo funciona en contexto seguro.** Eso significa HTTPS, o `localhost` en la misma máquina; en una IP de la red local sin HTTPS no funciona. `<input type="file" capture>` sí funciona sin HTTPS. Para probar grabación en vivo, usa un túnel con HTTPS.

## 8. Errores, carga y estados vacíos

- **`loading.tsx`** en cada segmento con datos lentos, con esqueletos del tamaño real para evitar saltos en móvil.
- **`error.tsx`** (componente cliente) con un botón para reintentar. **`not-found.tsx`** para recursos inexistentes; en la página se usa `notFound()` cuando el service lanza 404.
- **Cada lista tiene su estado vacío** con una acción clara, por ejemplo "Aún no hay aportes. Participa en una campaña".
- **La API siempre responde `{ error: { code, message, details? } }`.** La interfaz decide qué mostrar según `code`.

## 9. Notificaciones

El plan anterior usaba FCM para la app móvil, que ya no existe. Hay dos etapas posibles:

1. **Notificaciones dentro de la app:** una tabla `notifications` más un contador en el header. Cubre la mayoría de los casos y no depende del navegador.
2. **Web Push (opcional, después):** requiere service worker y HTTPS. En iOS solo funciona si el sitio se instaló en la pantalla de inicio, así que no puede ser el único canal para avisos importantes.

## 10. Pruebas

- **Services (lo más valioso):** reglas de permisos y transiciones de estado. Aísla el acceso a datos o usa una base de datos de prueba.
- **Permisos:** `permissions.test.ts` protege la regla del Colaborador de Supervisor. Agrega un caso por cada permiso nuevo.
- **Routers:** levanta `createApp()` en un puerto y usa `fetch`. Para las mutaciones, envía los headers `origin` y `cookie`.
