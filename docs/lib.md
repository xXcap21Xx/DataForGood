# Módulos de `lib/`

`lib/` contiene toda la lógica de servidor: conexión a la BD, sesiones, reglas de negocio, consultas y server actions. Las páginas y los route handlers de `app/` la importan con el alias `@/lib/...`.

**Marcas:**

- 🟢 **Sin imports de servidor:** se puede importar desde un componente cliente (`"use client"`).
- ⚡ **Server actions** (`"use server"`): el panel las llama directamente desde componentes cliente.
- Todo lo demás **solo se usa en el servidor** (importa `pg`, `cookies()`, MinIO...). Si lo importas en un componente cliente, el build falla.

## Infraestructura

| Archivo | Qué hace | Exporta |
| --- | --- | --- |
| `db.ts` | Pool de conexiones a PostgreSQL (se crea en el primer uso) | `pool`, `dbQuery` |
| `db-schema.ts` | **El esquema completo** de la BD. Lo ejecuta `instrumentation.ts` al arrancar | `ensureCoreSchema`, `ensure<Tabla>Table` |
| `minio.ts` | Cliente de MinIO: subir y leer archivos | `saveUploadedFile`, `readUploadedFile` |
| `base-path.ts` 🟢 | Prefijo de la app (`/dataforgood` en producción, vacío en `next dev`) | `BASE_PATH` |
| `app-url.ts` | URL absoluta con `APP_ORIGIN` + `BASE_PATH` (para redirecciones y correos) | `absoluteUrl` |
| `ip.ts` | IP real del cliente detrás del proxy | `ipDelCliente` |
| `api-docs.ts` | Decide si se puede ver `/api/docs` | `puedeVerDocs` |

## Autenticación y cuentas

| Archivo | Qué hace | Exporta |
| --- | --- | --- |
| `session.ts` | Sesión del usuario: crearla, leerla, cerrarla; detectar si está bloqueado | `getSessionUser`, `exigirUsuario`, `createSession`, `destroySession`, `obtenerBloqueoDeLaSesion`, `SessionUser` |
| `rootSession.ts` | Sesión del SuperUsuario | `createRootSession`, `hasRootSession`, `destroyRootSession` |
| `password.ts` | Hash y verificación de contraseñas (bcrypt; migra hashes viejos) | `hashPassword`, `verifyPassword`, `wasLegacyHash` |
| `verification.ts` | Código de verificación por correo | `startVerification`, `verifyCode`, `getPendingVerification`, `PENDING_COOKIE` |
| `google.ts` | OAuth de Google | `getGoogleAuthUrl`, `exchangeCodeForProfile` |
| `redireccion.ts` 🟢 | Valida el parámetro `?next=` para que solo apunte a rutas internas | `destinoSeguro`, `conDestino`, `DESTINO_POR_DEFECTO` |
| `roles.ts` | Códigos de rol válidos | `VALID_ROLES`, `normalizeRoles` |
| `sanciones.ts` | ¿La cuenta está bloqueada? Tipos de sanción y regla de 3 strikes | `obtenerBloqueo`, `contarSanciones`, `TIPOS_DE_SANCION`, `STRIKES_PARA_BANEO`, `SQL_SANCION_BLOQUEANTE` |
| `auditoria.ts` | Escribe en `audit_log` | `registrarAuditoria`, `AccionAuditada` |
| `validation.ts` 🟢 | Validaciones sueltas | `isValidEmail` |

## Catálogos (listas fijas)

| Archivo | Contenido |
| --- | --- |
| `intereses.ts` 🟢 | `TEMAS_DE_INTERES`: las 23 temáticas. Se usan como intereses del perfil **y** como temática de las campañas |
| `mexico-geo.ts` 🟢 | Estados y municipios de México (`ESTADOS_DE_MEXICO`, `municipiosDe`) |
| `perfil-opciones.ts` 🟢 | Especialidades del perfil |
| `campaign-date.ts` | Fechas de campaña y las transiciones automáticas (`activateScheduledCampaigns`, `finalizeExpiredCampaigns`, `hasCampaignStarted`, `hasCampaignEnded`) |
| `open-data.ts` | Catálogo de datos abiertos (`/datos`): búsqueda, facetas, formatos, licencia |

## Por módulo

### `campanas/`

| Archivo | Qué hace | Lo usa |
| --- | --- | --- |
| `publicas.ts` | Búsqueda de campañas activas con filtros | `/explorar` |
| `panel.ts` | Métricas de una campaña (aportes por estado, participantes, avance) | Paneles de `/supervision`, `/supervisar`, `/sistema/campanas/[id]` |
| `baneos.ts` | Baneos por campaña: consultar, listar, quitar | API de baneos, `/api/aportes`, `/usuarios/[id]` |
| `checklist.ts` 🟢 | Checklists con título: normalizar, validar respuestas, límites (`MAX_SECCIONES`...) | Formulario de campaña, aportar, API |
| `sistema.ts` | Consultas del panel del SuperUsuario (listado, conteos, dashboard). Exigen sesión raíz | `/sistema/campanas/**` |
| `sistema-opciones.ts` 🟢 | Constantes y tipos de esas pantallas (pestañas, etiquetas, órdenes) | `/sistema/campanas/filtros.tsx` |

### `supervision/`

| Archivo | Qué hace | Lo usa |
| --- | --- | --- |
| `decision.ts` | **Reglas del dictamen**, compartidas por supervisores y SuperUsuario: tomar una campaña (`tomarCampanaParaSupervisar`) y aceptarla, rechazarla o reportarla (`registrarDecisionDeCampana`). Notifica al creador y escribe en la bitácora | `PATCH /api/campanas/[id]`, `acciones-root.ts` |
| `root.ts` | Guardia `exigirSesionRoot()` y consultas de `/supervisar` | Páginas de `(panel)` |
| `acciones-root.ts` ⚡ | `tomarComoSuperUsuario`, `decidirComoSuperUsuario` | `/supervisar/[campaignId]` |

### `usuarios/`

| Archivo | Qué hace | Lo usa |
| --- | --- | --- |
| `directorio.ts` | Búsqueda de usuarios, ficha, estado de la cuenta, sanciones activas | `/usuarios/**` |
| `dashboard.ts` | Métricas de usuarios por rango de fechas | `/usuarios/dashboard` |
| `supervisores.ts` | Lista de supervisores y su actividad | `/usuarios/supervisores/**` |
| `revisor.ts` | Retirar a alguien como revisor de todas sus campañas | `revocarRol` (al quitar el rol de revisor) |
| `rol-asignable.ts` 🟢 | Nombres y descripciones de roles para la interfaz | Panel |
| `acciones-usuarios.ts` ⚡ | `asignarRol`, `revocarRol`, `aplicarSancion`, `restaurarAcceso` | `/usuarios/[id]/{roles,sancion}`, `/usuarios/sanciones` |
| `acciones-supervisor.ts` ⚡ | `revertirAccion` (**sin implementar**) | `/usuarios/supervisores/[id]/revertir/...` |

### `sistema/`

| Archivo | Qué hace | Lo usa |
| --- | --- | --- |
| `metricas.ts` | Cifras generales del sistema | `/sistema` |

## Fuera de `lib/`

| Archivo | Qué hace |
| --- | --- |
| `proxy.ts` | Redirección por cookie y CSRF en `/api` (ver [permisos.md](permisos.md)) |
| `instrumentation.ts` + `instrumentation-node.ts` | Al arrancar: valida `DATABASE_URL` y corre `ensureCoreSchema()` |
| `types/index.ts` | Tipos que devuelve la API a la zona de usuario (`Campaign`, `Contribution`, `User`, estados) |
| `components/supervision/RefrescoEnVivo.tsx` | Refresca la página cada pocos segundos (`router.refresh()`) en paneles de campañas activas |
| `components/layout/VigilanteDeSesion.tsx` | Revisa la sesión en cada navegación del cliente |
