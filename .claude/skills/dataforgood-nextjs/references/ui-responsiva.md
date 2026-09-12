# Interfaz: sistema de diseño de la rama y diseño responsivo

## Contenido
1. Tokens y tipografía
2. Componentes existentes
3. Patrones visuales de la rama
4. Layouts
5. Móvil: lo que ya funciona y lo que falta
6. Captura de fotos, audio y video
7. Accesibilidad
8. Checklist por pantalla

## 1. Tokens y tipografía

Definidos en `app/globals.css` como variables en `:root`, expuestas a Tailwind v4 con `@theme`. **Usa siempre estas utilidades; no escribas hex sueltos.**

| Utilidad | Valor | Uso |
| --- | --- | --- |
| `bg-paper` | #fbfaf8 | Fondo general (tono cálido) |
| `bg-surface` | #ffffff | Tarjetas, inputs, barras |
| `bg-sunken` | #f4f2ef | Cajas informativas neutras, zonas de carga, cabecera de tablas |
| `text-ink` / `text-ink-2` / `text-ink-3` | #12131a / #5c606b / #9298a3 | Texto principal, secundario, terciario |
| `border-line` / `border-line-2` | #e9e6e1 / #d8d4cd | Bordes de tarjeta / de inputs y botones secundarios |
| `accent`, `accent-deep`, `accent-tint` | #2e5aac / #22447f / #eaf0fa | Selección activa, enlaces, foco, bloques destacados |
| `ok`, `ok-tint` | #0e7a55 / #e4f4ec | **Botón primario**, éxito, aceptado |
| `warn`, `warn-tint` | #96660f / #fbf0dc | Pendiente, avisos |
| `danger`, `danger-tint` | #ae362b / #fbeae7 | Rechazo, errores, acciones destructivas |
| `rounded-pill`, `rounded-lg` | 999px, 16px | Botones, chips y etiquetas; tarjetas |

**Tipografía** (`app/layout.tsx`):

- **Plus Jakarta Sans** (400 a 800) como `font-sans`, cuerpo a 14.5 px.
- **JetBrains Mono** (400 y 500) como `font-mono`, para números, contadores, fechas, tokens, límites de caracteres y etiquetas de sección.
- **Escala en uso:** `text-[11px]`, `[11.5px]`, `[12px]`, `[12.5px]`, `[13px]`, `text-sm`, `[15px]`; títulos `text-xl`, `text-2xl`, `text-[26px]` y `text-[46px]` en la landing, con `font-extrabold`. Mantén esta escala; no agregues tamaños nuevos.

## 2. Componentes existentes

Todos usan `export default`, nombre de archivo en PascalCase, variantes en un `Record` y `className` para extender.

| Componente | API | Notas |
| --- | --- | --- |
| `ui/Button` | `variant`: primary (verde) · secondary · danger · ghost; `size`: sm · md | Forma de píldora. Para navegar usa `ButtonLink` (`conectar-mocks.md`) |
| `ui/Card` | `highlighted` | `rounded-lg border bg-surface p-4 shadow-sm` |
| `ui/Input` | `Field` (label, hint, required), `Input`, `Textarea` | Asterisco rojo en obligatorios; la pista va en `text-ink-3` |
| `ui/Tag` | `tone`: default · ok · warn · danger · on | Estados y temáticas |
| `ui/ProgressBar` | `pct`, `tone`: accent · ok | Limita el valor entre 0 y 100 |
| `ui/MetricCard` | `label`, `value` | Métricas del panel |
| `cards/CampaignCard` | `campaign` | Tarjeta vertical del catálogo |
| `cards/ContributionCard` | `contribution` | Estado con `Tag` |
| `layout/PublicHeader`, `PublicFooter` | — | Landing |
| `layout/TopBar` | — | Búsqueda, notificaciones, avatar. Hoy lee el mock: recibirá el usuario por props |
| `layout/SidebarNav` | — (cliente, `usePathname`) | `NAV_ITEMS`: Explorar, Mis aportes, Mis campañas |

Antes de crear un componente, busca si ya existe uno equivalente. Si hace falta uno nuevo (Select, Dialog, EmptyState, ButtonLink), sigue las mismas convenciones.

## 3. Patrones visuales de la rama

- **Chips de filtro:** `rounded-pill border px-3.5 py-1.5 text-[13px] font-semibold`. Activo: `border-accent bg-accent text-white`. Inactivo: `border-line-2 bg-surface text-ink-2 hover:border-accent`. Si hay contador, va dentro en `font-mono`.
- **Cajas informativas:** `rounded-lg p-3.5` o `p-4` con `text-[12.5px]`: neutra `bg-sunken text-ink-2`, aviso `bg-warn-tint text-warn`, información `bg-accent-tint text-accent-deep`, error `bg-danger-tint text-danger`, éxito `border border-ok bg-ok-tint text-ok`.
- **Etiqueta de sección o de paso:** `font-mono text-[10.5px]` a `[12px] uppercase tracking-wide text-accent` o `text-ink-3` (por ejemplo "Paso 1 de 3 · Tus datos", "1 · Datos básicos").
- **Enlace de regreso:** `← Volver a …` con `text-[13px] text-ink-2 hover:text-ink`, arriba del título.
- **Cabecera de página:** título `text-xl` o `text-2xl font-extrabold` + subtítulo `text-[13px] text-ink-2`, con acciones a la derecha.
- **Listas de datos:** `<dl>` con filas `flex justify-between`, `dt` en `text-ink-2` y `dd` en `font-medium text-ink`.
- **Estado vacío:** `rounded-lg border border-dashed border-line-2 bg-surface p-8 text-center`.
- **Fechas:** `toLocaleDateString("es-MX", …)`. Centraliza el formateo en `lib/format.ts`, porque hoy está repetido en varias páginas.

## 4. Layouts

| Grupo | Layout |
| --- | --- |
| `app/page.tsx` | `PublicHeader` + contenido centrado + `PublicFooter` |
| `(auth)` | Logo y tarjeta centrados, `max-w-md`, fondo `bg-paper` |
| `(dashboard)` | `TopBar` arriba; `SidebarNav` a la izquierda (16rem, sticky en `lg`); contenido `max-w-7xl` con `px-4 sm:px-6 lg:px-10` |

Cuando existan roles, `(dashboard)/layout.tsx` obtiene el usuario y construye los elementos del menú en el servidor. Luego se los pasa a `SidebarNav` como prop: "Revisión" para revisores aceptados, "Supervisión" con `campanas.dictaminar`, "Sistema" con `sistema.panel`. El componente seguirá siendo cliente por `usePathname`.

## 5. Móvil: lo que ya funciona y lo que falta

**Ya resuelto en la rama:**

- **Barra lateral:** por debajo de 768 px pasa a navegación horizontal con scroll (`globals.css`, clases `dashboard-*`) y oculta el bloque motivacional.
- **Grids:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
- **TopBar:** oculta el nombre en pantallas pequeñas.

**Pendiente o por revisar:**

- **Inputs y `select` a 14 px:** iOS hace zoom al enfocar. Usa `text-base sm:text-sm` en `Input`, `Textarea` y en los `select` sueltos.
- **Tablas** (bandeja de aportes, agregar revisor): en 360 px las columnas se comprimen. Muestra tarjetas en móvil (`md:hidden`) y la tabla en `hidden md:table`, o envuelve la tabla en `overflow-x-auto`.
- **Cabeceras** `flex justify-between` con acciones o con `Input w-56`: agrega `flex-wrap` o apílalas en móvil.
- **Código de verificación:** 6 cajas `w-11` con `gap-2` miden 304 px; dentro de la tarjeta `p-8` y el contenedor `px-4`, a 360 px quedan 264 px. Reduce a `w-10 gap-1.5` en móvil o baja el padding.
- **Alturas:** `min-h-screen` y `calc(100vh - 61px)` no descuentan la barra del navegador móvil. Prefiere `min-h-dvh`.
- **Áreas táctiles:** los chips y botones `sm` miden unos 32 px de alto. En acciones frecuentes en móvil apunta a 44 px (`min-h-11`).
- **Botones de acción en fila** (`mis-campanas`): con 6 botones, `flex-wrap` funciona pero es denso. Considera un menú "Más acciones" en móvil.

## 6. Captura de fotos, audio y video

`/campanas/[id]/aportar` hoy tiene un área de "arrastrar o buscar" imagen. En el teléfono, agrega dos acciones, porque `capture` en algunos equipos oculta la galería:

```tsx
<label className="…botón secundario…">Tomar foto
  <input type="file" accept="image/jpeg,image/png" capture="environment" className="sr-only" onChange={onPick} />
</label>
<label className="…botón secundario…">Elegir de la galería
  <input type="file" accept="image/jpeg,image/png" className="sr-only" onChange={onPick} />
</label>
```

- **Validación en el cliente:** mantén la que ya existe (formato y 10 MB) para avisar pronto; el servidor vuelve a validar (`KIND_RULES`).
- **Vista previa:** `URL.createObjectURL(file)`, liberando la URL después.
- **Audio en vivo:** `MediaRecorder` (Chrome graba `audio/webm`, Safari `audio/mp4`). Requiere HTTPS o `localhost`; como respaldo, ofrece `<input type="file" accept="audio/*">`.
- **Subida:** usa `uploadMedia` (`lib/upload-media.ts`), que muestra progreso real. Si falla, conserva lo que la persona escribió.

## 7. Accesibilidad

- **Contraste:** `text-ink-3` (#9298a3) sobre blanco no llega a AA en texto pequeño. Úsalo solo para información secundaria, no para instrucciones ni errores.
- **Formularios:** `Field` muestra el texto de la etiqueta, pero no lo asocia al input (usa `<span>`, no `<label htmlFor>`). Al conectar formularios, conviértelo en `<label>` o agrega `id` y `aria-describedby` para la pista y el error.
- **Estado seleccionado:** los chips de filtro son `button` o `Link`. Agrega `aria-pressed` o `aria-current` en el activo.
- **Iconos:** los botones solo con icono llevan `aria-label` (la campana ya lo tiene) y los SVG decorativos `aria-hidden`.
- **Estructura:** un `<h1>` por página. Respeta `prefers-reduced-motion` en animaciones nuevas.

## 8. Checklist por pantalla

- [ ] Usa tokens y componentes existentes; no quedan valores de color sueltos.
- [ ] Se ve bien en 360, 768 y 1280 px, sin scroll horizontal.
- [ ] Inputs de 16 px o más en móvil; áreas táctiles razonables.
- [ ] Estados vacío, cargando (`loading.tsx`) y error.
- [ ] Sin `<Link>` anidado con `<Button>`; se puede usar solo con teclado.
