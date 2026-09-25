# Cuentas, sesiones, roles y permisos

## Contenido
1. Dos tipos de sesión
2. Capas de protección
3. Roles
4. Acceso por campaña
5. Registro, verificación e inicio de sesión
6. Sanciones y baneos
7. Huecos conocidos

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

1. **`proxy.ts`:** solo comprueba que exista la cookie y redirige. No es autorización.
2. **Layouts:** `(panel)/layout.tsx` (sesión raíz) y `(dashboard)/supervision/layout.tsx` (rol `supervisor`).
3. **Cada página, route handler y server action vuelve a verificar.** En el panel se usa `exigirSesionRoot()` (`lib/supervision/root.ts`) o `exigirSuperUsuario()` (`lib/usuarios/acciones-usuarios.ts`). En la API, `getSessionUser()` más la comprobación de permiso sobre el recurso.

**No hay verificación de `Origin`** en las mutaciones. Las de usuario dependen de `SameSite=Lax` y las raíz de `SameSite=Strict`; las server actions traen su propia protección de Next.

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

## 7. Huecos conocidos

- **Las sanciones de la tabla `sanciones` no se aplican todavía:** ni el login ni `getSessionUser()` ni `POST /api/aportes` las consultan, así que una suspensión no impide entrar ni aportar. Preguntar antes de implementarlo (qué bloquea cada tipo).
- **No existe `audit_log`:** los cambios de rol, las sanciones y los accesos raíz no quedan registrados (hay `TODO` en `app/api/auth/root/route.ts`).
- **`GET /api/usuarios` no exige sesión** y devuelve hasta 50 usuarios con su correo.
- **El límite de intentos de `/root` vive en memoria:** se reinicia con cada despliegue y no se comparte entre instancias.
