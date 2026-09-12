# Conectar las pantallas con datos reales

La rama `Prueba1` tiene el frontend completo sobre `data/screensData.ts`. Esta guía explica cómo sustituir esos datos por services, **pantalla por pantalla**, sin rehacer la interfaz.

## Contenido
1. Mapa de pantallas → services y endpoints
2. Patrón de conversión
3. Ejemplo: `/mis-aportes/[campanaId]`
4. ButtonLink
5. Datos de prueba a partir de los mocks
6. Errores y pendientes detectados en la rama
7. Registro SCR-WEB (opcional)

## 1. Mapa de pantallas → services y endpoints

| Ruta | Hoy usa | Lectura (service) | Mutaciones (API) |
| --- | --- | --- | --- |
| `layout (dashboard)` → `TopBar` | `currentUser` | `getCurrentUser()` en el layout, pasado como prop | — |
| `/campanas` | `campaigns` | `listPublicCampaigns({ tag })` | `POST /api/v1/campanas/:id/guardar` |
| `/campanas/[id]` | `getCampaignById` | `getCampaignDetail(actor, id)` | guardar |
| `/campanas/[id]/aportar` | `getCampaignById`, `getContributionsByCampaign` | `getContributionContext(actor, id)` (campaña, cuota usada) | `POST /api/v1/uploads/presign` → `.../complete` → `POST /api/v1/campanas/:id/aportes` |
| `/mis-aportes` | `campaigns`, `contributions` | `listMyContributionSummaries(actor)` | guardar |
| `/mis-aportes/[campanaId]` | `getContributionsByCampaign` | `getMyCampaignContributions(actor, id)` | `DELETE /api/v1/aportes/:id` |
| `/mis-campanas` | `getMyCampaigns` | `listMyCampaigns(actor)` | `POST /api/v1/campanas/:id/pausar` |
| `/mis-campanas/nueva` (`?edit`) | `getCampaignById`, `getMyCampaigns` | `getCampaignForEdit(actor, id)`, conteo de activas | `POST /api/v1/campanas`, `PUT .../:id`, `POST .../:id/enviar-revision` |
| `/mis-campanas/[id]/panel` | `getCampaignById` | `getCampaignMetrics(actor, id)` | — |
| `/mis-campanas/[id]/aportes` | `getCampaignInbox` | `getCampaignInbox(actor, id)` | — |
| `/mis-campanas/[id]/aportes/[aporteId]` | `getInboxItemById` | `getInboxItem(actor, id, aporteId)` | `POST /api/v1/aportes/:id/decision` `{ decision, motivo }`, `POST /api/v1/campanas/:id/baneos` |
| `.../agregar-revisor` | `reviewerCandidates` | `searchReviewerCandidates(actor, id, q)` | `POST /api/v1/campanas/:id/revisores` |
| `/mis-campanas/[id]/compartir` | `campaign.shareToken` | `getActiveShareLink(actor, id)` | `POST /api/v1/campanas/:id/enlace` (regenerar) |
| `/mis-campanas/[id]/especial` | `getCampaignById` | `getCampaignForSpecial(actor, id)` | `POST /api/v1/campanas/:id/especial` |
| `/registro`, `/verificar`, `/bienvenida`, `/entrar` | valores fijos | — | `POST /api/v1/auth/{registro, verificar, reenviar-codigo, login}`, `PATCH /api/v1/perfil` |

Convenciones:

- **Mantén los nombres de las funciones del mock** cuando tengan sentido (`getCampaignById` pasa a ser `getCampaignById(actor, id)` en el service). Así el cambio en cada página es mínimo.
- **Los services devuelven exactamente los tipos de `types/index.ts`.** Los contadores (`currentContributions`, `pendingContributions`, `participants`, `daysRemaining`, `hasReviewerAssigned`) se calculan en la consulta (ver `base-de-datos.md`).
- **Todo lo de `/mis-campanas/[id]/*` empieza con `assertCampaignOwner(actor, id)`.**
- **Quita los valores fijos** que simulan comportamiento: `carlos@correo.com`, "Expira en 13:45", "Intentos: 3 de 3", el contador de notificaciones "3" y la serie `DAILY_COLLECTION`.

## 2. Patrón de conversión

La rama ya tiene el patrón correcto en `mis-campanas/nueva/`: una `page.tsx` delgada más un componente cliente hermano (`NuevaCampanaForm.tsx`). Aplícalo a todas las páginas que hoy son `'use client'`:

1. **`page.tsx` pasa a ser un Server Component `async`, sin `'use client'`.** Hace cuatro cosas:
   - obtiene el usuario con `requirePagePermission(...)`;
   - lee `await params` y `await searchParams`;
   - llama al service y usa `notFound()` si no hay datos;
   - renderiza el componente cliente con los datos como props.
2. **El componente cliente se llama `<Nombre>View.tsx` o `<Nombre>Form.tsx`** y vive en la misma carpeta. Conserva el JSX y el estado local (filtros visuales, formularios). Recibe datos por props, no importa `data/screensData`, y **nunca es `async`**.
3. **Las mutaciones** hacen `fetch` a `/api/v1/...`, muestran el error `{ error: { message } }` y luego ejecutan `router.refresh()` o `router.push(...)`.
4. **Los filtros que conviene compartir o conservar con "atrás"** van en `searchParams`, como ya hace `/campanas?tag=`. En `/mis-aportes` hoy están en `useState`.
5. **Pasa solo datos serializables:** fechas en ISO (ya es la convención de los tipos), nunca `Set` ni funciones.

## 3. Ejemplo: `/mis-aportes/[campanaId]`

Esta página hoy responde **500**: es `'use client'` y `async` a la vez, y usa `useState`.

```tsx
// app/(dashboard)/mis-aportes/[campanaId]/page.tsx — Server Component
import { notFound } from "next/navigation";
import { requirePagePermission } from "@/app/_data/current-user";
import { getMyCampaignContributions } from "@/server/modules/aportes/service";
import MisAportesCampanaView from "./MisAportesCampanaView";

export default async function Page({ params }: { params: Promise<{ campanaId: string }> }) {
  const user = await requirePagePermission("aportes.crear");
  const { campanaId } = await params;
  const data = await getMyCampaignContributions(user, campanaId); // { campaign: Campaign; items: Contribution[] } | null
  if (!data) notFound();
  return <MisAportesCampanaView campaign={data.campaign} items={data.items} />;
}
```

```tsx
// app/(dashboard)/mis-aportes/[campanaId]/MisAportesCampanaView.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Campaign, Contribution } from "@/types";

export default function MisAportesCampanaView({ campaign, items }: { campaign: Campaign; items: Contribution[] }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("todos");
  const [error, setError] = useState<string | null>(null);

  async function eliminar(id: string) {
    setError(null);
    const res = await fetch(`/api/v1/aportes/${id}`, { method: "DELETE" });
    if (!res.ok) return setError((await res.json()).error?.message ?? "No se pudo eliminar");
    router.refresh(); // el servidor recalcula la cuota
  }
  // …mismo JSX que la página actual, usando `items` y `eliminar`…
}
```

El service `DELETE` vuelve a verificar las reglas: que la persona sea la autora, que el aporte esté `pendiente` y que la campaña esté `activa`.

## 4. ButtonLink

La rama anida `<Link><Button>` (y `<Button><Link>` en `PublicHeader`) en 23 lugares de 10 archivos. Eso produce `<a>` dentro de `<button>`: HTML inválido, doble parada de tabulación y lectores de pantalla confundidos. La corrección mantiene el mismo aspecto:

```tsx
// components/ui/Button.tsx — exportar las clases
export function buttonClasses(variant: Variant = "secondary", size: Size = "md", className = "") {
  return `inline-flex items-center justify-center gap-2 rounded-pill border font-bold transition-colors disabled:opacity-45 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
}
```

```tsx
// components/ui/ButtonLink.tsx
import Link from "next/link";
import type { ComponentProps } from "react";
import { buttonClasses } from "./Button";

type Props = ComponentProps<typeof Link> & { variant?: "primary" | "secondary" | "danger" | "ghost"; size?: "sm" | "md" };

export default function ButtonLink({ variant, size, className, ...rest }: Props) {
  return <Link className={buttonClasses(variant, size, className)} {...rest} />;
}
```

Uso: `<ButtonLink href={`/campanas/${id}`} className="w-full">Ver detalles</ButtonLink>`.

## 5. Datos de prueba a partir de los mocks

Los datos de `screensData.ts` sirven como semilla para que las pantallas se vean igual que hoy:

```ts
// scripts/seed.ts → docker compose exec app npx tsx scripts/seed.ts
import { db } from "@/server/db/client";
import { users, campaigns } from "@/server/db/schema";
import { campaigns as mockCampaigns, currentUser } from "@/data/screensData";

if (process.env.NODE_ENV === "production") throw new Error("No ejecutar el seed en producción");

async function main() {
  const userIds = new Map<string, string>(); // id del mock (u-carlos) → uuid real
  const creators = new Map(mockCampaigns.map((c) => [c.creatorId, c.creatorName]));
  creators.set(currentUser.id, currentUser.alias);
  for (const [mockId, alias] of creators) {
    const [u] = await db.insert(users).values({
      email: `${mockId.replace("u-", "")}@dfg.local`, alias, status: "activo", emailVerifiedAt: new Date(),
    }).onConflictDoUpdate({ target: users.email, set: { alias } }).returning({ id: users.id });
    userIds.set(mockId, u.id);
  }
  for (const c of mockCampaigns) {
    await db.insert(campaigns).values({
      creatorId: userIds.get(c.creatorId)!, name: c.name, description: c.description, tag: c.tag, status: c.status,
      dataTypes: c.dataTypes, goalContributions: c.goalContributions, quotaPerUser: c.quotaPerUser,
      startDate: c.startDate, endDate: c.endDate, locationCity: c.locationCity, locationState: c.locationState,
      organizer: c.organizer, xpPerContribution: c.xpPerContribution,
    });
  }
  console.log("Datos de prueba cargados");
  process.exit(0);
}
main();
```

Los ids del mock son slugs (`censo-arboles`) y los reales son uuid: después de conectar, los enlaces usan el uuid. Cuando existan cuentas con contraseña, agrega una por rol (común, supervisor, superusuario) y un revisor aceptado en una campaña, para las pruebas de usabilidad.

## 6. Errores y pendientes detectados en la rama

Revisión del 11 de septiembre de 2026 con `tsc`, `eslint`, `next build`, `next start` y `check-integrity`. **No se modificó el repositorio.**

| Prioridad | Problema | Dónde | Corrección |
| --- | --- | --- | --- |
| Alta | Responde **500**: componente `'use client'` `async` con `useState` | `mis-aportes/[campanaId]/page.tsx` | Sección 3 |
| Alta | `npm run lint` falla: comillas sin escapar (`"En revisión"`) | `NuevaCampanaForm.tsx:267` | `&quot;` o comillas tipográficas |
| Media | `<Link>` anidado con `<Button>` (23 casos) | 10 archivos | Sección 4 |
| Media | `next build` necesita internet por `next/font/google` | `app/layout.tsx` | Build con red o `next/font/local` |
| Media | `@types/node@^20` choca con Vitest 5 | `package.json` | Subir a `24.x` |
| Media | Fechas un día antes en el navegador: `new Date("2026-09-12")` es medianoche UTC y en Tepic (UTC-7) se muestra el 11 | `CampaignCard`, `mis-campanas`, `panel`, `campanas/[id]`… | Formatear la cadena `YYYY-MM-DD` o usar `timeZone: "UTC"` en un `lib/format.ts` común |
| Media | Inputs de 14 px: iOS hace zoom al enfocar | `components/ui/Input.tsx`, `select` sueltos | `text-base sm:text-sm` |
| Media | Tablas sin versión móvil; cabeceras sin `flex-wrap` | `mis-campanas/[id]/aportes`, `agregar-revisor` | `ui-responsiva.md` |
| Baja | `asDraft` sin usar (guardar borrador y enviar hacen lo mismo) | `NuevaCampanaForm.tsx:61` | Distinguir al conectar la API |
| Baja | Comentario apunta a `src/data/screensData.ts` y a `dataforgood_schema.sql`, que no existen | `types/index.ts` | Actualizar al crear el esquema |
| Baja | Catálogo de temáticas inconsistente | `/campanas` y formulario | `dominio.md`, punto 9.5 |

## 7. Registro SCR-WEB (opcional)

La rama no usa códigos SCR-WEB en el código. Si el equipo quiere retomar esa trazabilidad para la documentación de la residencia, crea `lib/screens.json` con objetos `{ code, path, title, rf: [] }` y agrega `/** @screen SCR-WEB-XX */` en cada `page.tsx`. `check-integrity` valida el registro automáticamente cuando el archivo existe.
