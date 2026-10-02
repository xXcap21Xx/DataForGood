# Rutas: pantallas y endpoints

Cada fila dice **qué archivo implementa la ruta**, **de dónde obtiene sus datos** y **quién puede entrar**. Las rutas no llevan el prefijo `/dataforgood` que se agrega en producción (ver `BASE_PATH` en [README.md](README.md) § 6).

Abreviaturas de la columna "Tipo":

- **S:** Server Component. Lee los datos en el servidor, con funciones de `lib/` o SQL directo.
- **C:** componente cliente (`"use client"`). Lee los datos con `fetch` a `/api/...` desde el navegador.

## Contenido
1. [Pantallas públicas](#1-pantallas-públicas)
2. [Cuenta: `(auth)`](#2-cuenta-auth)
3. [Zona de usuario: `(dashboard)`](#3-zona-de-usuario-dashboard)
4. [Panel del SuperUsuario: `(panel)`](#4-panel-del-superusuario-panel)
5. [API: `app/api`](#5-api-appapi)
6. [Server actions](#6-server-actions)
7. [Qué protege cada capa](#7-qué-protege-cada-capa)

---

## 1. Pantallas públicas

No piden sesión. Archivos en `app/` (fuera de los grupos).

| URL | Archivo | Tipo | Datos |
| --- | --- | --- | --- |
| `/` | `app/page.tsx` | S | SQL directo (`lib/db.ts`) para las cifras de la portada, y `lib/open-data.ts` para los conjuntos destacados. `revalidate = 300`: se regenera cada 5 min y sus consultas van en `try/catch` porque el build corre sin BD |
| `/explorar` | `app/explorar/page.tsx` | S | `lib/campanas/publicas.ts` (`buscarCampanasActivas`, `obtenerTematicasActivas`, `obtenerEstadosActivos`). Filtros en `searchParams`. Al abrir una campaña manda a `/campanas/[id]`, que pide sesión |
| `/datos` | `app/datos/page.tsx` | S | `lib/open-data.ts` (`buscarConjuntosAbiertos`, facetas). Catálogo de campañas `finalizada` |
| `/datos/[id]` | `app/datos/[id]/page.tsx` | S | `lib/open-data.ts` (`obtenerConjuntoAbierto`). El botón de descarga apunta a `GET /api/datos/[id]/descarga` |
| `/contacto`, `/privacidad`, `/sobre-nosotros` | `app/<nombre>/page.tsx` | S | Texto fijo |
| `/c/[token]` | `app/c/[token]/page.tsx` | S | Enlace público de una campaña (se comparte como enlace o QR desde `/campanas/[id]`). `lib/campanas/enlaces.ts`: `buscarEnlacePorToken` y `registrarVisita` (una visita por IP cada 30 min, en memoria). Si el token es vigente y la campaña está activa, invita a aportar: con sesión → `/campanas/[id]/aportar?enlace=<token>`; **sin sesión → formulario anónimo** (`aporte-anonimo.tsx` → `POST /api/c/[token]/aportes`; cuántos le quedan con `aportesDelDispositivo` de `lib/campanas/aportes-anonimos.ts`) y opción de `/entrar` o `/registro` con `?next=`. Si no, muestra "no válido", "ya no funciona" (revocado) o "caducó". Sin formulario si el creador apagó los aportes sin cuenta o si el dispositivo o su red están bloqueados (`bloqueoParaLaPagina`). Es lo único que ve una persona anónima. No indexable |
| `/cuenta-bloqueada` | `app/cuenta-bloqueada/page.tsx` | S | `obtenerBloqueoDeLaSesion()` de `lib/session.ts`; dibuja `components/layout/CuentaBloqueada.tsx`. Si la cuenta no está bloqueada, redirige a `/campanas` o a `/entrar` |
| `/api/docs` | `app/api/docs/route.ts` | — | Swagger UI de `openapi.yaml`. Abierta en `next dev`; en producción pide sesión raíz (`lib/api-docs.ts`) |

## 2. Cuenta: `(auth)`

`app/(auth)/layout.tsx` solo da el marco visual. Ninguna pide sesión.

| URL | Archivo | Tipo | Datos y acciones |
| --- | --- | --- | --- |
| `/entrar` | `(auth)/entrar/page.tsx` | C | `POST /api/auth/login`. Botón de Google → `GET /api/auth/google?next=...`. Respeta `?next=` para volver a la pantalla pedida (`lib/redireccion.ts`) |
| `/registro` | `(auth)/registro/page.tsx` | C | `POST /api/usuarios` (crea la cuenta y envía el código) → `/verificar` |
| `/verificar` | `(auth)/verificar/page.tsx` | C | `GET /api/auth/verificar` (a qué correo se envió), `POST /api/auth/verificar` (código), `POST /api/auth/verificar/reenviar` |
| `/bienvenida` | `(auth)/bienvenida/page.tsx` | C | `GET /api/auth/sesion`, `PATCH /api/usuarios/[id]` (estado, ciudad, especialidad, intereses). Catálogos en `lib/mexico-geo.ts`, `lib/intereses.ts`, `lib/perfil-opciones.ts` |
| `/root` | `(auth)/root/page.tsx` + `RootLoginForm.tsx` | S + C | `POST /api/auth/root` (credencial del SuperUsuario) → `/sistema` |

Flujo de alta: `/registro` → `/verificar` → `/bienvenida` → `/campanas` (o el `?next=` original).

## 3. Zona de usuario: `(dashboard)`

**`app/(dashboard)/layout.tsx`** se ejecuta para todas estas pantallas:

- llama a `exigirUsuario()` (`lib/session.ts`): sin sesión → `/entrar`; cuenta sancionada → `/cuenta-bloqueada`;
- dibuja `TopBar` (con `NotificationsBell`, que lee `GET /api/notificaciones`) y `SidebarNav` (menú lateral; agrega "Supervisión" si el usuario tiene rol `supervisor`);
- monta `VigilanteDeSesion`, que consulta `GET /api/auth/sesion` en cada navegación para sacar al usuario si lo sancionan a media sesión.

### Participar en campañas

| URL | Archivo | Tipo | Datos y acciones |
| --- | --- | --- | --- |
| `/campanas` | `campanas/page.tsx` | C | `GET /api/campanas` (activas) y `GET /api/auth/sesion` (para el filtro "Tu localidad"). Filtros por temática en el cliente |
| `/campanas/[id]` | `campanas/[id]/page.tsx` | C | `GET /api/campanas?id=` (incluye `viewer`: si eres el creador, si estás baneado, cuántos aportes llevas). Guardar como favorita: `POST`/`DELETE /api/campanas/[id]/guardar`. El botón **Compartir** abre un `<dialog>` (`compartir.tsx` + `enlace-publico.tsx` + `regenerar.tsx`) con el enlace público `/c/[token]`, cuenta regresiva, copiar, QR y descargas: lo carga con `GET /api/campanas/[id]/enlace` y el QR con `GET /api/campanas/[id]/qr`. Cualquiera con sesión lo ve; solo el creador regenera (`POST /api/campanas/[id]/enlace`), ve visitas y aportes del enlace y cambia "Permitir aportes sin cuenta" (`permitir-anonimos.tsx` → `PATCH /api/campanas/[id]/enlace`) |
| `/campanas/[id]/aportar` | `campanas/[id]/aportar/page.tsx` | C | `GET /api/campanas?id=`, `GET /api/aportes?campaignId=&mine=true` (tus aportes, para la cuota). Envía con `POST /api/aportes` (`multipart/form-data` con el archivo). Checklists con `lib/campanas/checklist.ts`. Si la URL trae `?enlace=<token>` (viene de `/c/[token]`), lo reenvía para atribuir el aporte al enlace |
| `/mis-aportes` | `mis-aportes/page.tsx` | C | `GET /api/campanas?misAportes=true` (campañas en las que aportaste o que guardaste) |
| `/mis-aportes/[campanaId]` | `mis-aportes/[campanaId]/page.tsx` | C | `GET /api/campanas?id=`, `GET /api/aportes?campaignId=&mine=true`. Muestra el motivo de los rechazados. Borrar un aporte no aceptado: `DELETE /api/aportes/[id]` |
| `/cuenta` | `cuenta/page.tsx` + `PerfilForm.tsx` | S + C | La página lee el usuario con `exigirUsuario()`. El formulario guarda con `PATCH /api/usuarios/[id]` |

### Administrar campañas propias (creador)

Cualquier usuario puede crear campañas. Todas estas rutas comprueban en el servidor que seas el creador (`campanas.creator_id`).

| URL | Archivo | Tipo | Datos y acciones |
| --- | --- | --- | --- |
| `/mis-campanas` | `mis-campanas/page.tsx` | C | `GET /api/campanas?mine=true`. Botón "Finalizar": `PATCH /api/campanas/[id]` con `{ status: "finalizada" }` |
| `/mis-campanas/nueva` (`?edit=<id>` para editar) | `mis-campanas/nueva/page.tsx` + `NuevaCampanaForm.tsx` | S + C | Crear: `POST /api/campanas`. Editar: `GET /api/campanas/[id]` y `PATCH /api/campanas/[id]`. Lo que se puede editar depende del estado (ver [datos.md](datos.md) § 3) |
| `/mis-campanas/[id]/aportes` | `mis-campanas/[id]/aportes/page.tsx` | C | Bandeja de aportes: `GET /api/campanas/[id]`, `GET /api/aportes?campaignId=` (todos, solo el creador), con filtros por estado en el cliente. La sección de baneados (`baneados.tsx`) usa `GET`/`DELETE /api/campanas/[id]/baneos` |
| `/mis-campanas/[id]/aportes/[aporteId]` | `.../aportes/[aporteId]/page.tsx` | C | `GET /api/aportes/[id]`; aceptar o rechazar: `PATCH /api/aportes/[id]` con `{ status, rejectionReason, inapropiado? }`. Banear al participante: `POST`/`DELETE /api/campanas/[id]/baneos`; en un aporte anónimo, el mismo `POST` bloquea su dispositivo en la campaña y `DELETE { bloqueoId }` lo desbloquea. Borrar el archivo de un aporte anónimo: `DELETE /api/aportes/[id]/archivo`. La imagen se carga de `GET /api/aportes/[id]/archivo` |
| `/mis-campanas/[id]/aportes/agregar-revisor` | `.../agregar-revisor/page.tsx` | C | Buscar personas: `GET /api/usuarios?campanaId=&q=`. Listar e invitar revisores: `GET`/`POST /api/campanas/[id]/revisores` |
| `/mis-campanas/[id]/panel` | `mis-campanas/[id]/panel/page.tsx` | C | `GET /api/campanas?id=`, `GET /api/campanas/[id]/recoleccion-diaria` (gráficas) |
| `/mis-campanas/[id]/especial` | `mis-campanas/[id]/especial/page.tsx` | C | `GET /api/campanas?id=`. Pantalla de campaña especial (multiplicador de XP); la regla aún no está implementada en el servidor |

### Revisión de aportes (revisor invitado)

Para revisores que aceptaron una invitación (`campana_revisores.estado = 'aceptado'`). La invitación llega como notificación y se acepta con `POST /api/notificaciones/[id]/aceptar`.

| URL | Archivo | Tipo | Datos y acciones |
| --- | --- | --- | --- |
| `/revisiones` | `revisiones/page.tsx` → `CampaignList.tsx` | S → C | `GET /api/revisiones` (campañas donde eres revisor), pestaña "en curso" |
| `/revisiones/finalizadas` | `revisiones/finalizadas/page.tsx` → `CampaignList.tsx` | S → C | Lo mismo, pestaña "finalizadas" |
| `/revisiones/campanas/[campaignId]` | `revisiones/campanas/[campaignId]/page.tsx` | C | `GET /api/campanas/[id]`, `GET /api/aportes?campaignId=&reviewer=true` |
| `/revisiones/[aporteId]` | `revisiones/[aporteId]/page.tsx` | C | `GET /api/aportes/[id]`; aceptar: `PATCH /api/aportes/[id]` con `{ status: "aceptado" }`. Aporte anónimo: "Marcar como inapropiado" con `POST /api/aportes/[id]/inapropiado` |
| `/revisiones/campanas/[campaignId]/usuarios`, `.../usuarios/[userId]/aportes`, `.../aportes/[aporteId]` | `revisiones/campanas/[campaignId]/usuarios/**/page.tsx` | S | SQL directo con `pool` tras `exigirUsuario()`; comprueban en la consulta que seas revisor aceptado |

### Supervisión (usuario con rol `supervisor`)

**`supervision/layout.tsx`** exige el rol `supervisor` (si no lo tienes → `/campanas`). Cada página de servidor lo vuelve a comprobar.

| URL | Archivo | Tipo | Datos y acciones |
| --- | --- | --- | --- |
| `/supervision` | `supervision/page.tsx` | C | `GET /api/campanas` (las `en_revision` que puedes tomar), `GET /api/campanas?supervised=true` (las tuyas), `GET /api/auth/sesion` |
| `/supervision/campanas` | `supervision/campanas/page.tsx` | C | `GET /api/campanas?supervised=true` |
| `/supervision/[campaignId]` | `supervision/[campaignId]/page.tsx` | C | `GET /api/campanas?id=`. Tomar: `PATCH /api/campanas/[id]` con `{ action: "tomar" }`. Dictaminar: `PATCH` con `{ action: "aceptada" \| "rechazada" \| "reportada", motivo }` |
| `/supervision/[campaignId]/panel` | `supervision/[campaignId]/panel/page.tsx` | S | `lib/campanas/panel.ts` (`obtenerPanelDeCampana`) → `components/supervision/PanelDeCampanaSupervisor` |
| `/supervision/[campaignId]/usuarios` y subrutas `[userId]/aportes`, `[aporteId]` | `supervision/[campaignId]/usuarios/**/page.tsx` | S | SQL directo con `pool`; solo campañas donde `supervisor_id` eres tú |

## 4. Panel del SuperUsuario: `(panel)`

**`app/(panel)/layout.tsx`** llama a `hasRootSession()` (`lib/rootSession.ts`); sin sesión raíz → `/root`. Dibuja `components/sistema/Topbar` y `Sidebar`.

Comprobación propia de cada página, además del layout:

- `/supervisar/**` y `/sistema/campanas/**`: sí, porque las funciones de `lib/supervision/root.ts` y `lib/campanas/sistema.ts` comprueban la sesión raíz.
- **`/sistema` y `/usuarios/**`: no.** Ni la página ni `lib/sistema/metricas.ts` ni `lib/usuarios/{directorio,dashboard,supervisores}.ts` la comprueban; solo el layout las protege. Las server actions que escriben sí verifican. Ver problemas conocidos en [README.md](README.md).

Patrón: página de servidor que lee de `lib/` + componente cliente hermano que llama a server actions (§ 6).

| URL | Archivo | Datos (lectura) | Acciones (escritura) |
| --- | --- | --- | --- |
| `/sistema` | `sistema/page.tsx` | `lib/sistema/metricas.ts` | — |
| `/sistema/campanas` | `sistema/campanas/page.tsx` + `filtros.tsx` | `lib/campanas/sistema.ts` (`buscarCampanas`, `contarPorEstado`, `listarTematicas`); constantes en `sistema-opciones.ts` | — (solo consulta) |
| `/sistema/campanas/dashboard` | `sistema/campanas/dashboard/page.tsx` | `obtenerDashboardDeCampanas` | — |
| `/sistema/campanas/[id]` | `sistema/campanas/[id]/page.tsx` | `obtenerCabeceraDeCampana`, `lib/campanas/panel.ts` | — |
| `/usuarios` | `usuarios/page.tsx` + `filtros.tsx` | `lib/usuarios/directorio.ts` (`buscarUsuarios`) | — |
| `/usuarios/dashboard` | `usuarios/dashboard/page.tsx` + `selector-de-rango.tsx` | `lib/usuarios/dashboard.ts` | — |
| `/usuarios/[id]` | `usuarios/[id]/page.tsx` | `obtenerUsuario`, `baneosDeUsuario` (`lib/campanas/baneos.ts`) | — |
| `/usuarios/[id]/roles` | `usuarios/[id]/roles/page.tsx` + `botones-de-rol.tsx` | `obtenerUsuario` | `asignarRol`, `revocarRol` |
| `/usuarios/[id]/sancion` | `usuarios/[id]/sancion/page.tsx` + `formulario.tsx` | `obtenerReporteDeSancion` | `aplicarSancion` |
| `/usuarios/sanciones` | `usuarios/sanciones/page.tsx` + `boton-restaurar.tsx` + `boton-quitar-bloqueo.tsx` | `listarSancionesActivas`, `listarBloqueosGlobales` | `restaurarAcceso`, `quitarBloqueoDeDispositivo` |
| `/usuarios/supervisores` | `usuarios/supervisores/page.tsx` + `buscador.tsx` | `lib/usuarios/supervisores.ts` | — |
| `/usuarios/supervisores/[id]` | `usuarios/supervisores/[id]/page.tsx` | `obtenerActividad` | — |
| `/usuarios/supervisores/[id]/revertir/[accionId]` | `.../revertir/[accionId]/page.tsx` + `formulario.tsx` | `obtenerAccion` | `revertirAccion` (**sin lógica todavía**) |
| `/supervisar` | `supervisar/page.tsx` + `pestanas.tsx` | `lib/supervision/root.ts` (`listarCampanasParaRoot`) | — |
| `/supervisar/campanas` | `supervisar/campanas/page.tsx` | `listarCampanasParaRoot` | — |
| `/supervisar/[campaignId]` | `supervisar/[campaignId]/page.tsx` + `acciones.tsx` | `obtenerCampanaParaRoot` | `tomarComoSuperUsuario`, `decidirComoSuperUsuario` |
| `/supervisar/[campaignId]/panel` | `supervisar/[campaignId]/panel/page.tsx` | `obtenerCampanaSupervisadaPorRoot`, `lib/campanas/panel.ts` | — |
| `/supervisar/[campaignId]/usuarios` y subrutas | `supervisar/[campaignId]/usuarios/**/page.tsx` | SQL directo con `pool` | — |

`/supervisar` es la versión de `/supervision` para el SuperUsuario: mismas reglas (`lib/supervision/decision.ts`), pero con sesión raíz y server actions en vez de `fetch`.

## 5. API: `app/api`

Todos los archivos están en `app/api/<ruta>/route.ts`. Respuesta: `{ data }` o `{ error }`. Contrato completo con ejemplos en `openapi.yaml` (`/api/docs`).

"Sesión" = `getSessionUser()` devuelve un usuario (cuenta verificada y sin sanción que bloquee).

### Autenticación

| Método y ruta | Acceso | Qué hace | La llama |
| --- | --- | --- | --- |
| `POST /api/auth/login` | Libre | Correo + contraseña. 5 fallos → bloqueo de 15 min. Rechaza cuentas sin verificar. Mismo 401 si el correo no existe, si la cuenta es de Google o si la contraseña está mal (y tarda lo mismo). Crea la cookie `session_token` | `/entrar` |
| `POST /api/auth/logout` | Libre | Borra la sesión y la cookie | `LogoutButton` |
| `GET /api/auth/sesion` | Libre | Devuelve el usuario de la sesión o `null` | `/bienvenida`, `/campanas`, `/supervision`, `VigilanteDeSesion` |
| `GET /api/auth/google` | Libre | Redirige a Google (guarda `state` y `next` en cookies) | `/entrar`, `/registro` |
| `GET /api/auth/google/callback` | Libre | Vincula o crea la cuenta, inicia sesión y redirige | Google |
| `GET`, `POST /api/auth/verificar` | Cookie `pending_verification_id` | GET: correo pendiente. POST: valida el código de 6 dígitos (vence en 15 min, 3 intentos) | `/verificar` |
| `POST /api/auth/verificar/reenviar` | Cookie pendiente | Genera y envía un código nuevo | `/verificar` |
| `POST /api/auth/root` | Libre (5 intentos/min por IP) | Valida `ROOT_USER_ID` + `ROOT_PASSWORD_HASH` y crea la cookie `root_session_token` | `/root` |

### Usuarios

| Método y ruta | Acceso | Qué hace | La llama |
| --- | --- | --- | --- |
| `POST /api/usuarios` | Libre | Registro. Crea la cuenta sin verificar, siempre con el rol `usuario`, y envía el código | `/registro` |
| `GET /api/usuarios?campanaId=&q=` | Sesión + creador de esa campaña | Busca personas para invitar como revisor (máx. 10, correo oculto) | `agregar-revisor` |
| `GET /api/usuarios/[id]` | Sesión + la cuenta propia | Tu perfil | — |
| `PATCH /api/usuarios/[id]` | Sesión, solo tu propio id | Actualiza perfil (estado, ciudad, especialidad, intereses...) | `/bienvenida`, `/cuenta` |

### Campañas

| Método y ruta | Acceso | Qué hace | La llama |
| --- | --- | --- | --- |
| `GET /api/campanas` | Libre (sin filtros) | Campañas activas. Antes de responder activa las `aceptada` cuya fecha llegó y finaliza las vencidas (`lib/campaign-date.ts`) | `/campanas`, `/supervision` |
| `GET /api/campanas?id=<id>` | Libre | Una campaña + bloque `viewer` si hay sesión | Muchas pantallas de detalle |
| `GET /api/campanas?mine=true` | Sesión | Tus campañas creadas | `/mis-campanas`, formulario |
| `GET /api/campanas?misAportes=true` | Sesión | Campañas donde aportaste o que guardaste | `/mis-aportes` |
| `GET /api/campanas?available=true` | Sesión | Activas a las que todavía puedes aportar | — |
| `GET /api/campanas?supervised=true` | Sesión | Campañas que supervisas | `/supervision` |
| `POST /api/campanas` | Sesión | Crea una campaña de quien tiene la sesión: solo `borrador` (por defecto) o `en_revision`; con 5 activas, solo borrador. Contadores, XP (50) y "especial" los fija el servidor (`lib/campanas/estado-del-creador.ts`) | Formulario |
| `GET /api/campanas/[id]` | Libre | Detalle de la campaña + `viewer.isCreator` | Bandeja, formulario de edición, revisión |
| `PATCH /api/campanas/[id]` | Sesión | **Tres usos según el body:** `{ action: "tomar" }` (supervisor la toma); `{ action: "aceptada"\|"rechazada"\|"reportada", motivo }` (dictamen del supervisor que la tomó); cualquier otro body = edición del creador, con reglas por estado (en borrador, en revisión o rechazada solo puede pedir `borrador` o `en_revision`; XP y "revisor asignado" no se editan) | Formulario, `/mis-campanas`, `/supervision/[id]` |
| `PUT /api/campanas/[id]` | Sesión + creador, campaña en `borrador`, `en_revision` o `rechazada` | Reemplazo completo de los campos editables (pensado para Insomnia). `status` solo `borrador` o `en_revision`; no cambia XP ni "revisor asignado" | — |
| `POST`, `DELETE /api/campanas/[id]/guardar` | Sesión | Guardar o quitar de favoritos | `/campanas/[id]` |
| `GET`, `POST /api/campanas/[id]/revisores` | Sesión + creador | Listar revisores; invitar a uno (le llega una notificación) | `agregar-revisor` |
| `GET`, `POST`, `DELETE /api/campanas/[id]/baneos` | Sesión + creador | Listar (`data`: cuentas; `dispositivos`: anónimos bloqueados), banear o desbanear. Con un aporte anónimo, `POST` bloquea su dispositivo en la campaña; `DELETE { bloqueoId }` lo desbloquea. Bitácora `campana.{bloquear,desbloquear}_dispositivo` | Detalle del aporte, `baneados.tsx` |
| `GET /api/campanas/[id]/recoleccion-diaria` | Sesión + creador | Aportes por día y por tipo, para las gráficas | `/mis-campanas/[id]/panel` |
| `GET /api/campanas/[id]/enlace` | Sesión | Enlace actual (vigente o caducado) o `null`, el estado de la campaña y `viewer.esCreador`. Visitas y aportes del enlace solo para el creador | Cuadro Compartir de `/campanas/[id]` |
| `POST /api/campanas/[id]/enlace` | Sesión + creador, campaña `activa` | Genera o regenera el enlace público (24 h). Revoca el anterior sin borrarlo. Bitácora `campana.enlace_regenerar` | `regenerar.tsx` en `/campanas/[id]` |
| `PATCH /api/campanas/[id]/enlace` | Sesión + creador | `{ permiteAnonimos }`: permite o corta los aportes sin cuenta. Bitácora `campana.anonimos_cambiar` | `permitir-anonimos.tsx` en `/campanas/[id]` |
| `GET /api/campanas/[id]/qr?formato=png\|svg` | Sesión | QR (512 px) del enlace vigente, como descarga; también se usa como `<img>`. `410` si caducó | Cuadro Compartir de `/campanas/[id]` |

### Aportes

| Método y ruta | Acceso | Qué hace | La llama |
| --- | --- | --- | --- |
| `GET /api/aportes?campaignId=&mine=true` | Sesión | Tus propios aportes en esa campaña | Aportar, `/mis-aportes/[campanaId]` |
| `GET /api/aportes?campaignId=` | Sesión + creador | Todos los aportes de la campaña | Bandeja `/mis-campanas/[id]/aportes` |
| `GET /api/aportes?campaignId=&reviewer=true` | Sesión + revisor aceptado | Aportes para revisar | `/revisiones/campanas/[id]` |
| `POST /api/aportes` | Sesión | `multipart/form-data`: sube el archivo a MinIO e inserta el aporte. Valida: campaña activa, no eres el creador, no estás baneado, te queda cuota, JPG/PNG ≤ 10 MB. Campo opcional `enlace` (token de `/c/[token]`): si es el vigente de la campaña, se guarda en `aportes.enlace_id` | `/campanas/[id]/aportar` |
| `GET /api/aportes/[id]` | Sesión + quien aportó, creador o revisor | Detalle | Detalle del aporte, revisiones |
| `PATCH /api/aportes/[id]` | Sesión + creador o revisor aceptado | Revisar: `{ status: "aceptado" \| "rechazado", rejectionReason, inapropiado? }`. El motivo es obligatorio al rechazar. `inapropiado: true` solo al rechazar un aporte anónimo (puede disparar el bloqueo global). Si el creador acepta, se quita la marca. El revisor solo valida aportes `pendiente`: quedan en `espera_final` y no recibe el correo del participante. El creador solo acepta o rechaza. Recalcula los contadores de la campaña | Detalle del aporte, `/revisiones/[aporteId]` |
| `PUT /api/aportes/[id]` | Sesión + quien aportó, mientras esté `pendiente` | Editar descripción y características | — (Insomnia) |
| `DELETE /api/aportes/[id]` | Sesión + quien aportó, si el aporte no está `aceptado` | Borra el aporte y su archivo de MinIO, y recalcula los contadores. No revisa el estado de la campaña | `/mis-aportes/[campanaId]` |
| `POST /api/c/[token]/aportes` | **Libre (sin sesión)**, solo enlace vigente de campaña activa; con sesión responde 409 | Aporte anónimo (`multipart/form-data`: `file`, `description`, `caracteristicas`). Guarda `user_id` NULL, "Anónimo", sin correo ni nombre de archivo. Cuota por dispositivo (cookie `anonimo_id`), 60 s de espera entre aportes del mismo dispositivo (`429` con `esperaSegundos` y `Retry-After`) y tope de 20 por IP por hora. `403` si la campaña no permite anónimos o el dispositivo o su red están bloqueados. La foto se guarda sin metadatos. Responde solo cuántos le quedan | Formulario de `/c/[token]` |
| `GET /api/aportes/[id]/archivo` | Sesión + quien aportó, creador, o revisor (si el aporte está pendiente o él lo revisó) | Lee el archivo de MinIO y lo devuelve con `nosniff`. `410` si se borró. Se usa como `src` de `<img>` | Pantallas de detalle |
| `DELETE /api/aportes/[id]/archivo` | Sesión + creador, solo aportes anónimos | Borra el archivo de MinIO; la fila se conserva. Bitácora `aporte.archivo_borrar` | Detalle del aporte del creador |
| `POST /api/aportes/[id]/inapropiado` | Sesión + creador o revisor aceptado, solo aportes anónimos | Marca "Contenido inapropiado" sin cambiar el estado; puede disparar el bloqueo global. Bitácora `aporte.inapropiado` | `/revisiones/[aporteId]` |

### Revisiones, notificaciones y datos abiertos

| Método y ruta | Acceso | Qué hace | La llama |
| --- | --- | --- | --- |
| `GET /api/revisiones` | Sesión | Campañas donde eres revisor aceptado, con conteos (`pendingContributions` = aportes `pendiente`, los que le tocan al revisor) | `/revisiones` |
| `GET /api/notificaciones` | Sesión | Tus notificaciones | `NotificationsBell` |
| `POST /api/notificaciones/[id]/aceptar` | Sesión, dueño de la notificación | Acepta una invitación de revisor | `NotificationsBell` |
| `GET /api/datos/[id]/descarga` | Libre | ZIP con los archivos de los aportes aceptados de una campaña `finalizada` (sin datos personales). Suma 1 a `downloads_count` | `/datos/[id]` |
| `GET /api/docs`, `GET /api/docs/spec` | `next dev` libre; producción con sesión raíz | Swagger UI y el YAML | Navegador |

## 6. Server actions

Funciones `"use server"` que el panel llama como si fueran funciones locales. Next las expone como endpoints, así que **cada una verifica la sesión raíz por su cuenta**.

| Archivo | Acción | Qué hace | La llama |
| --- | --- | --- | --- |
| `lib/usuarios/acciones-usuarios.ts` | `asignarRol(id, rol)` | Agrega un rol (p. ej. `supervisor`). Bitácora `rol.asignar` | `/usuarios/[id]/roles` |
| | `revocarRol(id, rol)` | Quita un rol; si era supervisor, libera sus campañas `en_revision`. Bitácora `rol.revocar` | `/usuarios/[id]/roles` |
| | `aplicarSancion(id, datos)` | Strike, suspensión o baneo. Al 3er strike banea automáticamente. Bitácora `sancion.aplicar` | `/usuarios/[id]/sancion` |
| | `restaurarAcceso(sancionId)` | Desactiva una sanción. Bitácora `sancion.restaurar` | `/usuarios/sanciones` |
| `lib/usuarios/acciones-supervisor.ts` | `revertirAccion(...)` | **TODO: aún no hace nada** | `/usuarios/supervisores/[id]/revertir/...` |
| `lib/supervision/acciones-root.ts` | `tomarComoSuperUsuario(id)` | El SuperUsuario toma una campaña `en_revision` | `/supervisar/[id]` |
| | `decidirComoSuperUsuario(id, accion, motivo)` | Dictamen del SuperUsuario (usa la misma lógica que el `PATCH` de campañas) | `/supervisar/[id]` |

## 7. Qué protege cada capa

| Ruta | `proxy.ts` (¿hay cookie?) | Layout | Página / handler |
| --- | --- | --- | --- |
| `/campanas`, `/mis-aportes`, `/mis-campanas`, `/cuenta`, `/supervision` | Sí → `/entrar?next=` | `exigirUsuario()` | Cliente: la API verifica. Servidor: `exigirUsuario()` |
| `/revisiones` | **No** (no está en el `matcher`) | `exigirUsuario()` | La API o `exigirUsuario()` + SQL |
| `/supervision/**` | Sí | + rol `supervisor` | + rol `supervisor` |
| `/sistema` | Sí (cookie raíz) → `/root` | `hasRootSession()` | `/sistema/campanas/**`: sí (lo hace `lib/campanas/sistema.ts`). `/sistema`: **solo el layout** |
| `/supervisar` | **No** | `hasRootSession()` | `exigirSesionRoot()` (en `lib/supervision/root.ts`) |
| `/usuarios` | **No** | `hasRootSession()` | **Solo el layout**; las server actions sí verifican |
| `/api/**` | Solo CSRF en mutaciones | — | `getSessionUser()` + permiso sobre el recurso |

`proxy.ts` es un atajo para redirigir rápido, **no un control de acceso**: la seguridad real está en las dos columnas de la derecha. Más detalle en [permisos.md](permisos.md).
