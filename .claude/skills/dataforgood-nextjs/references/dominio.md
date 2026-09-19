# Reglas de negocio (tomadas de la rama Prueba1)

Todo lo de este archivo sale de las pantallas, textos y datos simulados de la rama. Cada regla indica su fuente. Las reglas se aplican **en los services**; la interfaz solo las comunica.

## Contenido
1. Cuentas y registro
2. Roles
3. Campañas
4. Aportes y cuota
5. Revisión en dos instancias
6. Enlace público y aportes anónimos
7. Experiencia (XP) y campañas especiales
8. Catálogos
9. Contradicciones y puntos abiertos

## 1. Cuentas y registro

Fuentes: `(auth)/registro`, `verificar`, `bienvenida` y `entrar`.

- **Registro:** alias, correo único y contraseña confirmada, más aceptar los términos de uso y el aviso de privacidad. Si el correo ya existe, se muestra "Ese correo ya está registrado".
- **Contraseña:** mínimo 8 caracteres, al menos una mayúscula, un número y un carácter especial.
- **Verificación por correo:** código de 6 dígitos, que vence (la pantalla muestra una cuenta regresiva de unos 15 minutos) y admite **3 intentos**, con opción de reenviarlo. **Hasta verificar, la cuenta queda inactiva y no puede participar en campañas.**
- **Perfil inicial (se puede omitir):** estado, ciudad, especialidad opcional (sirve para repartir campañas a supervisores de esa área) y temas de interés. Si se omite, se asignan etiquetas por defecto según las campañas más populares de la zona.
- **Inicio de sesión:** correo y contraseña; hay botón "Continuar con Google" y enlace "¿Olvidaste tu contraseña?", ambos sin flujo definido todavía.
- **Datos del usuario** (`User`): alias, email, avatar, estado, ciudad, especialidad, `xpTotal`, `level` y `streakDays`.

## 2. Roles

Fuentes: texto informativo de `/entrar` y la pantalla `agregar-revisor`.

| Rol | Alcance | Cómo se obtiene |
| --- | --- | --- |
| Usuario común | Global, implícito | Toda cuenta al registrarse |
| Supervisor | Global | Lo asigna el **SuperUsuario o cualquier Supervisor activo** |
| Administrador de campaña | Global (según `/entrar`) | Lo asigna el SuperUsuario |
| Revisor de aportes | **Por campaña** (según `agregar-revisor`) | Invitación de quien administra la campaña; queda pendiente hasta que la persona acepta |
| SuperUsuario | Global | — |

- **Los roles nuevos aparecen dentro de la misma sesión**, sin volver a entrar. Por eso los permisos se recalculan en cada petición.
- **Quien crea una campaña la administra** desde `/mis-campanas/[id]/*`: bandeja, panel, compartir, especial, agregar revisor, editar y pausar.
- **El Supervisor dictamina las campañas "En revisión".**

## 3. Campañas

Fuentes: `mis-campanas`, `NuevaCampanaForm`, `campanas/[id]` y `panel`.

- **Estados:** `borrador`, `en_revision`, `activa`, `pausada`, `finalizada` y `rechazada`.
- **Transiciones permitidas:** Borrador → En revisión → Activa ⇄ Pausada → Finalizada. Desde En revisión también puede pasar a Rechazada.
  - **Una campaña finalizada queda en solo lectura**, salvo el botón "Reactivar campaña" (vuelve a `activa`), disponible solo si la persona tiene menos de 5 campañas activas.
  - **Edición según estado (`app/api/campanas/[id]/route.ts` PATCH, `NuevaCampanaForm`):**
    - **Borrador, en revisión o rechazada:** se edita por completo (nombre, descripción, temática, tipos de dato, meta, cuota, vigencia, ubicación) y al reenviarla vuelve a quedar `en_revision`.
    - **Activa o pausada:** solo se puede cambiar la meta de aportes y la fecha de finalización; el resto de los campos se rechaza (400) y el estado no cambia. También desde aquí el creador puede finalizarla (`PATCH { status: "finalizada" }` → error si trae más campos).
    - **Finalizada:** de solo lectura para el resto de los campos; solo acepta un PATCH con `status: "activa"` y nada más, y lo rechaza (400) si ya tiene 5 campañas activas. Cualquier otro campo en un PATCH sobre una finalizada se rechaza (403).
  - **Finalizar manualmente:** en `/mis-campanas` (activa o pausada) hay un botón "Finalizar campaña" que solo ve y puede usar el creador (la lista ya viene filtrada por `mine=true`); el servidor igual valida `creator_id` antes de aplicar el cambio. Es la única forma de llegar a `finalizada` hoy: no hay disparador automático por fecha de cierre.
- **Límite:** máximo **5 campañas activas a la vez** por persona. Pasado ese número, solo se permite guardar como borrador.
- **Formulario en tres bloques:**
  - **Datos básicos:** nombre (máx. 80), temática (una) y descripción (máx. 500).
  - **Qué se recolecta:** tipos de dato (uno o más entre texto, foto, video, audio y documento); meta total de aportes; cuota por persona; modo de descripción `checklist` (con opciones editables) o `texto_libre`.
  - **Vigencia:** fecha de inicio y de fin, más ubicación textual (hoy fija en "Tepic, Nayarit").
- **Otros datos:** organizador y XP por aporte aprobado.
- **Panel:** aportes aprobados, participantes, pendientes, porcentaje de la meta, recolección diaria, desglose por tipo de dato y días restantes. Mientras está activa, la pantalla dice "actualiza cada 3 s".
- **Acciones por estado:**
  - **Activa:** revisar aportes, panel, editar, hacer especial, compartir y pausar.
  - **Finalizada:** ver datos, descargar y compartir aportes.
- **Explorar:** filtro por temática en `searchParams` (`/campanas?tag=...`); se puede guardar como favorita.

## 4. Aportes y cuota

Fuentes: `campanas/[id]/aportar`, `mis-aportes` y `mis-aportes/[campanaId]`.

- **Un aporte tiene:** un archivo (según los tipos de la campaña), una descripción (obligatoria, máx. 1000) y respuestas del checklist de la campaña.
- **Fotos:** `.jpg`, `.jpeg` o `.png`, **máximo 10 MB**, **sin compresión automática**; si pesa más, se rechaza y la persona elige otra. Los límites de video, audio y documento no están definidos (punto abierto).
- **Tras enviar,** el aporte queda "Pendiente de revisión".
- **Cuota por persona:** al alcanzarla ya no se puede enviar más a esa campaña, aunque siga abierta para otras personas.
  - **Un aporte rechazado no libera cupo:** cuenta como enviado.
  - **Eliminar un aporte pendiente mientras la campaña sigue activa sí devuelve el cupo.** Una campaña finalizada no permite añadir ni eliminar.
- **Completar la cuota otorga un bono de 300 XP.**
- **Filtros de "Mis aportes":** Todas, Puedo aportar (campaña activa y cuota disponible), Cuota completa, Finalizadas y Favoritos.

## 5. Revisión en dos instancias

Fuentes: `mis-campanas/[id]/aportes` y `[aporteId]`.

- **Estados del aporte:** `pendiente` (sin revisar), `espera_final`, `aceptado` y `rechazado`.
- **Sin revisor asignado:** todo llega sin filtro y quien administra la campaña decide en **una sola instancia** (`pendiente` → `aceptado` o `rechazado`).
- **Con revisor asignado:** el revisor valida en primera instancia (`pendiente` → `espera_final`, guardando quién lo validó), y quien administra da la aprobación final (`espera_final` → `aceptado` o `rechazado`).
- **Rechazar exige un motivo:** uno de la lista ("Contenido borroso o ilegible", "No corresponde a la campaña", "Datos incompletos", "Contenido duplicado") o uno redactado. **El participante recibe el motivo por notificación.**
- **Desde el detalle de un aporte se puede "Banear de la campaña"** al participante. El baneo es por campaña, no global.

## 6. Enlace público y aportes anónimos

Fuente: `mis-campanas/[id]/compartir`.

- **Enlace:** `dataforgood.mx/c/{token}`, con código QR descargable en PNG y SVG (512 × 512 px).
- **Aportes anónimos:** quien abre el enlace puede aportar **sin registrarse** mientras el token siga vigente. Esos aportes aparecen como "Anónimo" (`userId = null`).
- **Vencimiento y regeneración:** el token vence (la pantalla muestra unas 21 horas restantes). Al regenerarlo se crea una dirección nueva y la anterior queda inutilizable **para siempre**; los aportes ya recibidos se conservan.
- **Estadísticas del enlace vencido:** aportes recibidos y visitas.
- **Diseño técnico:** tabla `campaign_share_links` en la plantilla, con subidas anónimas limitadas por IP y token (`references/almacenamiento.md`).

## 7. Experiencia (XP) y campañas especiales

Fuentes: `especial`, `campanas/[id]` y `mis-aportes`.

- **XP por aporte:** se otorga solo por aportes **aprobados**. La campaña define XP por aporte, y la pantalla de especial muestra XP base por tipo (ver punto abierto 4).
- **Bono:** completar la cuota otorga 300 XP. Las campañas especiales pueden dar una insignia exclusiva (ejemplo: "Guardián verde") al completarla.
- **Campaña especial:** un periodo con **multiplicador de XP de ×1 a ×3** (tope del sistema).
- **Tope diario de XP por usuario:** existe y sigue vigente durante el periodo especial; su valor no está definido.
- **Perfil:** nivel y racha de días.

## 8. Catálogos

- **Temáticas en el formulario de campaña:** Medio ambiente, Salud urbana, Educación, Infraestructura, Protección animal y Movilidad.
- **Intereses del perfil:** los mismos más "Cultura".
- **Motivos de rechazo:** ver sección 5.

Guárdalos en un solo lugar (tabla o constante compartida). Hoy están repetidos en varias pantallas.

## 9. Contradicciones y puntos abiertos

**No los resuelvas por tu cuenta.** Pregunta, o deja un TODO explícito y menciónalo.

1. **Quién asigna al Revisor de aportes.** `/entrar` dice que "revisor y administrador de campaña los asigna el SuperUsuario". `agregar-revisor` dice que quien administra la campaña lo invita y que el rol aplica solo dentro de esa campaña. *La plantilla sigue la segunda versión (por campaña).*
2. **Administrador de campaña.** Se menciona como rol que asigna el SuperUsuario, pero en la rama cualquier usuario crea y administra sus campañas. ¿Qué agrega este rol?
3. **Colaborador de Supervisor.** Aparecía en requisitos anteriores; no existe en la rama. ¿Sigue vigente?
4. **Cálculo de XP.** `xpPerContribution` por campaña (50, 40, 35, 30) frente a XP base por tipo en la pantalla de especial (texto 10, foto o documento 25, audio o video 50). ¿Cuál manda, o se combinan?
5. **Catálogo de temáticas.** El filtro de `/campanas` usa "Salud y bienestar" y omite varias categorías; el formulario usa "Salud urbana".
6. **Límites de archivos** para video, audio y documento (la plantilla usa valores provisionales) y formatos de documento.
7. **Cuota de aportes anónimos.** Sin cuenta no hay persona a quien contar: ¿límite por dispositivo o IP, o solo la meta total?
8. **Rechazo en primera instancia.** ¿El revisor puede rechazar de forma definitiva o solo validar? No hay pantalla del revisor.
9. **Valor del tope diario de XP.**
10. **Inicio con Google y recuperación de contraseña:** los botones existen, los flujos no.
11. **La meta de la campaña** ¿cuenta aportes recibidos o solo aprobados? El panel usa ambos.
12. **Reparto de campañas a supervisores** por especialidad: ¿automático o manual?
13. **"Actualiza cada 3 s" en el panel:** polling o websockets.
