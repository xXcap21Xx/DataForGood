# Base de datos: estrictamente PostgreSQL + Drizzle

## Contenido
0. Solo PostgreSQL
1. Convenciones
2. Migraciones
3. Modelo actual
4. Cuándo usar JSONB
5. Consultas clave: contadores, cuota, bandeja
6. Transacciones: decidir un aporte
7. Paginación
8. Errores comunes

## 0. Solo PostgreSQL

La base de datos es PostgreSQL en todos los entornos (desarrollo, pruebas y despliegue), dentro de Docker.

- **Nada de otros motores ni emuladores:** ni SQLite, ni MySQL, ni MongoDB, ni `pg-mem`, ni PGlite, tampoco para pruebas "rápidas".
- **Pruebas:** usan `dataforgood_test`, que crea `docker/postgres/init/01-test-db.sql`. Si el volumen ya existía, créala con `docker compose exec postgres createdb -U <usuario> dataforgood_test`.
- **Aprovecha lo propio de Postgres:** JSONB, `pgEnum` y arreglos de enum, `COUNT(*) FILTER`, `ON CONFLICT`, `RETURNING`, advisory locks.
- **Herramientas:** `drizzle-kit` y los scripts se ejecutan dentro del contenedor (`docker compose exec app ...`).

## 1. Convenciones

- **Nombres:** tablas y columnas en `snake_case` explícito (`text('location_city')`); propiedades en camelCase, **iguales a las de `types/index.ts`** (`locationCity`, `quotaPerUser`). Así el mapeo a los tipos es casi directo.
- **Valores de estado en español,** idénticos a los tipos: `en_revision`, `espera_final`, `aceptado`...
- **Identificadores:** uuid (`defaultRandom()`). Los slugs del mock (`censo-arboles`) solo existen en los datos de prueba.
- **Fechas y horas:**
  - fechas de campaña con `date(..., { mode: 'string' })`, que devuelven `YYYY-MM-DD` como en los tipos;
  - marcas de tiempo con `timestamp(..., { withTimezone: true })`, convertidas a ISO con `toISOString()`.
- **Organización:** un archivo por área en `server/db/schema/`, reexportado en `index.ts`. Solo los services importan `db`.

## 2. Migraciones

```bash
npm run db:generate                          # crea drizzle/NNNN_*.sql (no necesita base de datos)
# LEE el SQL: renombres detectados como DROP + ADD, defaults, índices
docker compose exec app npm run db:migrate   # aplica las pendientes
```

- **Nunca uses `drizzle-kit push` sobre una base compartida.** Versiona `drizzle/` completo.
- **`types/index.ts` menciona un `dataforgood_schema.sql` "a implementar".** Si el equipo lo escribe, hay dos caminos:
  - traducirlo a los archivos de `schema/`;
  - crear la base con ese SQL y generar el esquema con `drizzle-kit pull`.

  Elige uno como fuente de verdad; no mantengas los dos a mano.
- **Para renombrar columnas con datos,** edita el SQL generado y usa `RENAME COLUMN`.

## 3. Modelo actual

Plantillas en `assets/templates/server/db/schema/`, probadas con drizzle-kit: 12 tablas.

| Archivo | Tablas |
| --- | --- |
| `core.ts` | `users`, `user_roles`, `email_verifications`, `sessions`, `audit_log` |
| `campanas.ts` | `campaigns`, `campaign_share_links`, `campaign_reviewers`, `campaign_bans`, `saved_campaigns`, `media_objects`, `contributions` |

Los campos de `Campaign` que son **contadores o derivados no se guardan**: `currentContributions`, `approvedContributions`, `pendingContributions`, `rejectedContributions`, `participants`, `daysRemaining`, `hasReviewerAssigned`, `shareToken` (enlace vigente) y `creatorName`. Se calculan al consultar (sección 5). Guardarlos obligaría a mantenerlos sincronizados en cada cambio de estado.

`Contribution.participantName` es el alias del autor, o "Anónimo" cuando `userId` es null. `campaignName` y `firstPassBy` (nombre) salen de un join.

## 4. Cuándo usar JSONB

- **Columnas** para lo que se filtra, ordena o tiene integridad: estado, creador, fechas, cuota, tipos de dato (arreglo de enum).
- **JSONB** para listas flexibles que se leen completas:
  - `campaigns.checklist_options`: opciones que define quien crea la campaña;
  - `contributions.checklist_answers`: opciones marcadas por el participante;
  - `users.interests` y `audit_log.details`.
- **Valida con Zod antes de escribir**, porque Postgres no valida la forma interna. Por ejemplo, cada respuesta debe existir en las opciones de la campaña.
- **Si una campaña ya tiene aportes, no permitas cambiar sus opciones libremente.** Las respuestas viejas quedarían sin sentido.

## 5. Consultas clave: contadores, cuota, bandeja

**Campañas con contadores**, para `/campanas` y `/mis-campanas`:

```ts
import { and, count, eq, sql } from 'drizzle-orm';

const stats = db
  .select({
    campaignId: contributions.campaignId,
    current: count().as('current'),
    approved: sql<number>`count(*) filter (where ${contributions.status} = 'aceptado')`.mapWith(Number).as('approved'),
    pending: sql<number>`count(*) filter (where ${contributions.status} in ('pendiente','espera_final'))`.mapWith(Number).as('pending'),
    rejected: sql<number>`count(*) filter (where ${contributions.status} = 'rechazado')`.mapWith(Number).as('rejected'),
    participants: sql<number>`count(distinct ${contributions.userId})`.mapWith(Number).as('participants'),
  })
  .from(contributions)
  .groupBy(contributions.campaignId)
  .as('stats');

const rows = await db
  .select({
    campaign: campaigns,
    creatorName: users.alias,
    current: stats.current, approved: stats.approved, pending: stats.pending,
    rejected: stats.rejected, participants: stats.participants,
    hasReviewerAssigned: sql<boolean>`exists (select 1 from campaign_reviewers r where r.campaign_id = ${campaigns.id} and r.status = 'aceptado')`,
  })
  .from(campaigns)
  .innerJoin(users, eq(users.id, campaigns.creatorId))
  .leftJoin(stats, eq(stats.campaignId, campaigns.id))
  .where(eq(campaigns.status, 'activa'));
```

Una función `toCampaign(row)` en el service convierte cada fila al tipo `Campaign`:

- los contadores nulos (campaña sin aportes) pasan a `0`;
- `daysRemaining` se calcula desde `endDate` solo si la campaña está activa (si no, `null`);
- `isSpecial` es verdadero si hoy está dentro del periodo especial.

Consulta verificada contra PostgreSQL.

**Cuota por persona**, al crear un aporte. Cuentan todos los estados, incluido `rechazado`; eliminar un aporte pendiente borra la fila y devuelve el cupo:

```ts
await db.transaction(async (tx) => {
  // Serializa envíos simultáneos de la misma persona a la misma campaña (doble toque en el móvil)
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${actor.id} || ${campaignId}))`);
  const [{ used }] = await tx.select({ used: count() }).from(contributions)
    .where(and(eq(contributions.userId, actor.id), eq(contributions.campaignId, campaignId)));
  if (used >= campaign.quotaPerUser) throw new AppError(409, 'CUOTA_COMPLETA', 'Alcanzaste tu cuota en esta campaña.');
  await tx.insert(contributions).values({ campaignId, userId: actor.id, description, mediaId, checklistAnswers });
});
```

**Máximo de 5 campañas activas:** cuenta las del creador con `status = 'activa'` antes de enviar a revisión y otra vez al activar. El Supervisor podría aprobarla cuando el creador ya activó otras.

## 6. Transacciones: decidir un aporte

La actualización es **condicional sobre el estado de origen**. Si dos personas deciden al mismo tiempo, solo una gana:

```ts
export async function decideContribution(actor: Actor, id: string, input: { decision: 'aceptado' | 'rechazado'; motivo?: string }) {
  const [item] = await db.select().from(contributions).where(eq(contributions.id, id)).limit(1);
  if (!item) throw new AppError(404, 'NO_ENCONTRADO', 'El aporte no existe.');
  await assertCampaignOwner(actor, item.campaignId);
  if (input.decision === 'rechazado' && !input.motivo?.trim()) {
    throw new AppError(400, 'MOTIVO_OBLIGATORIO', 'Indica el motivo del rechazo.');
  }
  // Sin revisor aceptado se decide desde 'pendiente'; con revisor, solo desde 'espera_final'
  const [reviewer] = await db.select({ userId: campaignReviewers.userId }).from(campaignReviewers)
    .where(and(eq(campaignReviewers.campaignId, item.campaignId), eq(campaignReviewers.status, 'aceptado'))).limit(1);
  const from: ('pendiente' | 'espera_final')[] = reviewer ? ['espera_final'] : ['pendiente', 'espera_final'];

  await db.transaction(async (tx) => {
    const [updated] = await tx.update(contributions)
      .set({ status: input.decision, decidedBy: actor.id, decidedAt: new Date(), rejectionReason: input.motivo ?? null })
      .where(and(eq(contributions.id, id), inArray(contributions.status, from)))
      .returning();
    if (!updated) throw new AppError(409, 'ESTADO_CAMBIO', 'Este aporte ya fue revisado o no está listo para la decisión final.');
    if (input.decision === 'aceptado' && updated.userId) {
      // TODO(dominio 9.4 y 9.9): fórmula de XP y tope diario. Los aportes anónimos no suman XP.
    }
    await tx.insert(auditLog).values({
      actorId: actor.id, action: `aportes.${input.decision}`, targetType: 'contribution', targetId: id,
      details: input.motivo ? { motivo: input.motivo } : {},
    });
  });
  // Notificar al participante (motivo incluido) fuera de la transacción
}
```

## 7. Paginación

Usa paginación por cursor, no `OFFSET`. Es estable cuando entran aportes nuevos y funciona con "Cargar más" en móvil.

```ts
const PAGE = 20;
const rows = await db.select().from(contributions)
  .where(and(eq(contributions.campaignId, id), cursor ? lt(contributions.submittedAt, new Date(cursor)) : undefined))
  .orderBy(desc(contributions.submittedAt), desc(contributions.id))
  .limit(PAGE + 1);
const items = rows.slice(0, PAGE);
return { items, nextCursor: rows.length > PAGE ? items.at(-1)!.submittedAt.toISOString() : null };
```

## 8. Errores comunes

| Síntoma | Causa | Solución |
| --- | --- | --- |
| "too many clients" | Pool duplicado entre Express y Next | Pool en `globalThis` (`server/db/client.ts`) |
| Error 23505 | Correo repetido, revisor ya invitado | Atrapar `23505` y responder `AppError(409, ...)` |
| Fechas corridas un día | `new Date('2026-09-12')` se interpreta en UTC y en Tepic (UTC-7) cae el día anterior | Formatear la cadena `YYYY-MM-DD` sin convertirla a `Date`, o fijar `timeZone: 'UTC'` en `toLocaleDateString` |
| Se supera la cuota | Envíos simultáneos | Advisory lock (sección 5) |
| Los ejemplos de la documentación no compilan | Documentación de Drizzle 1.0 beta | Verifica la versión 0.45.x |
