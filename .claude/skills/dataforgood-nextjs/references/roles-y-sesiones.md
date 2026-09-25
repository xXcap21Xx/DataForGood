# Cuentas, sesiones, roles y permisos

## Contenido
1. Dos tipos de sesión
2. Capas de protección
3. Roles
4. Acceso por campaña
5. Registro, verificación e inicio de sesión
6. Sanciones y baneos
7. Bitácora (`audit_log`)
8. Huecos conocidos

Las reglas de negocio y los puntos abiertos están en `dominio.md`, secciones 1, 2 y 9.

## 1. Dos tipos de sesión

| | Usuario | SuperUsuario |
| --- | --- | --- |
| Archivo | `lib/session.ts` | `lib/rootSession.ts` |
| Cookie | `session_token`, httpOnly, `SameSite=Lax`, 30 días | `root_session_token`, httpOnly, `SameSite=Strict`, 2 horas |
| Tabla | `sessions` (`usuario_id`) | `root_sessions` (sin usuario) |
| Leer | `getSessionUser()` → `SessionUser \| null` (con `cache` de React: una consulta por petición) | `hasRootSession()` → `boolean` |
| Crear / cerrar | `createSession(id)` / `destroySession()` | `createRootSession()` / `destroyRootSession()` |

- **Tokens:** 32 bytes aleatorios. En la BD solo se guarda su sha256.
- **El SuperUsuario no es una fila de `usuarios`.** Su credencial está en `ROOT_USER_ID` + `ROOT_PASSWORD_HASH` (bcrypt) y entra por `/root` → `POST /api/auth/root`. Esa ruta compara sin cortocircuito y limita a 5 intentos por minuto por IP, con un `Map` en memoria.
- **Las dos sesiones son independientes.** Una persona con rol `supervisor` no entra al panel raíz, y la sesión raíz no sirve en `(dashboard)`.

## 2. Capas de protección

1. **`proxy.ts`:** en páginas solo comprueba que exista la cookie y redirige; no es autorización. En `/api`, rechaza con 403 las mutaciones (POST, PATCH, PUT, DELETE) cuyo `Origin` no sea el host de la petición (`Host` o `X-Forwarded-Host`) ni el de `APP_ORIGIN`; también las que traen `Sec-Fetch-Site: cross-site` sin `Origin`. Sin `Origin` (clientes que no son navegador) deja pasar, porque no pueden usar la cookie de otra persona. Las server actions no pasan por ahí: Next verifica su `Origin`.
2. **Layouts:** `(panel)/layout.tsx` (sesión raíz) y `(dashboard)/supervision/layout.tsx` (rol `supervisor`).
3. **Cada página, route handler y server action vuelve a verificar.** En el panel se usa `exigirSesionRoot()` (`lib/supervision/root.ts`) o `exigirSuperUsuario()` (`lib/usuarios/acciones-usuarios.ts`, `acciones-supervisor.ts`). En la API, `getSessionUser()` más la comprobación de permiso sobre el recurso.

## 3. Roles

`usuarios.role` es JSONB con códigos de `lib/roles.ts`: `usuario` (siempre), `supervisor`, `revisor` y `admin` (sin uso definido).

| Rol | Cómo se obtiene | Qué habilita |
| --- | --- | --- |
| Usuario común | Toda cuenta | Explorar, aportar, crear y administrar sus campañas |
| Revisor de aportes | El creador invita (`POST /api/campanas/[id]/revisores`) y la persona acepta desde sus notificaciones (`/api/notificaciones/[id]/aceptar`). Vale **por campaña** (`campana_revisores.estado = 'aceptado'`). `getSessionUser()` agrega `revisor` a `role` si tiene alguna asignación aceptada | `/revisiones`: primera instancia de los aportes de esas campañas |
| Supervisor | **Solo el SuperUsuario** (`asignarRol`). Al revocarlo (`revocarRol`), las campañas que tomó y siguen `en_revision` quedan libres | `/supervision`: tomar y dictaminar campañas `en_revision` ajenas |
| SuperUsuario | Credencial raíz | Panel `/sistema`, `/usuarios`, `/supervisar` |

- **Crear campañas no requiere rol.**
- **Supervisor y Revisor se pueden combinar.**
- **Los roles se leen en cada petición**, así que un cambio aplica en la misma sesión.
- **Nombres y textos de roles para la interfaz:** `lib/usuarios/rol-asignable.ts` (sin imports de servidor).

## 4. Acceso por campaña

No hay una función central: cada route handler lo comprueba con SQL. Si agregas una ruta, copia la comprobación del handler más parecido, o mejor, extrae una función a `lib/`.

| Acción | Condición |
| --- | --- |
| Bandeja, panel, compartir, especial, editar, pausar, invitar revisor, banear | `campanas.creator_id = user.id` |
| Primera instancia de revisión | Revisor aceptado de esa campaña |
| Decisión final del aporte | Creador |
| Ver el archivo de un aporte | Quien aportó, el creador, o un revisor aceptado si el aporte está `pendiente` o si él hizo la primera revisión (`app/api/aportes/[id]/archivo/route.ts`) |
| Aportar | Campaña `activa`, sin baneo en `campana_baneados`, cuota disponible y sin ser el creador |
| Tomar y dictaminar | Supervisor que no sea el creador y la campaña esté `en_revision` y libre; o el SuperUsuario. Solo quien la tomó dictamina (`lib/supervision/decision.ts`) |

## 5. Registro, verificación e inicio de sesión

- **Registro:** `POST /api/usuarios` crea la cuenta con `email_verificado = false` y arranca la verificación.
- **Verificación** (`lib/verification.ts`): código de 6 dígitos enviado por Gmail (`nodemailer`), guardado como hash. Vence en 15 minutos y admite 3 intentos. La cookie `pending_verification_id` liga la pantalla `/verificar` con la cuenta.
- **Inicio de sesión:** `POST /api/auth/login` con bcrypt (`lib/password.ts` también reconoce hashes viejos y los migra). Tras 5 fallos bloquea 15 minutos (`locked_until`). Rechaza cuentas sin verificar.
- **Google:** `GET /api/auth/google` genera `state` en la cookie `google_oauth_state`. El callback vincula `google_id` o crea la cuenta ya verificada.
- **Recuperar contraseña:** no existe.

## 6. Sanciones y baneos

- **Baneo por campaña:** el creador lo aplica con `POST /api/campanas/[id]/baneos` (tabla `campana_baneados`), y bloquea aportar a esa campaña.
- **Sanciones del panel** (`aplicarSancion` / `restaurarAcceso`): `STRIKE`, `BANEO_DE_CAMPANA` y `SUSPENSION_TEMPORAL` (con días). El detalle debe tener al menos 20 caracteres. El estado de la cuenta (`ACTIVA`, `CON_STRIKES`, `SUSPENDIDA`, `BANEADA`) se calcula en `lib/usuarios/directorio.ts`.
- **Qué bloquea cada una** (`lib/sanciones.ts`, según los textos del formulario del panel):
  - `STRIKE` solo suma al contador; no bloquea nada.
  - `SUSPENSION_TEMPORAL` bloquea la cuenta durante `dias` desde `aplicada_en`.
  - `BANEO_DE_CAMPANA` (en la interfaz, "Baneo permanente") bloquea la cuenta hasta que se restaure.
- **Qué significa "bloquear":**
  - `getSessionUser()` devuelve `null`, así que ninguna ruta ni página lo deja pasar;
  - el login con correo responde 403 con la fecha de fin de la suspensión (solo si la contraseña es correcta, para no revelarlo a otros);
  - el login con Google redirige a `/entrar?error=bloqueada`;
  - al aplicar la sanción se borran sus filas de `sessions`.
- **Restaurar** (`restaurarAcceso`) desbloquea de inmediato. Una suspensión vencida deja de bloquear sola.

## 7. Bitácora (`audit_log`)

`registrarAuditoria()` en `lib/auditoria.ts`, llamado después de que la acción se completó. Si el registro falla, solo se reporta en consola: no revierte la acción.

- **Qué guarda:** actor (`usuario` + id, `superusuario` o `anonimo`), acción, objetivo (`usuario:5`, `campana:3`), detalle JSONB e IP (`lib/ip.ts`: último valor de `X-Forwarded-For`).
- **Acciones:** `rol.asignar`, `rol.revocar`, `sancion.aplicar`, `sancion.restaurar`, `supervision.tomar`, `supervision.dictaminar`, `campana.banear`, `revisor.invitar`, `revisor.aceptar`, `root.acceso` y `root.acceso_fallido`. Este último no guarda el identificador tecleado, por si alguien escribió ahí la contraseña.
- **Sin pantalla:** todavía no hay vista en el panel para consultarla; se lee con SQL.

## 8. Huecos conocidos

- **`revertirAccion` no hace nada todavía:** ya exige sesión raíz, pero su lógica sigue en `TODO`. Cuando se implemente, debe registrar `supervision.revertir` en la bitácora.
- **Buscador de revisores** (`GET /api/usuarios?campanaId=&q=`): solo el creador de esa campaña, con al menos 3 letras del nombre o un correo completo exacto. Devuelve 10 usuarios verificados como máximo, con el correo oculto (`an***@gmail.com`).
- **El límite de intentos de `/root` vive en memoria:** se reinicia con cada despliegue y no se comparte entre instancias. Hay dos límites: 5 por minuto por IP y 30 por minuto en total. La IP es el **último** valor de `X-Forwarded-For` (el que agrega el proxy), no el primero, que lo puede inventar el cliente.
