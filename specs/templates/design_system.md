# Design System

> Generado por `design-extractor` a partir del estado real de `design-system/` (2026-10-14).
> Fuente de verdad: `design-system/tokens/*.json`. `tokens/tokens.css` es un archivo generado
> (`node design-system/scripts/build-tokens.mjs --check` → "tokens.css al día.").
> Variables CSS: `--ds-<prefijo>-<ruta>`. Los prefijos son `color` (colors.json), `font` (typography.json, sin el nivel `scale`) y `shadow` (shadows.json); el resto de archivos no lleva prefijo. Ejemplos: `colors.action.primary` → `--ds-color-action-primary`, `sizes.control.hit-area` → `--ds-control-hit-area`, `sizes.icon.size.md` → `--ds-icon-size-md`.
> **Modos:** los tokens con forma `{ light, dark }` generan su valor claro en `:root` y el oscuro en `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` y en `:root[data-theme="dark"]`. La app puede forzar un modo con `data-theme` en `<html>`.

## Sintaxis detectada
**Svelte 5** (runes: `$props`, `$state`, `$derived`, `$effect`, `$bindable`, `$props.id()`, snippets, `<svelte:element>`) con `<script lang="ts">`. Hay 14 componentes `.svelte` en `design-system/components/*/`, dos módulos JS de apoyo (`components/icon/category-icons.js` y `components/shared/popup.js`) y dos hojas CSS globales compartidas (`components/shared/control.css` y `components/shared/popup.css`). El punto de entrada es `components/index.js`.
- Dependencias declaradas como `peerDependencies` en `design-system/package.json`: `svelte ^5.20` (`$props.id()` la requiere) y `@lucide/svelte ^1.55` (iconos).
- Iconos: [Lucide](https://lucide.dev) vía `@lucide/svelte`, importados icono a icono (`@lucide/svelte/icons/<nombre>`).
- Gestor de paquetes: npm (`design-system/package-lock.json`; ya no hay `pnpm-lock.yaml`).
- Página de demo con Vite en `design-system/demo/` (`npm run demo`; `npm run demo:build` genera `design-system/dist-demo/`, ignorado en git).

## Paleta de colores
Origen: `tokens/colors.json`. Formato: claro / oscuro. Paleta "índigo" sobre neutros fríos (slate).

| Token | Variable CSS | Claro | Oscuro | Uso recomendado (según el código y los pares de contraste) |
|---|---|---|---|---|
| `background` | `--ds-color-background` | `#F8FAFC` | `#0F172A` | Fondo de página |
| `surface.sunken` | `--ds-color-surface-sunken` | `#E9EEF5` | `#162033` | Ningún componente: `Column` usa ahora `status.*.surface` (queda como superficie hundida genérica) |
| `surface.base` | `--ds-color-surface-base` | `#F1F5F9` | `#1E293B` | Paneles. Fondo de badge neutral, de controles deshabilitados y de botones deshabilitados |
| `surface.raised` | `--ds-color-surface-raised` | `#FFFFFF` | `#243147` | Tarjeta, diálogo, alert, relleno de controles, button secondary, chip, contador de columna, lista desplegable de Select y MenuButton |
| `surface.hover` | `--ds-color-surface-hover` | `#E2E8F0` | `#334155` | Hover de button secondary/ghost y chip; opción activa (ratón, flechas o foco) de la lista de Select y MenuButton |
| `surface.active` | `--ds-color-surface-active` | `#CBD5E1` | `#475569` | Pulsado de button secondary/ghost y chip |
| `text.primary` | `--ds-color-text-primary` | `#0F172A` | `#F8FAFC` | Texto base, etiquetas de campo, texto de controles |
| `text.secondary` | `--ds-color-text-secondary` | `#475569` | `#CBD5E1` | Descripción y pie de tarjeta, ayuda de campo, placeholder (también el del Select), borde de control en hover, icono ChevronDown del Select, badge neutral, DropPlaceholder en reposo |
| `text.disabled` | `--ds-color-text-disabled` | `#94A3B8` | `#64748B` | Texto de controles, botones, chips y etiquetas deshabilitados |
| `border.default` | `--ds-color-border-default` | `#E2E8F0` | `#334155` | Bordes decorativos (tarjeta, diálogo, alert, lista desplegable) y borde en disabled |
| `border.strong` | `--ds-color-border-strong` | `#64748B` | `#94A3B8` | Borde de controles, chip y button secondary; borde punteado de DropPlaceholder en reposo (≥3:1) |
| `action.primary` | `--ds-color-action-primary` | `#4F46E5` | `#8B93FA` | Relleno de button primary, texto y borde de button outline, borde doble de chip seleccionado, borde de Column `dropTarget` y de DropPlaceholder activo, marca ✓ de la opción elegida en Select y MenuButton |
| `action.primary-hover` | `--ds-color-action-primary-hover` | `#4338CA` | `#A5B4FC` | Hover de button primary |
| `action.primary-active` | `--ds-color-action-primary-active` | `#3730A3` | `#C7D2FE` | Pulsado de button primary |
| `action.on-primary` | `--ds-color-action-on-primary` | `#FFFFFF` | `#0F172A` | Texto sobre `action.primary*` |
| `action.tint` | `--ds-color-action-tint` | `#EEF2FF` | `#1E1B4B` | Fondo de outline en hover, de chip seleccionado, de DropPlaceholder activo y de la opción elegida en Select y MenuButton |
| `action.tint-active` | `--ds-color-action-tint-active` | `#E0E7FF` | `#312E81` | Pulsado de outline y de chip seleccionado; opción elegida que además está activa en Select y MenuButton |
| `action.on-tint` | `--ds-color-action-on-tint` | `#3730A3` | `#C7D2FE` | Texto e icono sobre `action.tint*` (incluido el texto de la opción elegida en las listas) |
| `feedback.danger` | `--ds-color-feedback-danger` | `#B91C1C` | `#F87171` | Relleno de button danger, error de campo, asterisco de obligatorio, borde de control con error, badge y alert danger (título, acento e icono) |
| `feedback.danger-hover` | `--ds-color-feedback-danger-hover` | `#991B1B` | `#FCA5A5` | Hover y pulsado de button danger |
| `feedback.on-danger` | `--ds-color-feedback-on-danger` | `#FFFFFF` | `#0F172A` | Texto sobre `feedback.danger*` |
| `feedback.warning` | `--ds-color-feedback-warning` | `#A16207` | `#FACC15` | Badge y alert warning |
| `feedback.success` | `--ds-color-feedback-success` | `#15803D` | `#4ADE80` | Badge y alert success |
| `feedback.info` | `--ds-color-feedback-info` | `#1D4ED8` | `#60A5FA` | Badge y alert info |
| `tag.feature.bg` / `.fg` | `--ds-color-tag-feature-bg` / `-fg` | `#DBEAFE` / `#1E40AF` | `#1E3A8A` / `#BFDBFE` | Badge `feature` (en la app kanban: Novedad); el `fg` colorea el icono del chip |
| `tag.improvement.bg` / `.fg` | `--ds-color-tag-improvement-bg` / `-fg` | `#DCFCE7` / `#166534` | `#14532D` / `#BBF7D0` | Badge `improvement` (Mejora); icono del chip |
| `tag.bugfix.bg` / `.fg` | `--ds-color-tag-bugfix-bg` / `-fg` | `#FEE2E2` / `#991B1B` | `#7F1D1D` / `#FECACA` | Badge `bugfix` (Arreglo); icono del chip |
| `tag.technical.bg` / `.fg` | `--ds-color-tag-technical-bg` / `-fg` | `#EDE9FE` / `#5B21B6` | `#4C1D95` / `#DDD6FE` | Badge `technical` (Técnico); icono del chip |
| `status.todo.accent` / `.tint` / `.on-tint` / `.surface` | `--ds-color-status-todo-*` | `#64748B` / `#F1F5F9` / `#334155` / `#F3F6F9` | `#94A3B8` / `#1E293B` / `#E2E8F0` / `#162033` | Column `todo` (Sin empezar): franja e icono / fondo de cabecera / título y contador / fondo del cuerpo de la columna |
| `status.doing.*` | `--ds-color-status-doing-*` | `#2563EB` / `#DBEAFE` / `#1E40AF` / `#EFF6FF` | `#60A5FA` / `#172554` / `#BFDBFE` / `#131E3F` | Column `doing` (En curso) |
| `status.paused.*` | `--ds-color-status-paused-*` | `#EA580C` / `#FFEDD5` / `#9A3412` / `#FFF7ED` | `#FB923C` / `#431407` / `#FED7AA` / `#291718` | Column `paused` (En pausa) |
| `status.done.*` | `--ds-color-status-done-*` | `#15803D` / `#DCFCE7` / `#166534` / `#F0FDF4` | `#4ADE80` / `#052E16` / `#BBF7D0` / `#0A2220` | Column `done` (Finalizado) |
| `priority.high` | `--ds-color-priority-high` | `#DC2626` | `#F87171` | Franja superior de Card `priority="high"` |
| `priority.medium` | `--ds-color-priority-medium` | `#EA580C` | `#FB923C` | Franja de Card `priority="medium"` |
| `priority.low` | `--ds-color-priority-low` | `#4D7C0F` | `#A3E635` | Franja de Card `priority="low"` |
| `appbar.bg` | `--ds-color-appbar-bg` | `#FFFFFF` | `#1E293B` | Fondo de la barra superior (solo lo usa la demo; no hay componente) |
| `appbar.fg` | `--ds-color-appbar-fg` | `#0F172A` | `#F8FAFC` | Texto de la barra superior |
| `appbar.accent` | `--ds-color-appbar-accent` | `#4F46E5` | `#8B93FA` | Franja inferior de la barra superior |
| `focus` | `--ds-color-focus` | `#4F46E5` | `#A5B4FC` | Anillo de foco (y borde del control enfocado o del Select abierto) |
| `overlay` | `--ds-color-overlay` | `rgba(15, 23, 42, 0.50)` | `rgba(0, 0, 0, 0.65)` | Fondo (`::backdrop`) del diálogo |

## Tipografía
Origen: `tokens/typography.json`.

**Familias**

| Token | Variable CSS | Valor | Uso en el código |
|---|---|---|---|
| `family.sans` | `--ds-font-family-sans` | `'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', 'Inter Variable', Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` | Todos los componentes |
| `family.mono` | `--ds-font-family-mono` | `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` | Ningún componente (disponible para versiones o IDs) |

Las fuentes no se distribuyen en `design-system/`: las instala la app. La demo usa `@fontsource-variable/plus-jakarta-sans` (pesos 200–800) y `@fontsource/jetbrains-mono`. Inter queda en la pila solo como respaldo.

**Escala** (`scale.*`; variables `--ds-font-<token>-size|weight|line-height|letter-spacing`)

| Token | Tamaño | Peso | Line-height | Letter-spacing | Uso en el código |
|---|---|---|---|---|---|
| `display` | 31px | 800 | 1.2 | -0.3px | Título de la demo |
| `heading` | 25px | 700 | 1.3 | -0.2px | Encabezados de sección de la demo |
| `subheading` | 20px | 600 | 1.4 | 0 | Título del diálogo y de la barra de la demo. Su peso se usa también en el título de tarjeta, de alert y de columna |
| `body` | 16px | 400 | 1.6 | 0 | Texto de controles, opciones de la lista desplegable, cuerpo del diálogo, button `lg`, tamaño del título de tarjeta |
| `label` | 14px | 500 | 1.4 | 0.1px | Botones, chips, etiquetas de campo, texto de alert, descripción de tarjeta, título de columna, texto de DropPlaceholder. Su peso se usa también en badge, contador de columna, error de campo y opción elegida de la lista desplegable |
| `caption` | 13px | 400 | 1.4 | 0.2px | Ayuda y error de campo, badge, pie de tarjeta, contador de columna |

## Espaciado, radios y otras categorías

### Espaciado (`tokens/spacing.json` → `spacing.*`)
| Token | Valor | Variable CSS |
|---|---|---|
| `spacing.1` | 4px | `--ds-spacing-1` |
| `spacing.2` | 8px | `--ds-spacing-2` |
| `spacing.3` | 12px | `--ds-spacing-3` |
| `spacing.4` | 16px | `--ds-spacing-4` |
| `spacing.5` | 24px | `--ds-spacing-5` |
| `spacing.6` | 32px | `--ds-spacing-6` |
| `spacing.7` | 48px | `--ds-spacing-7` |
| `spacing.8` | 64px | `--ds-spacing-8` |

### Radios (`tokens/spacing.json` → `radii.*`)
| Token | Valor | Variable CSS | Uso en el código |
|---|---|---|---|
| `radii.small` | 8px | `--ds-radii-small` | Botón del título de la tarjeta (anillo de foco), opciones de la lista desplegable |
| `radii.medium` | 12px | `--ds-radii-medium` | Botón, controles de formulario, alert, lista desplegable |
| `radii.large` | 20px | `--ds-radii-large` | Tarjeta, diálogo, columna, DropPlaceholder |
| `radii.full` | 999px | `--ds-radii-full` | Badge, chip, contador de columna, spinner |

### Tamaños (`tokens/sizes.json`)
| Token | Valor | Variable CSS | Uso en el código |
|---|---|---|---|
| `border.width.default` | 1px | `--ds-border-width-default` | Bordes de botón, control, chip, badge, tarjeta, diálogo, alert y lista desplegable; segundo trazo interior (`box-shadow: inset`) del chip seleccionado |
| `border.width.accent` | 4px | `--ds-border-width-accent` | Borde izquierdo de color del alert, franja de prioridad de la tarjeta, franja superior de la columna |
| `border.width.dashed` | 2px | `--ds-border-width-dashed` | Borde punteado de DropPlaceholder; borde (transparente / `action.primary` en `dropTarget`) de Column (ver Inconsistencias) |
| `focus-ring.width` | 2px | `--ds-focus-ring-width` | Anillo de foco (en las opciones de MenuButton, hacia dentro). También el grosor del spinner (ver Inconsistencias) |
| `focus-ring.offset` | 2px | `--ds-focus-ring-offset` | Separación del anillo de foco |
| `spinner.size` | 18px | `--ds-spinner-size` | Spinner del botón en `loading` |
| `control.min-height.sm` | 36px | `--ds-control-min-height-sm` | Button `sm` (y su ancho mínimo si es solo icono), chip |
| `control.min-height.md` | 44px | `--ds-control-min-height-md` | Button `md`, input, textarea, select (botón combobox) |
| `control.min-height.lg` | 52px | `--ds-control-min-height-lg` | Button `lg` (y su ancho mínimo si es solo icono) |
| `control.hit-area` | 44px | `--ds-control-hit-area` | Ancho mínimo del botón; zona táctil ampliada (`::after`) de button `sm` y chip; alto mínimo de la cabecera de Column y de cada opción de la lista desplegable |
| `control.press-scale` | 0.97 | `--ds-control-press-scale` | Escala al pulsar botón y chip |
| `control.chevron-size` | 8px | `--ds-control-chevron-size` | Ningún componente: la flecha CSS del Select se sustituyó por el icono ChevronDown (ver Inconsistencias) |
| `card.lift` | 2px | `--ds-card-lift` | Elevación de la tarjeta en hover (`translateY` negativo) |
| `card.drag-rotate` | 1.5deg | `--ds-card-drag-rotate` | Giro de la tarjeta mientras se arrastra |
| `card.description-lines` | 3 | `--ds-card-description-lines` | Líneas visibles de la descripción (`line-clamp`) |
| `dialog.max-width.sm` | 400px | `--ds-dialog-max-width-sm` | Diálogo `sm` |
| `dialog.max-width.md` | 560px | `--ds-dialog-max-width-md` | Diálogo `md` |
| `dialog.enter-scale` | 0.96 | `--ds-dialog-enter-scale` | Escala inicial de la animación de entrada del diálogo |
| `column.width` | 300px | `--ds-column-width` | Ancho fijo de Column (`flex: 0 0`, con `max-width: 100%`) |
| `column.body-min-height` | 120px | `--ds-column-body-min-height` | Alto mínimo del cuerpo de Column y de DropPlaceholder |
| `icon.size.sm` | 14px | `--ds-icon-size-sm` | Icono en badge, chip, pie de tarjeta (demo) y marca ✓ de la lista desplegable |
| `icon.size.md` | 16px | `--ds-icon-size-md` | Icono por defecto: Button `sm`/`md`, cabecera de Column, ChevronDown del Select, iconos de las opciones de MenuButton |
| `icon.size.lg` | 20px | `--ds-icon-size-lg` | Icono de Button `lg` y de Alert |
| `icon.size.xl` | 28px | `--ds-icon-size-xl` | Icono de DropPlaceholder |
| `icon.stroke-width` | 2px | `--ds-icon-stroke-width` | Grosor de trazo de los iconos Lucide (sobrescribe el atributo del SVG) |
| `appbar.accent-width` | 3px | `--ds-appbar-accent-width` | Franja inferior de la barra superior (solo demo) |
| `popup.min-width` | 180px | `--ds-popup-min-width` | Ancho mínimo de la lista desplegable de Select y MenuButton (la del Select iguala además, como mínimo, el ancho del control) |
| `popup.max-height` | 288px | `--ds-popup-max-height` | Alto máximo de la lista desplegable; con más opciones, la lista se desplaza |

### Movimiento (`tokens/motion.json`)
| Token | Valor | Variable CSS | Uso en el código |
|---|---|---|---|
| `duration.fast` | 120ms | `--ds-duration-fast` | Transiciones de color y borde (botón, chip, control, DropPlaceholder) y giro del ChevronDown del Select |
| `duration.base` | 200ms | `--ds-duration-base` | Pulsación de botón y chip, sombra y elevación de tarjeta, borde de Column, entrada del fondo del diálogo |
| `duration.slow` | 300ms | `--ds-duration-slow` | Entrada del diálogo |
| `duration.spinner` | 700ms | `--ds-duration-spinner` | Una vuelta del spinner |
| `duration.spinner-reduced` | 2800ms | `--ds-duration-spinner-reduced` | Spinner con `prefers-reduced-motion` |
| `easing.standard` | `cubic-bezier(0.2, 0, 0, 1)` | `--ds-easing-standard` | Cambios de color, borde y sombra; fondo del diálogo |
| `easing.emphasized` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | `--ds-easing-emphasized` | Pulsación, elevación de tarjeta, entrada del diálogo (con rebote leve) |
| `easing.linear` | `linear` | `--ds-easing-linear` | Rotación del spinner |

### Sombras (`tokens/shadows.json`)
| Token | Variable CSS | Claro | Oscuro | Uso en el código |
|---|---|---|---|---|
| `sm` | `--ds-shadow-sm` | `0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.10)` | `0 1px 2px rgba(0, 0, 0, 0.40), 0 1px 3px rgba(0, 0, 0, 0.30)` | Tarjeta en reposo, alert, barra de la demo |
| `md` | `--ds-shadow-md` | `0 4px 8px -2px rgba(15, 23, 42, 0.10), 0 2px 4px -2px rgba(15, 23, 42, 0.06)` | `0 4px 8px -2px rgba(0, 0, 0, 0.50), 0 2px 4px -2px rgba(0, 0, 0, 0.30)` | Tarjeta interactiva en hover, lista desplegable de Select y MenuButton |
| `lg` | `--ds-shadow-lg` | `0 12px 24px -6px rgba(15, 23, 42, 0.18), 0 4px 8px -4px rgba(15, 23, 42, 0.08)` | `0 12px 24px -6px rgba(0, 0, 0, 0.60), 0 4px 8px -4px rgba(0, 0, 0, 0.40)` | Tarjeta arrastrándose, diálogo |

## Componentes disponibles

Todos se importan desde `components/index.js`: `Alert`, `Badge`, `Button`, `Card`, `Chip`, `Column`, `Dialog`, `DropPlaceholder`, `Field`, `Icon`, `Input`, `MenuButton`, `Select` y `Textarea`, más la constante `CATEGORY_ICONS`. Ninguno acepta la prop `class`.

### Icon
- **Sintaxis/archivo:** Svelte 5, `design-system/components/icon/Icon.svelte`. Exporta los tipos `IconComponent` (`Component<any>`) e `IconSize`.
- **Variantes:** `size`: `sm`, `md` (por defecto), `lg` o `xl` → `icon.size.*`.
- **Interfaz de uso / API:** props `icon` (obligatoria: un componente de `@lucide/svelte`), `size` y `label`.
- **Reglas de uso:**
  - Renderiza un `<span class="ds-icon">` con el SVG dentro (el SVG lleva siempre `aria-hidden="true"` y `focusable="false"`).
  - Sin `label`: el `span` lleva `aria-hidden="true"` (decorativo). Con `label`: `role="img"` y `aria-label`.
  - El color es `currentColor` (hereda del texto). El tamaño y el trazo salen de los tokens; los atributos `width`/`height`/`stroke-width` del SVG se sobrescriben por CSS.
  - Importar los iconos icono a icono: `import Calendar from '@lucide/svelte/icons/calendar'`.
- **`CATEGORY_ICONS`** (`components/icon/category-icons.js`): `{ feature: Sparkles, improvement: TrendingUp, bugfix: Bug, technical: Wrench }`. Lo usan Badge y Chip como iconos por defecto.

### Button
- **Sintaxis/archivo:** Svelte 5, `design-system/components/button/Button.svelte`.
- **Variantes:**
  - `variant`: `primary` (por defecto), `secondary`, `outline`, `ghost` o `danger`.
  - `size`: `sm`, `md` (por defecto) o `lg`.
  - Solo icono: cuando hay `icon` y no hay `children` (clase `ds-btn--icon-only`, cuadrado).
  - Enlace: con `href`, renderiza un `<a href>` con el mismo aspecto (mismas clases de variante y tamaño), para navegar (p. ej. "Volver a proyectos").
- **Interfaz de uso / API:**
  - Props propias: `variant`, `size`, `loading` (por defecto `false`), `block` (por defecto `false`), `icon` (componente Lucide), `href` y `children` (snippet).
  - Props nativas: `type` (por defecto `button`), `disabled` y `onclick`, más cualquier atributo de `<button>` salvo `class`.
  - Renderiza un `<button>` nativo con `.ds-btn__spinner` (`aria-hidden`) y `.ds-btn__label` (icono + texto). El icono es `md`, o `lg` en `size="lg"`, y decorativo.
- **Reglas de uso:**
  - `loading` pone `aria-busy="true"` y `aria-disabled="true"`, oculta la etiqueta (`visibility: hidden`, incluido el icono) y muestra el spinner. No usa `disabled`, así que el botón conserva el foco.
  - Durante `loading` los clics se anulan (`preventDefault` + `stopImmediatePropagation`) y no se llama a `onclick`.
  - `disabled` usa el atributo nativo.
  - Con `href` no hay spinner, `loading` ni `disabled` (no se aplican al `<a>`); `onclick` se pasa tal cual, sin la anulación de `loading`. El resto de atributos se reparten sobre el `<a>`.
  - `aria-label` es obligatorio si el botón no tiene texto: `<Button variant="ghost" size="sm" icon={X} aria-label="Cerrar" />`.
  - `block` ocupa todo el ancho.

### Input
- **Sintaxis/archivo:** Svelte 5, `design-system/components/input/Input.svelte`.
- **Variantes:** ninguna. El estado depende de `error`/`disabled`.
- **Interfaz de uso / API:**
  - Props: `label` (obligatoria), `value` (bindable, por defecto `''`), `hint`, `error`, `hideLabel`, `required`, `disabled`, `id` y `type` (por defecto `text`).
  - Acepta cualquier atributo de `<input>` salvo `value` y `class`.
- **Reglas de uso:** se construye sobre `Field`. Con `error`, el control recibe `.ds-control--error` y `aria-invalid="true"`.

### Textarea
- **Sintaxis/archivo:** Svelte 5, `design-system/components/textarea/Textarea.svelte`.
- **Variantes:** ninguna.
- **Interfaz de uso / API:**
  - Props: las mismas que Input, más `rows` (por defecto 4).
  - Acepta cualquier atributo de `<textarea>` salvo `value` y `class`.
- **Reglas de uso:** se construye sobre `Field` y solo se puede redimensionar en vertical (`resize: vertical`).

### Select
- **Sintaxis/archivo:** Svelte 5, `design-system/components/select/Select.svelte`. Exporta el tipo `SelectOption = { value: string; label: string; disabled?: boolean }`.
- **Variantes:** ninguna. Estados: cerrado, abierto (borde `focus` y ChevronDown girado 180°), error y disabled.
- **Interfaz de uso / API:**
  - Props: `label` y `options: SelectOption[]` (obligatorias), `value` (bindable, por defecto `''`), `placeholder`, `hint`, `error`, `hideLabel`, `required`, `disabled`, `id`, `name` y `onchange(value)`.
  - **Ya no es un `<select>` nativo** ni acepta atributos arbitrarios (no hay `...rest`): solo las props anteriores. `onchange` recibe el valor (string), no un `Event`.
  - `name` añade un `<input type="hidden" name value>` para enviar el valor en un formulario.
- **Reglas de uso:**
  - Patrón ARIA "select-only combobox": un `<button type="button" role="combobox">` con la clase `ds-control` (`aria-haspopup="listbox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant` mientras está abierto, `aria-required`, `aria-invalid`, `aria-describedby`) muestra la opción elegida; al abrirse, una `<ul role="listbox" aria-label={label}>` con `<li role="option" aria-selected>` (y `aria-disabled` en las deshabilitadas). El foco se queda en el combobox.
  - Sin valor elegido muestra `placeholder` en `text.secondary`; ya no hay opción vacía en la lista.
  - Teclado cerrado: ↓ ↑ Intro y Espacio abren en la opción elegida (o la primera habilitada); Inicio y Fin abren en la primera o la última; teclear letras abre en la opción que empieza así. Abierto: ↓ ↑ Inicio Fin mueven (sin dar la vuelta, saltando las deshabilitadas), Intro y Espacio eligen y cierran, Tab elige y sigue, Escape cierra sin cambiar y **no se propaga** (no cierra un Dialog que lo contenga). Perder el foco o pulsar fuera cierra la lista.
  - Ratón: clic en el control abre o cierra; pasar por encima activa la opción; clic elige y devuelve el foco al control.
  - La lista es la compartida con MenuButton (`components/shared/popup.css` + `popup.js`): se abre en la top layer (`popover="manual"`) con `position: fixed`, debajo del control o encima si no cabe, al menos tan ancha como el control y con `popup.min-width` / `popup.max-height`; se recoloca al desplazar o redimensionar. Sin Popover API (p. ej. jsdom) se queda en el DOM con `position: absolute` bajo el control.
  - Opción elegida: fondo `action.tint`, texto `action.on-tint` en peso `label` y marca Check (`sm`, `action.primary`). Opción activa: `surface.hover` (o `action.tint-active` si además es la elegida).

### MenuButton
- **Sintaxis/archivo:** Svelte 5, `design-system/components/menu-button/MenuButton.svelte`. Exporta el tipo `MenuButtonItem = { value: string; label: string; icon?: IconComponent }`.
- **Variantes:** las de `Button` para el disparador: `variant` (por defecto `ghost`) y `size` (por defecto `md`). Con `icon`, el botón es de solo icono; sin él, muestra `label` como texto. `align`: `start` o `end` (por defecto) — lado del botón al que se alinea el menú.
- **Interfaz de uso / API:**
  - Props: `label` (obligatoria: nombre accesible del botón y del menú), `items: MenuButtonItem[]` (obligatoria), `value` (bindable, por defecto `''`), `icon`, `variant`, `size`, `align` y `onchange(value)`.
  - Uso típico (selector de tema): `<MenuButton label="Tema" icon={Sun} bind:value={mode} items={[{ value: 'auto', label: 'Automático', icon: Monitor }, …]} />`.
- **Reglas de uso:**
  - Menú de opciones excluyentes: el disparador es un `Button` con `aria-haspopup="menu"`, `aria-expanded` y `aria-controls`; el menú es `<ul role="menu" aria-labelledby>` con `<li role="none"><button role="menuitemradio" aria-checked>`. A diferencia del Select, el foco se mueve a las opciones.
  - Teclado: Intro, Espacio o ↓ abren el menú en la opción elegida; ↑ abre en la última. Dentro, ↓ ↑ (dan la vuelta), Inicio y Fin mueven el foco; Intro o Espacio (clic nativo) eligen y cierran; Escape cierra (sin propagarse) y devuelve el foco al botón; Tab cierra sin elegir.
  - Pulsar fuera cierra el menú sin devolver el foco. Elegir la opción ya elegida cierra sin llamar a `onchange`.
  - Cada opción muestra su `icon` (`md`, decorativo), su texto y la marca Check de la elegida. Mismo aspecto y colocación que la lista del Select (`shared/popup.*`).
  - El icono del botón no cambia solo: si debe reflejar el valor (p. ej. sol/luna), la app pasa el icono correspondiente (así lo hace la demo).

### Field
- **Sintaxis/archivo:** Svelte 5, `design-system/components/field/Field.svelte`. Exporta el tipo `FieldControlAttrs`.
- **Variantes:** ninguna.
- **Interfaz de uso / API:**
  - Props: `label` (obligatoria), `hint`, `error`, `required`, `disabled`, `hideLabel`, `id` y `control` (snippet obligatorio).
  - El snippet recibe `{ id, 'aria-describedby', 'aria-invalid', required, disabled }`.
  - Importa `components/shared/control.css`.
- **Reglas de uso:**
  - Genera los ids con `$props.id()` y enlaza `aria-describedby` a la ayuda y al error.
  - `required` muestra un ` *` con `aria-hidden`.
  - `hideLabel` aplica `.ds-visually-hidden` (la etiqueta sigue disponible para lectores de pantalla).
  - Para controles propios, aplicar la clase `ds-control` (y `ds-control--error` cuando haya error).

### Dialog
- **Sintaxis/archivo:** Svelte 5, `design-system/components/dialog/Dialog.svelte`, sobre `<dialog>` nativo con `showModal()`.
- **Variantes:** `size` puede ser `sm` (400px) o `md` (560px, por defecto).
- **Interfaz de uso / API:**
  - Props: `open` (bindable, por defecto `false`), `title` (obligatorio), `description`, `size`, `dismissible` (por defecto `true`), `closeLabel` (por defecto `"Cerrar"`), `onclose`, `children` y `actions` (snippets).
- **Reglas de uso:**
  - `aria-labelledby` apunta al título y `aria-describedby` a la descripción.
  - Con `dismissible`, se cierra con Escape, con un clic en el fondo y con el botón × (un `Button` ghost `sm` con `aria-label={closeLabel}`; el × es texto, no un icono Lucide).
  - Con `dismissible={false}` se anula Escape (`cancel`) y no se muestra el ×.
  - `onclose` se llama cada vez que el diálogo se cierra, también cuando el cierre lo provoca poner `open = false`.
  - Las acciones se alinean a la derecha y pasan a otra línea si no caben.

### Card
- **Sintaxis/archivo:** Svelte 5, `design-system/components/card/Card.svelte`. Renderiza un `<article>`.
- **Variantes / estados:**
  - Interactiva (con `onopen`): cursor pointer; en hover sube `card.lift` con sombra `md`.
  - `dragging`: sombra `lg` y giro `card.drag-rotate`.
  - `readonly`: sin hover ni apertura.
  - `priority`: `high`, `medium` o `low` → borde superior de `border.width.accent` en `priority.*` (clase `ds-card--accent` + `data-priority`). Sin `priority`, no hay franja.
- **Interfaz de uso / API:**
  - Props: `title` (obligatorio), `description`, `onopen`, `dragging` (por defecto `false`), `readonly` (por defecto `false`), `priority`, y los snippets `tags` y `footer`.
- **Reglas de uso:**
  - Si es interactiva, el título se renderiza como `<button class="ds-card__open">` dentro de un `<h3>`. Un clic en cualquier parte de la tarjeta llama a `onopen`, salvo que venga de otro `a, button, input, select, textarea, [role="button"]`.
  - El teclado usa el botón del título.
  - La descripción conserva los saltos de línea (`white-space: pre-line`) y se recorta a `card.description-lines` líneas.
  - La franja de prioridad es solo visual: la prioridad debe mostrarse también en texto (p. ej. un Badge), según el comentario del componente.
  - El pie (`footer`) es un contenedor flex: un `Icon size="sm"` seguido de texto queda alineado (así lo usa la demo con `Calendar`).
  - El arrastre no está implementado en el componente: lo aporta la app.

### Column
- **Sintaxis/archivo:** Svelte 5, `design-system/components/column/Column.svelte`. Exporta el tipo `ColumnStatus`. Renderiza un `<section aria-labelledby>`.
- **Variantes / estados:**
  - `status`: `todo` (por defecto), `doing`, `paused` o `done` → `status.*` en la franja superior, el icono, el fondo de cabecera, el título, el contador y el fondo del cuerpo (`status.*.surface`, el tono de la cabecera más suave).
  - Iconos por estado (decorativos): `todo` CircleDashed, `doing` CircleDot, `paused` CirclePause, `done` CircleCheck.
  - `dropTarget`: borde de `border.width.dashed` en `action.primary` (sólido, no punteado) mientras se arrastra una tarjeta encima.
- **Interfaz de uso / API:**
  - Props: `title` (obligatorio), `status`, `count`, `countLabel`, `headingLevel` (2–6, por defecto 2), `dropTarget` (por defecto `false`), y los snippets `actions` (opcional, en la cabecera) y `children` (obligatorio, cuerpo).
  - El contador se muestra solo si `count` está definido. El número lleva `aria-hidden` y va acompañado de un texto oculto: `countLabel` o, por defecto, `"{count} tarjeta"` / `"{count} tarjetas"`.
- **Reglas de uso:**
  - Ancho fijo `column.width`; el cuerpo tiene alto mínimo `column.body-min-height` y `gap` de `spacing.3`, sin `overflow` propio: la columna crece con sus tarjetas (un cuerpo con scroll hace que `svelte-dnd-action` acumule bucles de autodesplazamiento). La sección es `position: relative`, que contiene el texto oculto del contador.
  - El arrastre no está implementado: la app pone su propia lista (p. ej. `svelte-dnd-action`) dentro del cuerpo y controla `dropTarget`.
  - Las acciones de cabecera son Buttons (la demo usa `Button variant="ghost" size="sm" icon={Plus}` con `aria-label`).

### DropPlaceholder
- **Sintaxis/archivo:** Svelte 5, `design-system/components/drop-placeholder/DropPlaceholder.svelte`.
- **Variantes / estados:**
  - Reposo: borde punteado `border.strong`, fondo transparente, texto `text.secondary`, icono Inbox.
  - `active`: borde `action.primary`, fondo `action.tint`, texto `action.on-tint`, icono ArrowDownToLine.
- **Interfaz de uso / API:** props `active` (por defecto `false`) y `label` (opcional).
- **Reglas de uso:**
  - No es interactivo. Sin `label`, todo el bloque lleva `aria-hidden="true"`.
  - Sirve como hueco donde caerá la tarjeta y como estado vacío de una columna.

### Badge
- **Sintaxis/archivo:** Svelte 5, `design-system/components/badge/Badge.svelte`. Exporta el tipo `BadgeTone`.
- **Variantes** (`tone`):
  - `neutral` (por defecto): `surface.base` con `text.secondary`.
  - `feature`, `improvement`, `bugfix` y `technical`: relleno `tag.*.bg` con texto `tag.*.fg`, e icono por defecto de `CATEGORY_ICONS`.
  - `danger`, `warning`, `success` e `info`: contorno y texto del color de feedback, sin relleno ni icono por defecto.
- **Interfaz de uso / API:** props `tone`, `icon` (componente Lucide; `null` quita el icono por defecto) y `children` (snippet obligatorio). Renderiza un `<span>` no interactivo; el icono es `sm`, decorativo y del color del texto.
- **Reglas de uso:** el significado va en el texto. Las variantes de feedback están validadas sobre `surface.raised`, según el comentario del componente.

### Chip
- **Sintaxis/archivo:** Svelte 5, `design-system/components/chip/Chip.svelte`.
- **Variantes / estados:**
  - Normal y seleccionado: `action.tint` con borde `action.primary` de doble grosor (borde de `border.width.default` más un `box-shadow` interior del mismo grosor, sin mover el contenido) y texto `action.on-tint`. Ya no muestra el icono Check.
  - `tone` opcional (`feature`, `improvement`, `bugfix` o `technical`): muestra el icono de `CATEGORY_ICONS` en `tag.*.fg`. En `disabled`, el icono hereda `text.disabled`.
- **Interfaz de uso / API:**
  - Props: `selected` (bindable, por defecto `false`), `tone`, `icon` (sustituye al de la categoría), `disabled`, `onchange(selected)` y `children` (snippet obligatorio).
  - Renderiza `<button type="button" aria-pressed>`.
- **Reglas de uso:** al pulsarlo invierte `selected` y llama a `onchange`. Está pensado para filtros de selección múltiple, agrupados por la app con `role="group"` en la demo.

### Alert
- **Sintaxis/archivo:** Svelte 5, `design-system/components/alert/Alert.svelte`.
- **Variantes:** `tone` puede ser `danger`, `warning`, `success` o `info` (por defecto `info`).
- **Interfaz de uso / API:** props `tone`, `title`, `children` y `actions` (snippets).
- **Reglas de uso:**
  - `danger` y `warning` llevan `role="alert"`; `success` e `info` llevan `role="status"`.
  - Icono `lg` por tono, decorativo y en el color del tono: CircleAlert, TriangleAlert, CircleCheck, Info. No se puede cambiar ni quitar.
  - El fondo es `surface.raised` con un borde izquierdo de `border.width.accent` del color del tono. El título va en el color del tono y el cuerpo en `text.primary`.

## Conformidad de accesibilidad

Resultado de `node design-system/scripts/check-contrast.mjs`: **los 232 pares (116 × 2 modos) cumplen WCAG AA**. Los ratios se indican como claro / oscuro. Los estados disabled están exentos por WCAG y no se listan. Los iconos son decorativos (`aria-hidden`) salvo un `Icon` con `label`; sus colores cuentan como `ui` (3:1).

Compilación: `vite build` de la demo terminó con "✓ built" (ejecutado el 2026-10-14 por `design-builder`). El comportamiento en navegador **no está verificado**.

### Button
- **Estados implementados en el código real:**
  - focus: `:focus-visible` con outline `focus` de 2px y separación de 2px.
  - disabled: nativo, con `surface.base`, `border.default` y `text.disabled`.
  - loading: `aria-busy` + `aria-disabled` y spinner; conserva el foco.
  - hover y active: por variante, más `scale(control.press-scale)` al pulsar.
  - error: no aplica (existe la variante `danger` para acciones destructivas).
- **Contraste WCAG AA:**

| Par | Dónde | Claro | Oscuro | Mín. | Resultado |
|---|---|---|---|---|---|
| action.on-primary / action.primary | primary | 6.29 | 6.50 | 4.5 | Cumple |
| action.on-primary / action.primary-hover | primary :hover | 7.90 | 8.96 | 4.5 | Cumple |
| action.on-primary / action.primary-active | primary :active | 9.93 | 11.97 | 4.5 | Cumple |
| text.primary / surface.raised | secondary | 17.85 | 12.50 | 4.5 | Cumple |
| border.strong / surface.raised | borde secondary | 4.76 | 5.10 | 3 | Cumple |
| text.primary / surface.hover | secondary/ghost :hover | 14.48 | 9.90 | 4.5 | Cumple |
| text.primary / surface.active | secondary/ghost :active | 12.02 | 7.24 | 4.5 | Cumple |
| action.primary / background | outline sobre página | 6.01 | 6.50 | 4.5 | Cumple |
| action.primary / surface.base | outline sobre panel | 5.74 | 5.33 | 4.5 | Cumple |
| action.primary / status.{todo · doing · paused · done}.surface | outline/ghost dentro de columna | 5.80 · 5.78 · 5.92 · 6.01 | 5.94 · 5.95 · 6.22 · 6.06 | 4.5 | Cumple |
| action.primary / surface.raised | outline sobre tarjeta/diálogo (texto y borde) | 6.29 | 4.77 | 4.5 | Cumple |
| action.on-tint / action.tint | outline :hover | 8.88 | 10.72 | 4.5 | Cumple |
| action.on-tint / action.tint-active | outline :active | 8.06 | 7.66 | 4.5 | Cumple |
| action.primary / action.tint | borde outline :hover | 5.62 | 5.83 | 3 | Cumple |
| feedback.on-danger / feedback.danger | danger | 6.47 | 6.45 | 4.5 | Cumple |
| feedback.on-danger / feedback.danger-hover | danger :hover/:active | 8.31 | 9.41 | 4.5 | Cumple |
| text.primary / status.{todo · doing · paused · done}.tint | ghost en cabecera de columna | 16.30 · 14.63 · 15.58 · 16.26 | 13.98 · 14.04 · 14.96 · 14.25 | 4.5 | Cumple |
| focus / background · surface.base · surface.raised | anillo de foco | 6.01 · 5.74 · 6.29 | 8.96 · 7.34 · 6.56 | 3 | Cumple |
| focus / status.{todo · doing · paused · done}.surface | anillo de foco dentro de columna | 5.80 · 5.78 · 5.92 · 6.01 | 8.18 · 8.20 · 8.56 · 8.34 | 3 | Cumple |
| focus / status.{todo · doing · paused · done}.tint | foco en cabecera de columna | 5.74 · 5.15 · 5.49 · 5.73 | 7.34 · 7.37 · 7.85 · 7.48 | 3 | Cumple |

  El icono hereda el color del texto de cada variante, así que comparte sus ratios.
- **Navegación por teclado / zona táctil:**
  - Teclado: presente, con `<button>` nativo y foco visible.
  - Zona táctil: presente. 44px de alto y ancho mínimo en md; en `sm` (36px) un `::after` amplía la zona a 44×44px, también en solo icono.
  - Texto alternativo: los botones de solo icono necesitan `aria-label` (no se impone en código; ver Inconsistencias).
  - Con `href`: `<a>` nativo, enfocable y activable con Intro (no con Espacio, como todo enlace); mismo foco visible y misma zona táctil.
  - `prefers-reduced-motion`: sin transiciones ni escala; spinner a `duration.spinner-reduced`.

### Input · Textarea · Select · Field
- **Estados implementados en el código real:**
  - focus: `:focus-visible`, con borde y outline `focus`.
  - hover: borde `text.secondary`.
  - error: borde `feedback.danger`, mensaje con `aria-invalid` y `aria-describedby` (en el Select, sobre el botón combobox).
  - disabled: `surface.base`, `border.default` y `text.disabled`; la etiqueta pasa a `text.disabled` (en el Select también el ChevronDown y el placeholder).
  - Select abierto: borde `focus` y ChevronDown girado (sin transición con `prefers-reduced-motion`).
  - loading: no aplica.
- **Contraste WCAG AA:**

| Par | Dónde | Claro | Oscuro | Mín. | Resultado |
|---|---|---|---|---|---|
| text.primary / surface.raised | texto del control | 17.85 | 12.50 | 4.5 | Cumple |
| text.secondary / surface.raised | placeholder, ayuda | 7.58 | 8.81 | 4.5 | Cumple |
| border.strong / surface.raised · background · surface.base | borde del control | 4.76 · 4.55 · 4.34 | 5.10 · 6.96 · 5.71 | 3 | Cumple |
| feedback.danger / surface.raised · background | error de campo, asterisco, borde de error | 6.47 · 6.18 | 4.73 · 6.45 | 4.5 | Cumple |
| text.primary / background · surface.raised | etiqueta | 17.06 · 17.85 | 17.06 · 12.50 | 4.5 | Cumple |
| text.secondary / surface.raised | ChevronDown del select (uso ui) | 7.58 | 8.81 | 3 | Cumple (valores del par de texto equivalente; no listado como `ui`) |
| text.secondary / surface.raised | borde del control en hover (uso ui) | 7.58 | 8.81 | 3 | Cumple (ídem) |

- **Navegación por teclado / zona táctil:**
  - Teclado: presente. Input y Textarea son nativos; el Select es un `<button role="combobox">` con el teclado del patrón ARIA (ver Componentes). Todos con la etiqueta asociada por `for`/`id`.
  - Zona táctil: presente, con altura mínima de 44px (también cada opción de la lista del Select).
  - `prefers-reduced-motion`: sin transiciones.

### Lista desplegable (Select · MenuButton)
- **Estados implementados en el código real:**
  - Opción activa (ratón, flechas o foco): `surface.hover`. En MenuButton, además, anillo `focus` hacia dentro en `:focus-visible`.
  - Opción elegida: `action.tint`, texto `action.on-tint` en negrita y marca Check visible (no solo color). Elegida y activa: `action.tint-active`.
  - Opción deshabilitada (solo Select, `aria-disabled`): `text.disabled`, sin fondo, `cursor: not-allowed`; no se puede activar ni elegir.
  - loading y error: no aplican.
- **Contraste WCAG AA:**

| Par | Dónde | Claro | Oscuro | Mín. | Resultado |
|---|---|---|---|---|---|
| text.primary / surface.raised | opción normal | 17.85 | 12.50 | 4.5 | Cumple |
| text.primary / surface.hover | opción activa | 14.48 | 9.90 | 4.5 | Cumple |
| action.on-tint / action.tint | opción elegida (texto) | 8.88 | 10.72 | 4.5 | Cumple |
| action.on-tint / action.tint-active | opción elegida y activa | 8.06 | 7.66 | 4.5 | Cumple |
| action.primary / action.tint | marca Check de la elegida | 5.62 | 5.83 | 3 | Cumple |
| action.primary / action.tint-active | marca Check de la elegida y activa | 5.10 | 4.16 | 3 | Cumple |
| focus / surface.hover | anillo de foco de opción de MenuButton | 5.10 | 5.19 | 3 | Cumple |
| focus / action.tint-active | anillo de foco de la opción elegida de MenuButton | 5.10 | 5.73 | 3 | Cumple (calculado aquí; **par no listado**) |

  El borde de la lista (`border.default`) es decorativo; la lista se separa del fondo por sombra `md` y por `surface.raised`.
- **Navegación por teclado / zona táctil:**
  - Teclado: completo en ambos (ver Componentes). Escape no cierra el Dialog que contiene la lista.
  - Zona táctil: cada opción mide al menos `control.hit-area` (44px) de alto y ocupa todo el ancho de la lista.
  - Lectores de pantalla: Select anuncia la opción activa por `aria-activedescendant`; MenuButton mueve el foco real a cada `menuitemradio` con `aria-checked`.
  - Comportamiento en navegador (top layer, colocación, scroll) **no verificado** en esta extracción.

### Dialog
- **Estados implementados en el código real:**
  - focus: foco atrapado por `showModal()` nativo; el botón × es un Button.
  - Cierre con Escape y con clic en el fondo (si es `dismissible`).
  - Animación de entrada; desactivada con `prefers-reduced-motion`.
  - disabled, loading y error: no aplican.
- **Contraste WCAG AA:**

| Par | Dónde | Claro | Oscuro | Mín. | Resultado |
|---|---|---|---|---|---|
| text.primary / surface.raised | título y cuerpo | 17.85 | 12.50 | 4.5 | Cumple |
| text.secondary / surface.raised | descripción | 7.58 | 8.81 | 4.5 | Cumple |
| focus / surface.raised | foco dentro del diálogo | 6.29 | 6.56 | 3 | Cumple |

- **Navegación por teclado / zona táctil:**
  - Teclado: presente (comportamiento nativo de `<dialog>` modal).
  - El botón × usa Button `sm`, con zona táctil de 44px.

### Card
- **Estados implementados en el código real:**
  - focus: `:focus-visible` en el botón del título.
  - hover: elevación y sombra `md`.
  - dragging: sombra `lg` y giro.
  - readonly: sin interacción.
  - priority: franja superior de color (solo visual).
  - disabled, loading y error: no aplican.
- **Contraste WCAG AA:**

| Par | Dónde | Claro | Oscuro | Mín. | Resultado |
|---|---|---|---|---|---|
| text.primary / surface.raised | título | 17.85 | 12.50 | 4.5 | Cumple |
| text.secondary / surface.raised | descripción, pie (e icono del pie) | 7.58 | 8.81 | 4.5 | Cumple |
| focus / surface.raised | foco del título | 6.29 | 6.56 | 3 | Cumple |
| priority.high / status.{todo · doing · paused · done}.surface | franja Alta sobre columna | 4.45 · 4.44 · 4.55 · 4.61 | 5.89 · 5.91 · 6.17 · 6.01 | 3 | Cumple |
| priority.medium / status.{todo · doing · paused · done}.surface | franja Media sobre columna | 3.28 · 3.27 · 3.35 · 3.40 | 7.20 · 7.22 · 7.54 · 7.35 | 3 | Cumple (margen pequeño en claro) |
| priority.low / status.{todo · doing · paused · done}.surface | franja Baja sobre columna | 4.60 · 4.59 · 4.70 · 4.77 | 10.81 · 10.84 · 11.32 · 11.03 | 3 | Cumple |
| priority.* / surface.raised | franja junto al interior de la tarjeta | — | — | 3 | **No verificado** (par no listado) |

- **Navegación por teclado / zona táctil:**
  - Teclado: presente si es interactiva (botón del título). El clic en el resto de la tarjeta es solo un atajo de ratón o táctil.
  - Zona táctil: toda la tarjeta. El botón del título por sí solo no garantiza 44px.
  - La prioridad no depende solo del color si la app la muestra también en texto.

### Column
- **Estados implementados en el código real:**
  - normal y `dropTarget` (borde `action.primary`).
  - No tiene foco propio: el foco está en los controles de `actions` y del cuerpo.
  - disabled, loading y error: no aplican.
  - `prefers-reduced-motion`: sin transición de borde.
- **Contraste WCAG AA:**

| Par | Dónde | Claro | Oscuro | Mín. | Resultado |
|---|---|---|---|---|---|
| status.todo.on-tint / status.todo.tint | título `todo` | 9.45 | 11.87 | 4.5 | Cumple |
| status.doing.on-tint / status.doing.tint | título `doing` | 7.15 | 10.34 | 4.5 | Cumple |
| status.paused.on-tint / status.paused.tint | título `paused` | 6.38 | 11.56 | 4.5 | Cumple |
| status.done.on-tint / status.done.tint | título `done` | 6.49 | 12.30 | 4.5 | Cumple |
| status.{todo · doing · paused · done}.on-tint / surface.raised | contador | 10.35 · 8.72 · 7.31 · 7.13 | 10.61 · 9.21 · 9.66 · 10.79 | 4.5 | Cumple |
| status.{todo · doing · paused · done}.accent / tint | icono de cabecera | 4.34 · 4.24 · 3.11 · 4.57 | 5.71 · 5.78 · 6.92 · 8.55 | 3 | Cumple (`paused` con margen mínimo en claro) |
| status.{todo · doing · paused · done}.accent / status.*.surface | franja superior (par listado) | 4.39 · 4.75 · 3.35 · 4.79 | 6.36 · 6.43 · 7.54 · 9.55 | 3 | Cumple |
| status.*.accent / background | franja superior contra la página | — | — | 3 | **No verificado** (par no listado; ver Inconsistencias) |
| text.primary / status.{todo · doing · paused · done}.surface | texto en el cuerpo | 16.46 · 16.40 · 16.81 · 17.05 | 15.58 · 15.62 · 16.32 · 15.90 | 4.5 | Cumple |
| text.secondary / status.{todo · doing · paused · done}.surface | texto secundario en el cuerpo | 6.99 · 6.96 · 7.14 · 7.24 | 10.98 · 11.01 · 11.50 · 11.20 | 4.5 | Cumple |
| action.primary / status.{todo · doing · paused · done}.surface | borde `dropTarget` | 5.80 · 5.78 · 5.92 · 6.01 | 5.94 · 5.95 · 6.22 · 6.06 | 3 | Cumple |
| action.primary / background | borde `dropTarget` contra la página | 6.01 | 6.50 | 3 | Cumple (par listado como texto) |

- **Navegación por teclado / zona táctil:**
  - Estructura: `<section>` etiquetada por el encabezado (`h2`–`h6`). El contador tiene texto para lectores de pantalla.
  - Teclado y zona táctil: dependen de los Buttons de `actions` (44px con el `::after` de `sm`).
  - El estado se comunica por el título; el color y el icono son refuerzos.

### DropPlaceholder
- **Estados implementados en el código real:** reposo y `active`. No interactivo. Sin `label`, `aria-hidden`. `prefers-reduced-motion`: sin transiciones.
- **Contraste WCAG AA:**

| Par | Dónde | Claro | Oscuro | Mín. | Resultado |
|---|---|---|---|---|---|
| text.secondary / status.{todo · doing · paused · done}.surface | texto e icono en reposo | 6.99 · 6.96 · 7.14 · 7.24 | 10.98 · 11.01 · 11.50 · 11.20 | 4.5 | Cumple |
| border.strong / status.{todo · doing · paused · done}.surface | borde punteado en reposo | 4.39 · 4.37 · 4.48 · 4.55 | 6.36 · 6.37 · 6.66 · 6.49 | 3 | Cumple |
| action.on-tint / action.tint | texto e icono activo | 8.88 | 10.72 | 4.5 | Cumple |
| action.primary / action.tint | borde punteado activo | 5.62 | 5.83 | 3 | Cumple |

  Fuera de una `Column` (sobre `background` o `surface.raised`) los pares en reposo no están listados: **no verificado** en esas superficies.
- **Navegación por teclado / zona táctil:** no aplica (no interactivo).

### Badge
- **Estados implementados en el código real:** no interactivo; no aplican.
- **Contraste WCAG AA** (el icono hereda el color del texto):

| Par | Dónde | Claro | Oscuro | Mín. | Resultado |
|---|---|---|---|---|---|
| tag.feature.fg / tag.feature.bg | feature | 7.15 | 7.29 | 4.5 | Cumple |
| tag.improvement.fg / tag.improvement.bg | improvement | 6.49 | 7.52 | 4.5 | Cumple |
| tag.bugfix.fg / tag.bugfix.bg | bugfix | 6.80 | 6.93 | 4.5 | Cumple |
| tag.technical.fg / tag.technical.bg | technical | 7.57 | 7.89 | 4.5 | Cumple |
| text.secondary / surface.base | neutral | 6.92 | 9.85 | 4.5 | Cumple |
| feedback.danger / surface.raised | danger | 6.47 | 4.73 | 4.5 | Cumple |
| feedback.warning / surface.raised | warning | 4.92 | 8.54 | 4.5 | Cumple |
| feedback.success / surface.raised | success | 5.02 | 7.51 | 4.5 | Cumple |
| feedback.info / surface.raised | info | 6.70 | 5.15 | 4.5 | Cumple |

  Las variantes de feedback sobre `surface.base`, `status.*.surface` o `background` (por ejemplo, un badge colocado directamente en una columna) **no están verificadas**: esos pares no están en `contrast-pairs.json`.
- **Navegación por teclado / zona táctil:** no aplica (no interactivo).

### Chip
- **Estados implementados en el código real:**
  - focus: `:focus-visible`.
  - hover y active: escala al pulsar.
  - seleccionado: relleno `action.tint` y borde `action.primary` de doble grosor, con `aria-pressed` (el grosor del borde es la señal no cromática; ya no hay icono Check).
  - disabled: `surface.base`, `border.default` y `text.disabled` (también el icono).
  - loading y error: no aplican.
- **Contraste WCAG AA:**

| Par | Dónde | Claro | Oscuro | Mín. | Resultado |
|---|---|---|---|---|---|
| text.primary / surface.raised | normal | 17.85 | 12.50 | 4.5 | Cumple |
| border.strong / background · surface.base · status.{todo · doing · paused · done}.surface | borde normal | 4.55 · 4.34 · 4.39–4.55 | 6.96 · 5.71 · 6.36–6.66 | 3 | Cumple |
| action.on-tint / action.tint | seleccionado (texto) | 8.88 | 10.72 | 4.5 | Cumple |
| action.on-tint / action.tint-active | seleccionado :active | 8.06 | 7.66 | 4.5 | Cumple |
| action.primary / action.tint | borde doble seleccionado | 5.62 | 5.83 | 3 | Cumple |
| tag.*.fg / surface.raised | icono de categoría | 7.13–8.98 | 9.04–10.79 | 3 | Cumple |
| tag.*.fg / action.tint | icono de categoría seleccionado | 6.38–8.03 | 11.05–13.19 | 3 | Cumple |
| tag.*.fg / surface.hover · surface.active · action.tint-active | icono en hover / pulsado | — | — | 3 | **No verificado** (pares no listados) |

- **Navegación por teclado / zona táctil:**
  - Teclado: presente, con `<button>` nativo y `aria-pressed`.
  - Zona táctil: presente. Mide 36px de alto y un `::after` amplía la zona a 44×44px.
  - `prefers-reduced-motion`: sin transiciones ni escala.

### Alert
- **Estados implementados en el código real:** no interactivo. Usa `role="alert"` o `role="status"` según el tono.
- **Contraste WCAG AA:**

| Par | Dónde | Claro | Oscuro | Mín. | Resultado |
|---|---|---|---|---|---|
| text.primary / surface.raised | cuerpo | 17.85 | 12.50 | 4.5 | Cumple |
| feedback.danger / surface.raised | título, acento e icono danger | 6.47 | 4.73 | 4.5 | Cumple |
| feedback.warning / surface.raised | título, acento e icono warning | 4.92 | 8.54 | 4.5 | Cumple |
| feedback.success / surface.raised | título, acento e icono success | 5.02 | 7.51 | 4.5 | Cumple |
| feedback.info / surface.raised | título, acento e icono info | 6.70 | 5.15 | 4.5 | Cumple |

- **Navegación por teclado / zona táctil:** no aplica al contenedor; las acciones son Buttons.

### Icon
- **Estados implementados en el código real:** no interactivo. Decorativo por defecto; con `label`, `role="img"`.
- **Contraste:** hereda `currentColor`; el ratio es el del texto o color del contenedor.
- **Texto alternativo:** obligatorio pasar `label` cuando el icono transmite información que no está en el texto adyacente.

## Reglas de uso para el rol builder en apps que importen esta librería
- Nunca hardcodear valores de color, espaciado, tipografía, radios, sombras, tamaños de icono ni duraciones: siempre desde los tokens, a través de las variables `--ds-*` de `tokens/tokens.css`.
- Importar `design-system/tokens/tokens.css` una vez, a nivel global, en el punto de entrada de la app, junto con las fuentes. La app debe instalar `@fontsource-variable/plus-jakarta-sans` (y `@fontsource/jetbrains-mono` si usa `family.mono`) e importarlas; Inter ya no es necesaria.
- Instalar `@lucide/svelte` (`peerDependency`) en la app. Importar los iconos icono a icono (`@lucide/svelte/icons/<nombre>`) y mostrarlos con `Icon` (o el prop `icon` de Button, Badge y Chip), nunca como SVG suelto.
- Importar los componentes desde `design-system/components/index.js`. Requieren Svelte `^5.20` y los compila el plugin de Svelte de la app.
- Usar npm (no pnpm) para instalar dependencias.
- Modo de color: sin `data-theme` se sigue al sistema. Para forzarlo, poner `data-theme="light"` o `"dark"` en `<html>`.
- Usar `Button`, `Input`, `Textarea`, `Select`, `MenuButton`, `Dialog`, `Card`, `Badge`, `Chip`, `Alert`, `Column` y `DropPlaceholder` en lugar de estilizar elementos nativos a mano. Para un control propio, envolverlo en `Field` y aplicar `ds-control` / `ds-control--error`.
- Enlaces con aspecto de botón (navegación): `<Button href="…">`, no un `<a>` estilizado a mano.
- `Select`: es un combobox propio, no un `<select>`. Leer y escribir el valor con `bind:value` (u `onchange(value)`, que recibe el string); no pasarle atributos nativos de `<select>` ni escuchar eventos `change`/`input` del DOM. En formularios, `name` añade un campo oculto con el valor. En tests, la opción se elige abriendo el combobox (`getByRole('combobox', { name })`) y pulsando la `option`, no con `selectOption`.
- Ajustes rápidos de opciones excluyentes con un botón (p. ej. el tema claro/oscuro/automático): `MenuButton` con `bind:value`, `label` como nombre accesible e `icon` que refleje la opción elegida.
- Las listas de Select y MenuButton se abren en la top layer: no hace falta (ni sirve) darles `z-index` ni sacar el control de un contenedor con `overflow`.
- Botones de solo icono: `<Button icon={…} aria-label="…" />`; el `aria-label` es obligatorio.
- Tablero: una `Column` por estado (`todo`, `doing`, `paused`, `done`) con su `count`, y la lista arrastrable dentro del cuerpo. `dropTarget` y la sombra de arrastre (`DropPlaceholder active`) los controla la app. El fondo del cuerpo (`status.*.surface`) lo pone la propia `Column`.
- Columna vacía: `DropPlaceholder` con `label` (p. ej. "Sin tarjetas").
- `Card priority`: mostrar también la prioridad en texto (p. ej. un Badge con icono de flecha). La correspondencia prioridad → icono (la demo usa ArrowUp / Equal / ArrowDown) la decide la app.
- Acciones destructivas: `Button variant="danger"`. Las confirmaciones van en `Dialog size="sm"`.
- Las etiquetas de categoría usan los tonos `feature`, `improvement`, `bugfix` y `technical` de Badge y Chip, con sus iconos por defecto; la correspondencia con el dominio la decide la app.
- `Chip`: usar `bind:selected` (o actualizar `selected` desde `onchange`), porque el chip invierte su propio valor al pulsarlo.
- `Card`: el arrastre lo implementa la app; el componente solo refleja el estado con `dragging`.
- Badges de feedback: colocarlos sobre `surface.raised` (tarjeta o diálogo), que es donde están validados.
- Barra superior: usar `appbar.bg`, `appbar.fg`, `appbar.accent` y `appbar.accent-width` (no hay componente; la demo muestra el patrón con sombra `sm`).
- Respetar `prefers-reduced-motion` en los estilos propios de la app, igual que los componentes.
- Todo par de color nuevo debe añadirse a `design-system/scripts/contrast-pairs.json` y pasar `check-contrast.mjs` en ambos modos. Esto lo hace `design-builder`, no `builder`.
- Las categorías de tokens que no existen (breakpoints, z-index) no se inventan en la app: se piden a `design-builder`.

## Inconsistencias detectadas
- **El token de foco se usa como grosor genérico:** el spinner de Button (`border`) usa `--ds-focus-ring-width`, que semánticamente es el grosor del anillo de foco. Si cambia el foco, cambia también el spinner.
- **Token sin uso:** `control.chevron-size` ya no lo usa ningún componente (el Select dibuja la flecha con el icono ChevronDown).
- **`surface.sunken` sin uso:** desde que `Column` usa `status.*.surface`, ningún componente usa `surface.sunken` y ya no hay pares sobre él en `contrast-pairs.json`. El token sigue existiendo (la descripción de `_meta` lo indica); si una app lo usa, sus pares **no están verificados**.
- **Select ya no reenvía atributos:** el comentario y los tipos coinciden (no hay `...rest`), pero es un cambio incompatible con apps que le pasaban atributos nativos (`data-*`, `onchange` con `Event`, `aria-*` extra) o que lo controlaban con APIs de `<select>` (p. ej. `selectOption` de Playwright o `fireEvent.change`).
- **Comentario de MenuButton y teclado:** dice que Intro y Espacio abren el menú; lo hacen a través del `onclick` del Button (clic nativo), no del manejador de teclado, que solo trata ↓ y ↑.
- **`Button` con `href` y `type`:** con `href`, el `type` por defecto (`button`) no se pasa al `<a>`, pero `disabled` y `loading` se ignoran en silencio (no hay error de tipos: el tipo de props sigue siendo el de `<button>`).
- **`border.width.dashed` usado para un borde sólido:** `Column` usa `--ds-border-width-dashed` como grosor de su borde transparente / `dropTarget`, que es sólido. Si cambia el grosor del punteado de DropPlaceholder, cambia también el de la columna.
- **`column.body-min-height` reutilizado fuera de Column:** `DropPlaceholder` toma su alto mínimo de `--ds-column-body-min-height`.
- **Valores escritos en componentes que no salen de tokens:**
  - `Select.svelte`: `rotate(180deg)` del ChevronDown al abrir.
  - `Button.svelte`: `rotate(360deg)` en la animación del spinner.
  - `shared/popup.css`: `inset: auto`, `margin: 0` y `outline-offset: calc(var(--ds-focus-ring-width) * -1)`; `shared/popup.js`: `Math.max(0, …)` y la separación leída de `--ds-spacing-1`.
  - `control.css`: `opacity: 1` en `::placeholder`, y `1px`, `-1px` y `clip: rect(0, 0, 0, 0)` en `.ds-visually-hidden`.
  - `Column.svelte`: `.ds-column__sr` repite el patrón de texto oculto con `1px`, `-1px` y `clip: rect(0 0 0 0)` en lugar de reutilizar `.ds-visually-hidden` de `control.css`.
  - `Icon.svelte`: `line-height: 0` y `100%` en el SVG.

  Son constantes geométricas o de utilidad, no valores de diseño, pero no salen de tokens.
- **Textos por defecto en español dentro de componentes:** `Column` genera `"{count} tarjeta(s)"` si no se pasa `countLabel`, y `Dialog` usa `closeLabel="Cerrar"`. Ligan los componentes a un idioma y a un dominio ("tarjetas").
- **Pares usados que no están en `contrast-pairs.json`:**
  - `priority.*` / `surface.raised`: la franja de la tarjeta limita por dentro con el interior de la tarjeta; solo se valida contra `status.*.surface`.
  - `status.*.accent` / `background`: la franja superior de la columna limita por arriba con la página; el par listado (`accent` / `status.*.surface`) no corresponde a una superficie adyacente (debajo de la franja está la cabecera `tint`, que sí está listada).
  - `tag.*.fg` sobre `surface.hover`, `surface.active` y `action.tint-active` (iconos del chip en hover y pulsado).
  - El borde del control en hover y el ChevronDown del select usan `text.secondary` sobre `surface.raised` como indicador (`ui`). Cumplen por el par de texto equivalente (7.58 / 8.81), pero no figuran como `ui`.
  - `focus` / `action.tint-active`: anillo de foco de la opción elegida de MenuButton (5.10 / 5.73, calculado aquí).

  Calcularlos y añadirlos es tarea de `design-builder`; aquí quedan como **no verificados**.
- **Márgenes de contraste mínimos:** `status.paused.accent` / `status.paused.tint` (3.11) en claro, y `priority.medium` sobre `status.*.surface` (3.27–3.40) y `status.paused.accent` / `status.paused.surface` (3.35) en claro cumplen por poco; cualquier ajuste de esos tonos puede romperlos. `action.primary` / `action.tint-active` (marca Check) queda en 4.16 en oscuro.
- **Descripciones desactualizadas en `contrast-pairs.json`:** los pares sobre `surface.base` siguen descritos como "columna" ("texto sobre columna/panel", "anillo de foco sobre columna"), pero `Column` usa ahora `status.*.surface`.
- **Tokens sin uso en componentes:** `appbar.*` y `appbar.accent-width` solo los usa la demo (no hay componente de barra superior). `typography.family.mono` no lo usa ningún componente. `display` y `heading` solo los usa la demo.
- **Botones de solo icono sin etiqueta forzada:** `Button` con `icon` y sin `children` no exige `aria-label` en tipos ni en tiempo de ejecución; depende de la disciplina de quien lo use.
- **Iconos fijos en Alert y Column:** no se pueden sustituir ni quitar por props (a diferencia de Badge, Chip y Button).
- **Franja de prioridad con esquinas redondeadas:** `Card` aplica un `border-top` de 4px sobre un `border-radius` de 20px, así que la franja se curva y se estrecha en las esquinas hacia el borde lateral de 1px. Resultado visual no verificado en navegador.
- **Recorte en Column:** la sección tiene `overflow: hidden` (para sus esquinas redondeadas), así que la sombra `lg` y el giro de `dragging` de una tarjeta pueden recortarse en los bordes de la columna. El cuerpo ya no tiene scroll propio (corregido el 2026-10-12 en WI-AC-049). No verificado en navegador.
- **Fondo del diálogo:** `::backdrop` usa `var(--ds-color-overlay)`. La herencia de variables CSS en `::backdrop` solo existe en navegadores recientes (aproximadamente 2023–2024 en adelante); en anteriores el fondo queda sin color. No verificado en navegador.
- **La demo usa multiplicadores escritos:** `demo/App.svelte` usa `* 1.5`, `* 4` y `* 5` sobre tokens para anchos de maquetación. Solo afecta a la página de demo, no a los componentes.
- **Comportamiento de Chip con `selected` sin bind:** si se pasa `selected` sin `bind:` ni actualización desde `onchange`, el chip cambia su estado interno al pulsarlo y puede quedar desincronizado del valor del padre.
- **Zona táctil del título de Card:** el botón del título no tiene un mínimo de 44px. La zona clicable es toda la tarjeta por ratón o táctil, pero la del botón enfocable por sí solo depende del tamaño del texto.
- **`pnpm-workspace.yaml` residual:** `design-system/` usa npm, pero conserva `pnpm-workspace.yaml` (`allowBuilds: esbuild`), que solo tiene efecto con pnpm.
- **Dependencia instalada sin el script de esbuild:** `npm install` avisó de que el `postinstall` de `esbuild@0.25.12` no está aprobado (`allowScripts`). El build de la demo funciona igualmente, pero el aviso seguirá apareciendo.
