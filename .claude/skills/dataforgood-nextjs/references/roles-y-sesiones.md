# Cuentas, sesiones, roles y permisos

## Contenido
1. Modelo
2. Permisos globales
3. Acceso por campaña
4. Tres capas de protección
5. Registro, verificación y perfil
6. Inicio y cierre de sesión
7. Asignar roles e invitar revisores
8. Suspensiones y baneos
9. Seguridad adicional

Las reglas de negocio y los puntos abiertos están en `dominio.md`, secciones 1, 2 y 9.

## 1. Modelo

| Tabla | Contenido |
| --- | --- |
| `users` | Cuenta, perfil (alias, estado, ciudad, especialidad, intereses), `status` (`pendiente_verificacion`, `activo`, `suspendido`, `baneado`), `email_verified_at`, XP, nivel y racha |
| `user_roles` | Roles **globales**: `supervisor`, `superusuario`, `administrador_campana`; guarda quién lo otorgó y cuándo |
| `campaign_reviewers` | Revisor de aportes **por campaña**: `invitado` o `aceptado` |
| `campaign_bans` | Baneo **por campaña** |
| `email_verifications` | Hash del código de 6 dígitos, intentos restantes y vencimiento |
| `sessions` | Hash del token de sesión y vencimiento |
| `audit_log` | Acciones sensibles |

Toda cuenta es Usuario común de forma implícita. **Quien crea una campaña la administra**: eso se deduce de `campaigns.creator_id`, sin necesidad de un rol.

## 2. Permisos globales

`server/auth/permissions.ts`:

| Quién | Permisos |
| --- | --- |
| Cuenta **verificada** (base) | `campanas.ver`, `campanas.crear`, `aportes.crear`, `perfil.editar` |
| Supervisor | + `campanas.dictaminar`, `roles.asignar_supervisor` |
| SuperUsuario (hereda de Supervisor) | + `roles.asignar_administrador_campana`, `usuarios.sancionar`, `sistema.panel` |
| Administrador de campaña | Sin permisos definidos (punto abierto) |
| Cuenta **sin verificar** | Ninguno: tiene sesión para completar `/verificar` y `/bienvenida`, pero no participa |

- **El código pregunta por acciones** (`can(user, 'campanas.dictaminar')`), nunca por nombres de rol.
- **Los permisos se recalculan en cada petición.** Así, "los roles aparecen dentro de la misma sesión", como pide la rama.
- **`permissions.test.ts` protege tres reglas:** quién asigna Supervisor, que solo el SuperUsuario asigna administrador de campaña y que una cuenta sin verificar no tiene permisos. Agrega un caso por cada permiso nuevo.

## 3. Acceso por campaña

`server/modules/campanas/access.ts`:

- **`getCampaignAccess(actor, campaignId)`** devuelve `{ campaign, isOwner, isReviewer, isBanned }`. Lanza 404 si la campaña no existe. Solo cuenta como revisor quien tiene la invitación `aceptado`.
- **`assertCampaignOwner(actor, campaignId)`** es la guardia de todo `/mis-campanas/[id]/*` y de sus endpoints.

| Acción | Condición |
| --- | --- |
| Ver la bandeja, el panel o el enlace; hacer especial; editar; pausar; agregar revisor; banear | `isOwner` |
| Validar en primera instancia (`pendiente` → `espera_final`) | `isReviewer` |
| Decisión final (`espera_final` o `pendiente` sin revisor → `aceptado` o `rechazado`) | `isOwner` |
| Ver archivos de aportes | Autor, `isOwner` o `isReviewer` (ya implementado en `uploads/service.ts`) |
| Aportar | `aportes.crear`, campaña `activa`, tipo solicitado, no `isBanned`, cuota disponible |

Si el equipo decide que el SuperUsuario o el Supervisor también pueden intervenir en campañas ajenas, agrégalo **aquí**, en un solo lugar.

## 4. Tres capas de protección

| Capa | Dónde | Protege |
| --- | --- | --- |
| Interfaz | Menú y botones según permisos y acceso | Nada; es solo experiencia |
| Entrada | `requirePermission` o `requireAuth` en Express; `requirePagePermission` en cada `page.tsx` | Corta pronto con 401/403 o redirige a `/entrar` |
| Dato | `assertCan`, `assertCampaignOwner` y reglas del service | La protección real |

`proxy.ts` puede redirigir rápido si no hay cookie, pero **no es control de acceso**.

## 5. Registro, verificación y perfil

1. **`POST /api/v1/auth/registro`** `{ alias, email, password, aceptaTerminos }`:
   - valida con Zod las reglas de contraseña (8 o más caracteres, mayúscula, número y carácter especial) y `aceptaTerminos === true`;
   - crea el usuario en `pendiente_verificacion`, con `argon2` para la contraseña;
   - si el correo ya existe (error `23505`), responde 409 `EMAIL_EN_USO`, que la pantalla muestra como "Ese correo ya está registrado";
   - crea el código (hash, `attempts_left = 3`, vencimiento) y lo envía por correo;
   - crea la sesión y fija la cookie.
2. **`POST /api/v1/auth/verificar`** `{ codigo }`:
   - si el código venció, responde 410 `CODIGO_VENCIDO`;
   - si es incorrecto, descuenta un intento y responde 400 con los intentos restantes; con 0 intentos, obliga a reenviar;
   - si es correcto, marca `status = activo` y `email_verified_at`, y borra el código.
3. **`POST /api/v1/auth/reenviar-codigo`**: invalida el código anterior y aplica un límite de envíos (por ejemplo, uno por minuto).
4. **`PATCH /api/v1/perfil`** `{ state, city, specialty, interests }` desde `/bienvenida`. Si se omite, se asignan intereses por defecto (regla de `dominio.md`).

La pantalla muestra el tiempo restante y los intentos **desde la respuesta del servidor**, no con valores fijos.

## 6. Inicio y cierre de sesión

```ts
// server/modules/auth/service.ts (patrón)
export async function login(input: LoginInput) {
  const [user] = await db.select().from(users).where(eq(users.email, input.email.toLowerCase().trim())).limit(1);
  const ok = user?.passwordHash && (await verify(user.passwordHash, input.password));
  if (!ok) throw new AppError(401, 'CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.'); // no revelar si el correo existe
  if (user.status === 'suspendido' || user.status === 'baneado') {
    throw new AppError(403, 'CUENTA_RESTRINGIDA', 'Tu cuenta está restringida.');
  }
  return { ...(await createSession(user.id)), needsVerification: user.status === 'pendiente_verificacion' };
}
```

- **El router fija la cookie** con `sessionCookieOptions` y responde `{ needsVerification }`. Si es `true`, la pantalla redirige a `/verificar`; si no, a `/campanas`.
- **Logout** borra la sesión y la cookie.
- **"Continuar con Google" y la recuperación de contraseña** están pendientes de definición. Si se implementan, la cuenta de Google entra con `password_hash = null` y `email_verified_at` ya marcado; el token de recuperación es de un solo uso, hasheado y de corta duración, e invalida las sesiones al usarse.

## 7. Asignar roles e invitar revisores

**Supervisor:** `roles.asignar_supervisor` (SuperUsuario o Supervisor activo).

1. Nadie se asigna roles a sí mismo.
2. En una transacción: insertar en `user_roles` y registrar en `audit_log`.
3. Al **retirar** un rol, invalida las sesiones de la persona afectada.

**Administrador de campaña:** `roles.asignar_administrador_campana` (solo SuperUsuario), mismo procedimiento.

**Revisor de aportes (por campaña):**

1. `assertCampaignOwner`.
2. Insertar en `campaign_reviewers` con `status = invitado` y notificar.
3. La persona acepta con `POST /api/v1/revisiones/invitaciones/:campaignId/aceptar`, que cambia a `aceptado` y fija `accepted_at`.
4. Mientras la campaña tenga al menos un revisor aceptado, `hasReviewerAssigned = true` y la bandeja usa dos instancias.

## 8. Suspensiones y baneos

| Tipo | Quién | Efecto |
| --- | --- | --- |
| Global (`users.status`) | `usuarios.sancionar` | Borra todas sus sesiones; `validateSession` rechaza suspendidas y baneadas (probado) |
| Por campaña (`campaign_bans`) | Quien administra la campaña | No puede aportar a esa campaña (`BANEADO_EN_CAMPANA`, probado); el resto de la plataforma sigue igual |

Ambos se registran en `audit_log` con motivo. Nadie sanciona globalmente a alguien de rango igual o superior.

## 9. Seguridad adicional

- **Límite de intentos** en login, registro, verificación, reenvío de código y aportes anónimos (por IP y por correo o token). Requiere `trust proxy` bien configurado.
- **Nunca registres en logs** contraseñas, códigos, tokens ni el header `cookie`.
