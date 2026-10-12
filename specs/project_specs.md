# Objetivo del proyecto
Una app web solo de cliente (sin backend) en la que una persona gestiona varios proyectos de apps, cada uno con un tablero kanban de tarjetas tipadas, con persistencia local automática, archivado y exportación/importación en JSON, de modo que todos los Acceptance Checks de este documento pasen.

## Stack
Web solo de cliente — TypeScript + Svelte 5 + Vite (sin plantilla base en `specs/templates/`; reglas definidas desde cero en la entrevista, ver D-009).

## Reglas base de stack

### Web cliente (TypeScript + Svelte)
> No existe plantilla para este stack. Estas reglas se acordaron con el usuario (D-009, D-011, D-021) y son contexto persistente para `builder` y `qa`.

- **Lenguaje**: TypeScript con `strict: true`. Sin `any` implícito.
- **Framework de UI**: Svelte 5 (runes) como SPA. No se usa SvelteKit.
- **Build y servidor de desarrollo**: Vite.
- **Sin backend**: la app no realiza peticiones de red para guardar ni leer datos. Todo vive en el navegador.
- **Persistencia**: IndexedDB a través de la librería `idb`. Guardado automático e inmediato tras cada cambio; no existe botón "Guardar".
- **Sincronización entre pestañas**: los cambios guardados en una pestaña se propagan a las demás pestañas abiertas de la app sin recargar. Ante ediciones concurrentes, gana el último cambio guardado.
- **Arrastrar y soltar**: `svelte-dnd-action`, operable con ratón, táctil y teclado.
- **Estilos**: estilos con ámbito de componente que usan exclusivamente las variables `--ds-*` del sistema de diseño (ver "Sistema de diseño" y D-015). Los componentes de UI se importan desde `design-system/components`. Sin Tailwind.
- **Iconos**: Lucide a través de `@lucide/svelte` (dependencia de la app y `peerDependency` del sistema de diseño), importados icono a icono (`@lucide/svelte/icons/<nombre>`) y mostrados con el componente `Icon` o con el prop `icon` de `Button`, `Badge` y `Chip`. Nunca SVG escritos a mano (D-021).
- **Tipografía**: Plus Jakarta Sans con `@fontsource-variable/plus-jakarta-sans`, importada una vez en el punto de entrada junto a `tokens.css`. Inter deja de usarse (D-021).
- **Gestor de paquetes**: npm.
- **Tests unitarios y de componentes**: Vitest + `@testing-library/svelte`.
- **Tests end-to-end**: Playwright.
- **Idioma de la interfaz**: español.
- **Dispositivos**: escritorio y móvil. En móvil las columnas del tablero se desplazan horizontalmente dentro del tablero.
- **Formato de intercambio**: JSON con un campo de versión de formato, para permitir migraciones futuras.

### Sistema de diseño
> Importado de `specs/templates/design_system.md` (generado por `design-extractor` el 2026-10-12). Sustituye por completo a la versión del 2026-10-10 (paleta ámbar, Inter, sin iconos ni `Column`/`DropPlaceholder`). Contenido copiado sin cambios; solo se han bajado los encabezados de nivel (`#` → `####`, `##` → `####`, `###` → `#####`) para encajar en esta sección. Donde este sistema de diseño y la regla "Estilos" de arriba se solapen, los valores de color, tipografía, espaciado, tamaños, sombras y movimiento salen SIEMPRE de las variables `--ds-*`.

#### Design System (origen)

> Generado por `design-extractor` a partir del estado real de `design-system/` (2026-10-12).
> Fuente de verdad: `design-system/tokens/*.json`. `tokens/tokens.css` es un archivo generado
> (`node design-system/scripts/build-tokens.mjs --check` → "tokens.css al día.").
> Variables CSS: `--ds-<prefijo>-<ruta>`. Los prefijos son `color` (colors.json), `font` (typography.json, sin el nivel `scale`) y `shadow` (shadows.json); el resto de archivos no lleva prefijo. Ejemplos: `colors.action.primary` → `--ds-color-action-primary`, `sizes.control.hit-area` → `--ds-control-hit-area`, `sizes.icon.size.md` → `--ds-icon-size-md`.
> **Modos:** los tokens con forma `{ light, dark }` generan su valor claro en `:root` y el oscuro en `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` y en `:root[data-theme="dark"]`. La app puede forzar un modo con `data-theme` en `<html>`.

#### Sintaxis detectada
**Svelte 5** (runes: `$props`, `$state`, `$derived`, `$effect`, `$bindable`, `$props.id()`, snippets, `<svelte:element>`) con `<script lang="ts">`. Hay 13 componentes `.svelte` en `design-system/components/*/`, un módulo JS de apoyo (`components/icon/category-icons.js`) y una hoja CSS global compartida (`components/shared/control.css`). El punto de entrada es `components/index.js`.
- Dependencias declaradas como `peerDependencies` en `design-system/package.json`: `svelte ^5.20` (`$props.id()` la requiere) y `@lucide/svelte ^1.55` (iconos).
- Iconos: [Lucide](https://lucide.dev) vía `@lucide/svelte`, importados icono a icono (`@lucide/svelte/icons/<nombre>`).
- Gestor de paquetes: npm (`design-system/package-lock.json`; ya no hay `pnpm-lock.yaml`).
- Página de demo con Vite en `design-system/demo/` (`npm run demo`; `npm run demo:build` genera `design-system/dist-demo/`, ignorado en git).

#### Paleta de colores
Origen: `tokens/colors.json`. Formato: claro / oscuro. Paleta "índigo" sobre neutros fríos (slate).

| Token | Variable CSS | Claro | Oscuro | Uso recomendado (según el código y los pares de contraste) |
|---|---|---|---|---|
| `background` | `--ds-color-background` | `#F8FAFC` | `#0F172A` | Fondo de página |
| `surface.sunken` | `--ds-color-surface-sunken` | `#E9EEF5` | `#162033` | Fondo de `Column` (más hundido que la página para que destaquen las tarjetas) |
| `surface.base` | `--ds-color-surface-base` | `#F1F5F9` | `#1E293B` | Paneles. Fondo de badge neutral, de controles deshabilitados y de botones deshabilitados |
| `surface.raised` | `--ds-color-surface-raised` | `#FFFFFF` | `#243147` | Tarjeta, diálogo, alert, relleno de controles, button secondary, chip, contador de columna |
| `surface.hover` | `--ds-color-surface-hover` | `#E2E8F0` | `#334155` | Hover de button secondary/ghost y chip |
| `surface.active` | `--ds-color-surface-active` | `#CBD5E1` | `#475569` | Pulsado de button secondary/ghost y chip |
| `text.primary` | `--ds-color-text-primary` | `#0F172A` | `#F8FAFC` | Texto base, etiquetas de campo, texto de controles |
| `text.secondary` | `--ds-color-text-secondary` | `#475569` | `#CBD5E1` | Descripción y pie de tarjeta, ayuda de campo, placeholder, borde de control en hover, flecha del select, badge neutral, DropPlaceholder en reposo |
| `text.disabled` | `--ds-color-text-disabled` | `#94A3B8` | `#64748B` | Texto de controles, botones, chips y etiquetas deshabilitados |
| `border.default` | `--ds-color-border-default` | `#E2E8F0` | `#334155` | Bordes decorativos (tarjeta, diálogo, alert) y borde en disabled |
| `border.strong` | `--ds-color-border-strong` | `#64748B` | `#94A3B8` | Borde de controles, chip y button secondary; borde punteado de DropPlaceholder en reposo (≥3:1) |
| `action.primary` | `--ds-color-action-primary` | `#4F46E5` | `#8B93FA` | Relleno de button primary, texto y borde de button outline, borde de chip seleccionado, borde de Column `dropTarget` y de DropPlaceholder activo |
| `action.primary-hover` | `--ds-color-action-primary-hover` | `#4338CA` | `#A5B4FC` | Hover de button primary |
| `action.primary-active` | `--ds-color-action-primary-active` | `#3730A3` | `#C7D2FE` | Pulsado de button primary |
| `action.on-primary` | `--ds-color-action-on-primary` | `#FFFFFF` | `#0F172A` | Texto sobre `action.primary*` |
| `action.tint` | `--ds-color-action-tint` | `#EEF2FF` | `#1E1B4B` | Fondo de outline en hover, de chip seleccionado y de DropPlaceholder activo |
| `action.tint-active` | `--ds-color-action-tint-active` | `#E0E7FF` | `#312E81` | Pulsado de outline y de chip seleccionado |
| `action.on-tint` | `--ds-color-action-on-tint` | `#3730A3` | `#C7D2FE` | Texto e icono sobre `action.tint*` |
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
| `status.todo.accent` / `.tint` / `.on-tint` | `--ds-color-status-todo-*` | `#64748B` / `#F1F5F9` / `#334155` | `#94A3B8` / `#1E293B` / `#E2E8F0` | Column `todo` (Sin empezar): franja e icono / fondo de cabecera / título y contador |
| `status.doing.*` | `--ds-color-status-doing-*` | `#2563EB` / `#DBEAFE` / `#1E40AF` | `#60A5FA` / `#172554` / `#BFDBFE` | Column `doing` (En curso) |
| `status.paused.*` | `--ds-color-status-paused-*` | `#EA580C` / `#FFEDD5` / `#9A3412` | `#FB923C` / `#431407` / `#FED7AA` | Column `paused` (En pausa) |
| `status.done.*` | `--ds-color-status-done-*` | `#15803D` / `#DCFCE7` / `#166534` | `#4ADE80` / `#052E16` / `#BBF7D0` | Column `done` (Finalizado) |
| `priority.high` | `--ds-color-priority-high` | `#DC2626` | `#F87171` | Franja superior de Card `priority="high"` |
| `priority.medium` | `--ds-color-priority-medium` | `#EA580C` | `#FB923C` | Franja de Card `priority="medium"` |
| `priority.low` | `--ds-color-priority-low` | `#4D7C0F` | `#A3E635` | Franja de Card `priority="low"` |
| `appbar.bg` | `--ds-color-appbar-bg` | `#FFFFFF` | `#1E293B` | Fondo de la barra superior (solo lo usa la demo; no hay componente) |
| `appbar.fg` | `--ds-color-appbar-fg` | `#0F172A` | `#F8FAFC` | Texto de la barra superior |
| `appbar.accent` | `--ds-color-appbar-accent` | `#4F46E5` | `#8B93FA` | Franja inferior de la barra superior |
| `focus` | `--ds-color-focus` | `#4F46E5` | `#A5B4FC` | Anillo de foco (y borde del control enfocado) |
| `overlay` | `--ds-color-overlay` | `rgba(15, 23, 42, 0.50)` | `rgba(0, 0, 0, 0.65)` | Fondo (`::backdrop`) del diálogo |

#### Tipografía
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
| `body` | 16px | 400 | 1.6 | 0 | Texto de controles, cuerpo del diálogo, button `lg`, tamaño del título de tarjeta |
| `label` | 14px | 500 | 1.4 | 0.1px | Botones, chips, etiquetas de campo, texto de alert, descripción de tarjeta, título de columna, texto de DropPlaceholder. Su peso se usa también en badge, contador de columna y error de campo |
| `caption` | 13px | 400 | 1.4 | 0.2px | Ayuda y error de campo, badge, pie de tarjeta, contador de columna |

#### Espaciado, radios y otras categorías

##### Espaciado (`tokens/spacing.json` → `spacing.*`)
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

##### Radios (`tokens/spacing.json` → `radii.*`)
| Token | Valor | Variable CSS | Uso en el código |
|---|---|---|---|
| `radii.small` | 8px | `--ds-radii-small` | Botón del título de la tarjeta (anillo de foco) |
| `radii.medium` | 12px | `--ds-radii-medium` | Botón, controles de formulario, alert |
| `radii.large` | 20px | `--ds-radii-large` | Tarjeta, diálogo, columna, DropPlaceholder |
| `radii.full` | 999px | `--ds-radii-full` | Badge, chip, contador de columna, spinner |

##### Tamaños (`tokens/sizes.json`)
| Token | Valor | Variable CSS | Uso en el código |
|---|---|---|---|
| `border.width.default` | 1px | `--ds-border-width-default` | Bordes de botón, control, chip, badge, tarjeta, diálogo y alert |
| `border.width.accent` | 4px | `--ds-border-width-accent` | Borde izquierdo de color del alert, franja de prioridad de la tarjeta, franja superior de la columna |
| `border.width.dashed` | 2px | `--ds-border-width-dashed` | Borde punteado de DropPlaceholder; borde (transparente / `action.primary` en `dropTarget`) de Column (ver Inconsistencias) |
| `focus-ring.width` | 2px | `--ds-focus-ring-width` | Anillo de foco. También el grosor del spinner y de la flecha del select (ver Inconsistencias) |
| `focus-ring.offset` | 2px | `--ds-focus-ring-offset` | Separación del anillo de foco |
| `spinner.size` | 18px | `--ds-spinner-size` | Spinner del botón en `loading` |
| `control.min-height.sm` | 36px | `--ds-control-min-height-sm` | Button `sm` (y su ancho mínimo si es solo icono), chip |
| `control.min-height.md` | 44px | `--ds-control-min-height-md` | Button `md`, input, textarea, select |
| `control.min-height.lg` | 52px | `--ds-control-min-height-lg` | Button `lg` (y su ancho mínimo si es solo icono) |
| `control.hit-area` | 44px | `--ds-control-hit-area` | Ancho mínimo del botón; zona táctil ampliada (`::after`) de button `sm` y chip; alto mínimo de la cabecera de Column |
| `control.press-scale` | 0.97 | `--ds-control-press-scale` | Escala al pulsar botón y chip |
| `control.chevron-size` | 8px | `--ds-control-chevron-size` | Flecha del select |
| `card.lift` | 2px | `--ds-card-lift` | Elevación de la tarjeta en hover (`translateY` negativo) |
| `card.drag-rotate` | 1.5deg | `--ds-card-drag-rotate` | Giro de la tarjeta mientras se arrastra |
| `card.description-lines` | 3 | `--ds-card-description-lines` | Líneas visibles de la descripción (`line-clamp`) |
| `dialog.max-width.sm` | 400px | `--ds-dialog-max-width-sm` | Diálogo `sm` |
| `dialog.max-width.md` | 560px | `--ds-dialog-max-width-md` | Diálogo `md` |
| `dialog.enter-scale` | 0.96 | `--ds-dialog-enter-scale` | Escala inicial de la animación de entrada del diálogo |
| `column.width` | 300px | `--ds-column-width` | Ancho fijo de Column (`flex: 0 0`, con `max-width: 100%`) |
| `column.body-min-height` | 120px | `--ds-column-body-min-height` | Alto mínimo del cuerpo de Column y de DropPlaceholder |
| `icon.size.sm` | 14px | `--ds-icon-size-sm` | Icono en badge, chip y pie de tarjeta (demo) |
| `icon.size.md` | 16px | `--ds-icon-size-md` | Icono por defecto: Button `sm`/`md`, cabecera de Column |
| `icon.size.lg` | 20px | `--ds-icon-size-lg` | Icono de Button `lg` y de Alert |
| `icon.size.xl` | 28px | `--ds-icon-size-xl` | Icono de DropPlaceholder |
| `icon.stroke-width` | 2px | `--ds-icon-stroke-width` | Grosor de trazo de los iconos Lucide (sobrescribe el atributo del SVG) |
| `appbar.accent-width` | 3px | `--ds-appbar-accent-width` | Franja inferior de la barra superior (solo demo) |

##### Movimiento (`tokens/motion.json`)
| Token | Valor | Variable CSS | Uso en el código |
|---|---|---|---|
| `duration.fast` | 120ms | `--ds-duration-fast` | Transiciones de color y borde (botón, chip, control, DropPlaceholder) |
| `duration.base` | 200ms | `--ds-duration-base` | Pulsación de botón y chip, sombra y elevación de tarjeta, borde de Column, entrada del fondo del diálogo |
| `duration.slow` | 300ms | `--ds-duration-slow` | Entrada del diálogo |
| `duration.spinner` | 700ms | `--ds-duration-spinner` | Una vuelta del spinner |
| `duration.spinner-reduced` | 2800ms | `--ds-duration-spinner-reduced` | Spinner con `prefers-reduced-motion` |
| `easing.standard` | `cubic-bezier(0.2, 0, 0, 1)` | `--ds-easing-standard` | Cambios de color, borde y sombra; fondo del diálogo |
| `easing.emphasized` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | `--ds-easing-emphasized` | Pulsación, elevación de tarjeta, entrada del diálogo (con rebote leve) |
| `easing.linear` | `linear` | `--ds-easing-linear` | Rotación del spinner |

##### Sombras (`tokens/shadows.json`)
| Token | Variable CSS | Claro | Oscuro | Uso en el código |
|---|---|---|---|---|
| `sm` | `--ds-shadow-sm` | `0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.10)` | `0 1px 2px rgba(0, 0, 0, 0.40), 0 1px 3px rgba(0, 0, 0, 0.30)` | Tarjeta en reposo, alert, barra de la demo |
| `md` | `--ds-shadow-md` | `0 4px 8px -2px rgba(15, 23, 42, 0.10), 0 2px 4px -2px rgba(15, 23, 42, 0.06)` | `0 4px 8px -2px rgba(0, 0, 0, 0.50), 0 2px 4px -2px rgba(0, 0, 0, 0.30)` | Tarjeta interactiva en hover |
| `lg` | `--ds-shadow-lg` | `0 12px 24px -6px rgba(15, 23, 42, 0.18), 0 4px 8px -4px rgba(15, 23, 42, 0.08)` | `0 12px 24px -6px rgba(0, 0, 0, 0.60), 0 4px 8px -4px rgba(0, 0, 0, 0.40)` | Tarjeta arrastrándose, diálogo |

#### Componentes disponibles

Todos se importan desde `components/index.js`: `Alert`, `Badge`, `Button`, `Card`, `Chip`, `Column`, `Dialog`, `DropPlaceholder`, `Field`, `Icon`, `Input`, `Select` y `Textarea`, más la constante `CATEGORY_ICONS`. Ninguno acepta la prop `class`.

##### Icon
- **Sintaxis/archivo:** Svelte 5, `design-system/components/icon/Icon.svelte`. Exporta los tipos `IconComponent` (`Component<any>`) e `IconSize`.
- **Variantes:** `size`: `sm`, `md` (por defecto), `lg` o `xl` → `icon.size.*`.
- **Interfaz de uso / API:** props `icon` (obligatoria: un componente de `@lucide/svelte`), `size` y `label`.
- **Reglas de uso:**
  - Renderiza un `<span class="ds-icon">` con el SVG dentro (el SVG lleva siempre `aria-hidden="true"` y `focusable="false"`).
  - Sin `label`: el `span` lleva `aria-hidden="true"` (decorativo). Con `label`: `role="img"` y `aria-label`.
  - El color es `currentColor` (hereda del texto). El tamaño y el trazo salen de los tokens; los atributos `width`/`height`/`stroke-width` del SVG se sobrescriben por CSS.
  - Importar los iconos icono a icono: `import Calendar from '@lucide/svelte/icons/calendar'`.
- **`CATEGORY_ICONS`** (`components/icon/category-icons.js`): `{ feature: Sparkles, improvement: TrendingUp, bugfix: Bug, technical: Wrench }`. Lo usan Badge y Chip como iconos por defecto.

##### Button
- **Sintaxis/archivo:** Svelte 5, `design-system/components/button/Button.svelte`.
- **Variantes:**
  - `variant`: `primary` (por defecto), `secondary`, `outline`, `ghost` o `danger`.
  - `size`: `sm`, `md` (por defecto) o `lg`.
  - Solo icono: cuando hay `icon` y no hay `children` (clase `ds-btn--icon-only`, cuadrado).
- **Interfaz de uso / API:**
  - Props propias: `variant`, `size`, `loading` (por defecto `false`), `block` (por defecto `false`), `icon` (componente Lucide) y `children` (snippet).
  - Props nativas: `type` (por defecto `button`), `disabled` y `onclick`, más cualquier atributo de `<button>` salvo `class`.
  - Renderiza un `<button>` nativo con `.ds-btn__spinner` (`aria-hidden`) y `.ds-btn__label` (icono + texto). El icono es `md`, o `lg` en `size="lg"`, y decorativo.
- **Reglas de uso:**
  - `loading` pone `aria-busy="true"` y `aria-disabled="true"`, oculta la etiqueta (`visibility: hidden`, incluido el icono) y muestra el spinner. No usa `disabled`, así que el botón conserva el foco.
  - Durante `loading` los clics se anulan (`preventDefault` + `stopImmediatePropagation`) y no se llama a `onclick`.
  - `disabled` usa el atributo nativo.
  - `aria-label` es obligatorio si el botón no tiene texto: `<Button variant="ghost" size="sm" icon={X} aria-label="Cerrar" />`.
  - `block` ocupa todo el ancho.

##### Input
- **Sintaxis/archivo:** Svelte 5, `design-system/components/input/Input.svelte`.
- **Variantes:** ninguna. El estado depende de `error`/`disabled`.
- **Interfaz de uso / API:**
  - Props: `label` (obligatoria), `value` (bindable, por defecto `''`), `hint`, `error`, `hideLabel`, `required`, `disabled`, `id` y `type` (por defecto `text`).
  - Acepta cualquier atributo de `<input>` salvo `value` y `class`.
- **Reglas de uso:** se construye sobre `Field`. Con `error`, el control recibe `.ds-control--error` y `aria-invalid="true"`.

##### Textarea
- **Sintaxis/archivo:** Svelte 5, `design-system/components/textarea/Textarea.svelte`.
- **Variantes:** ninguna.
- **Interfaz de uso / API:**
  - Props: las mismas que Input, más `rows` (por defecto 4).
  - Acepta cualquier atributo de `<textarea>` salvo `value` y `class`.
- **Reglas de uso:** se construye sobre `Field` y solo se puede redimensionar en vertical (`resize: vertical`).

##### Select
- **Sintaxis/archivo:** Svelte 5, `design-system/components/select/Select.svelte`. Exporta el tipo `SelectOption = { value: string; label: string; disabled?: boolean }`.
- **Variantes:** ninguna.
- **Interfaz de uso / API:**
  - Props: `label` y `options: SelectOption[]` (obligatorias), `value` (bindable, por defecto `''`), `placeholder`, `hint`, `error`, `hideLabel`, `required`, `disabled` e `id`.
  - Acepta cualquier atributo de `<select>` salvo `value`, `class` y `multiple`.
- **Reglas de uso:**
  - Es un `<select>` nativo con `appearance: none` y una flecha CSS (`::after`) en `currentColor`: `text.secondary`, o `text.disabled` si está deshabilitado. No usa icono Lucide.
  - `placeholder` añade una primera opción con valor `''`, deshabilitada.

##### Field
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

##### Dialog
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

##### Card
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

##### Column
- **Sintaxis/archivo:** Svelte 5, `design-system/components/column/Column.svelte`. Exporta el tipo `ColumnStatus`. Renderiza un `<section aria-labelledby>`.
- **Variantes / estados:**
  - `status`: `todo` (por defecto), `doing`, `paused` o `done` → `status.*` en la franja superior, el icono, el fondo de cabecera, el título y el contador.
  - Iconos por estado (decorativos): `todo` CircleDashed, `doing` CircleDot, `paused` CirclePause, `done` CircleCheck.
  - `dropTarget`: borde de `border.width.dashed` en `action.primary` (sólido, no punteado) mientras se arrastra una tarjeta encima.
- **Interfaz de uso / API:**
  - Props: `title` (obligatorio), `status`, `count`, `countLabel`, `headingLevel` (2–6, por defecto 2), `dropTarget` (por defecto `false`), y los snippets `actions` (opcional, en la cabecera) y `children` (obligatorio, cuerpo).
  - El contador se muestra solo si `count` está definido. El número lleva `aria-hidden` y va acompañado de un texto oculto: `countLabel` o, por defecto, `"{count} tarjeta"` / `"{count} tarjetas"`.
- **Reglas de uso:**
  - Ancho fijo `column.width`; el cuerpo tiene alto mínimo `column.body-min-height` y `gap` de `spacing.3`, sin `overflow` propio: la columna crece con sus tarjetas (un cuerpo con scroll hace que `svelte-dnd-action` acumule bucles de autodesplazamiento). La sección es `position: relative`, que contiene el texto oculto del contador.
  - El arrastre no está implementado: la app pone su propia lista (p. ej. `svelte-dnd-action`) dentro del cuerpo y controla `dropTarget`.
  - Las acciones de cabecera son Buttons (la demo usa `Button variant="ghost" size="sm" icon={Plus}` con `aria-label`).

##### DropPlaceholder
- **Sintaxis/archivo:** Svelte 5, `design-system/components/drop-placeholder/DropPlaceholder.svelte`.
- **Variantes / estados:**
  - Reposo: borde punteado `border.strong`, fondo transparente, texto `text.secondary`, icono Inbox.
  - `active`: borde `action.primary`, fondo `action.tint`, texto `action.on-tint`, icono ArrowDownToLine.
- **Interfaz de uso / API:** props `active` (por defecto `false`) y `label` (opcional).
- **Reglas de uso:**
  - No es interactivo. Sin `label`, todo el bloque lleva `aria-hidden="true"`.
  - Sirve como hueco donde caerá la tarjeta y como estado vacío de una columna.

##### Badge
- **Sintaxis/archivo:** Svelte 5, `design-system/components/badge/Badge.svelte`. Exporta el tipo `BadgeTone`.
- **Variantes** (`tone`):
  - `neutral` (por defecto): `surface.base` con `text.secondary`.
  - `feature`, `improvement`, `bugfix` y `technical`: relleno `tag.*.bg` con texto `tag.*.fg`, e icono por defecto de `CATEGORY_ICONS`.
  - `danger`, `warning`, `success` e `info`: contorno y texto del color de feedback, sin relleno ni icono por defecto.
- **Interfaz de uso / API:** props `tone`, `icon` (componente Lucide; `null` quita el icono por defecto) y `children` (snippet obligatorio). Renderiza un `<span>` no interactivo; el icono es `sm`, decorativo y del color del texto.
- **Reglas de uso:** el significado va en el texto. Las variantes de feedback están validadas sobre `surface.raised`, según el comentario del componente.

##### Chip
- **Sintaxis/archivo:** Svelte 5, `design-system/components/chip/Chip.svelte`.
- **Variantes / estados:**
  - Normal y seleccionado: `action.tint` con borde `action.primary`, texto `action.on-tint` y icono Check (Lucide).
  - `tone` opcional (`feature`, `improvement`, `bugfix` o `technical`): muestra el icono de `CATEGORY_ICONS` en `tag.*.fg`. En `disabled`, el icono hereda `text.disabled`.
- **Interfaz de uso / API:**
  - Props: `selected` (bindable, por defecto `false`), `tone`, `icon` (sustituye al de la categoría), `disabled`, `onchange(selected)` y `children` (snippet obligatorio).
  - Renderiza `<button type="button" aria-pressed>`.
- **Reglas de uso:** al pulsarlo invierte `selected` y llama a `onchange`. Está pensado para filtros de selección múltiple, agrupados por la app con `role="group"` en la demo.

##### Alert
- **Sintaxis/archivo:** Svelte 5, `design-system/components/alert/Alert.svelte`.
- **Variantes:** `tone` puede ser `danger`, `warning`, `success` o `info` (por defecto `info`).
- **Interfaz de uso / API:** props `tone`, `title`, `children` y `actions` (snippets).
- **Reglas de uso:**
  - `danger` y `warning` llevan `role="alert"`; `success` e `info` llevan `role="status"`.
  - Icono `lg` por tono, decorativo y en el color del tono: CircleAlert, TriangleAlert, CircleCheck, Info. No se puede cambiar ni quitar.
  - El fondo es `surface.raised` con un borde izquierdo de `border.width.accent` del color del tono. El título va en el color del tono y el cuerpo en `text.primary`.

#### Conformidad de accesibilidad

Resultado de `node design-system/scripts/check-contrast.mjs`: **los 174 pares (87 × 2 modos) cumplen WCAG AA**. Los ratios se indican como claro / oscuro. Los estados disabled están exentos por WCAG y no se listan. Los iconos son decorativos (`aria-hidden`) salvo un `Icon` con `label`; sus colores cuentan como `ui` (3:1).

Compilación: `npm run demo:build` en `design-system/` terminó con "✓ built" y sin avisos de Svelte (ejecutado en esta sesión por `design-builder`). El comportamiento en navegador **no está verificado**.

##### Button
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
| action.primary / surface.sunken | outline dentro de columna | 5.39 | 5.94 | 4.5 | Cumple |
| action.primary / surface.raised | outline sobre tarjeta/diálogo (texto y borde) | 6.29 | 4.77 | 4.5 | Cumple |
| action.on-tint / action.tint | outline :hover | 8.88 | 10.72 | 4.5 | Cumple |
| action.on-tint / action.tint-active | outline :active | 8.06 | 7.66 | 4.5 | Cumple |
| action.primary / action.tint | borde outline :hover | 5.62 | 5.83 | 3 | Cumple |
| feedback.on-danger / feedback.danger | danger | 6.47 | 6.45 | 4.5 | Cumple |
| feedback.on-danger / feedback.danger-hover | danger :hover/:active | 8.31 | 9.41 | 4.5 | Cumple |
| text.primary / status.{todo · doing · paused · done}.tint | ghost en cabecera de columna | 16.30 · 14.63 · 15.58 · 16.26 | 13.98 · 14.04 · 14.96 · 14.25 | 4.5 | Cumple |
| focus / background · surface.base · surface.raised · surface.sunken | anillo de foco | 6.01 · 5.74 · 6.29 · 5.39 | 8.96 · 7.34 · 6.56 · 8.18 | 3 | Cumple |
| focus / status.{todo · doing · paused · done}.tint | foco en cabecera de columna | 5.74 · 5.15 · 5.49 · 5.73 | 7.34 · 7.37 · 7.85 · 7.48 | 3 | Cumple |

  El icono hereda el color del texto de cada variante, así que comparte sus ratios.
- **Navegación por teclado / zona táctil:**
  - Teclado: presente, con `<button>` nativo y foco visible.
  - Zona táctil: presente. 44px de alto y ancho mínimo en md; en `sm` (36px) un `::after` amplía la zona a 44×44px, también en solo icono.
  - Texto alternativo: los botones de solo icono necesitan `aria-label` (no se impone en código; ver Inconsistencias).
  - `prefers-reduced-motion`: sin transiciones ni escala; spinner a `duration.spinner-reduced`.

##### Input · Textarea · Select · Field
- **Estados implementados en el código real:**
  - focus: `:focus-visible`, con borde y outline `focus`.
  - hover: borde `text.secondary`.
  - error: borde `feedback.danger`, mensaje con `aria-invalid` y `aria-describedby`.
  - disabled: `surface.base`, `border.default` y `text.disabled`; la etiqueta pasa a `text.disabled`.
  - loading: no aplica.
- **Contraste WCAG AA:**

| Par | Dónde | Claro | Oscuro | Mín. | Resultado |
|---|---|---|---|---|---|
| text.primary / surface.raised | texto del control | 17.85 | 12.50 | 4.5 | Cumple |
| text.secondary / surface.raised | placeholder, ayuda | 7.58 | 8.81 | 4.5 | Cumple |
| border.strong / surface.raised · background · surface.base | borde del control | 4.76 · 4.55 · 4.34 | 5.10 · 6.96 · 5.71 | 3 | Cumple |
| feedback.danger / surface.raised · background | error de campo, asterisco, borde de error | 6.47 · 6.18 | 4.73 · 6.45 | 4.5 | Cumple |
| text.primary / background · surface.raised | etiqueta | 17.06 · 17.85 | 17.06 · 12.50 | 4.5 | Cumple |
| text.secondary / surface.raised | flecha del select (uso ui) | 7.58 | 8.81 | 3 | Cumple (valores del par de texto equivalente; no listado como `ui`) |
| text.secondary / surface.raised | borde del control en hover (uso ui) | 7.58 | 8.81 | 3 | Cumple (ídem) |

- **Navegación por teclado / zona táctil:**
  - Teclado: presente, con controles nativos y la etiqueta asociada por `for`/`id`.
  - Zona táctil: presente, con altura mínima de 44px.
  - `prefers-reduced-motion`: sin transiciones.

##### Dialog
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

##### Card
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
| priority.high / surface.sunken | franja Alta sobre columna | 4.14 | 5.89 | 3 | Cumple |
| priority.medium / surface.sunken | franja Media sobre columna | 3.05 | 7.20 | 3 | Cumple (margen mínimo en claro) |
| priority.low / surface.sunken | franja Baja sobre columna | 4.28 | 10.81 | 3 | Cumple |
| priority.* / surface.raised | franja junto al interior de la tarjeta | — | — | 3 | **No verificado** (par no listado) |

- **Navegación por teclado / zona táctil:**
  - Teclado: presente si es interactiva (botón del título). El clic en el resto de la tarjeta es solo un atajo de ratón o táctil.
  - Zona táctil: toda la tarjeta. El botón del título por sí solo no garantiza 44px.
  - La prioridad no depende solo del color si la app la muestra también en texto.

##### Column
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
| status.{todo · doing · paused · done}.accent / surface.sunken | franja superior (par listado) | 4.08 · 4.43 · 3.05 · 4.30 | 6.36 · 6.41 · 7.20 · 9.35 | 3 | Cumple |
| status.*.accent / background | franja superior contra la página | — | — | 3 | **No verificado** (par no listado; ver Inconsistencias) |
| text.primary · text.secondary / surface.sunken | texto en el cuerpo | 15.31 · 6.50 | 15.58 · 10.98 | 4.5 | Cumple |
| action.primary / surface.sunken | borde `dropTarget` | 5.39 | 5.94 | 3 | Cumple |
| action.primary / background | borde `dropTarget` contra la página | 6.01 | 6.50 | 3 | Cumple (par listado como texto) |

- **Navegación por teclado / zona táctil:**
  - Estructura: `<section>` etiquetada por el encabezado (`h2`–`h6`). El contador tiene texto para lectores de pantalla.
  - Teclado y zona táctil: dependen de los Buttons de `actions` (44px con el `::after` de `sm`).
  - El estado se comunica por el título; el color y el icono son refuerzos.

##### DropPlaceholder
- **Estados implementados en el código real:** reposo y `active`. No interactivo. Sin `label`, `aria-hidden`. `prefers-reduced-motion`: sin transiciones.
- **Contraste WCAG AA:**

| Par | Dónde | Claro | Oscuro | Mín. | Resultado |
|---|---|---|---|---|---|
| text.secondary / surface.sunken | texto e icono en reposo | 6.50 | 10.98 | 4.5 | Cumple |
| border.strong / surface.sunken | borde punteado en reposo | 4.08 | 6.36 | 3 | Cumple |
| action.on-tint / action.tint | texto e icono activo | 8.88 | 10.72 | 4.5 | Cumple |
| action.primary / action.tint | borde punteado activo | 5.62 | 5.83 | 3 | Cumple |

  Fuera de una `Column` (sobre `background` o `surface.raised`) los pares en reposo no están listados: **no verificado** en esas superficies.
- **Navegación por teclado / zona táctil:** no aplica (no interactivo).

##### Badge
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

  Las variantes de feedback sobre `surface.base`, `surface.sunken` o `background` (por ejemplo, un badge colocado directamente en una columna) **no están verificadas**: esos pares no están en `contrast-pairs.json`.
- **Navegación por teclado / zona táctil:** no aplica (no interactivo).

##### Chip
- **Estados implementados en el código real:**
  - focus: `:focus-visible`.
  - hover y active: escala al pulsar.
  - seleccionado: relleno, borde e icono Check, con `aria-pressed`.
  - disabled: `surface.base`, `border.default` y `text.disabled` (también el icono).
  - loading y error: no aplican.
- **Contraste WCAG AA:**

| Par | Dónde | Claro | Oscuro | Mín. | Resultado |
|---|---|---|---|---|---|
| text.primary / surface.raised | normal | 17.85 | 12.50 | 4.5 | Cumple |
| border.strong / background · surface.base · surface.sunken | borde normal | 4.55 · 4.34 · 4.08 | 6.96 · 5.71 · 6.36 | 3 | Cumple |
| action.on-tint / action.tint | seleccionado (texto y Check) | 8.88 | 10.72 | 4.5 | Cumple |
| action.on-tint / action.tint-active | seleccionado :active | 8.06 | 7.66 | 4.5 | Cumple |
| action.primary / action.tint | borde seleccionado | 5.62 | 5.83 | 3 | Cumple |
| tag.*.fg / surface.raised | icono de categoría | 7.13–8.98 | 9.04–10.79 | 3 | Cumple |
| tag.*.fg / action.tint | icono de categoría seleccionado | 6.38–8.03 | 11.05–13.19 | 3 | Cumple |
| tag.*.fg / surface.hover · surface.active · action.tint-active | icono en hover / pulsado | — | — | 3 | **No verificado** (pares no listados) |

- **Navegación por teclado / zona táctil:**
  - Teclado: presente, con `<button>` nativo y `aria-pressed`.
  - Zona táctil: presente. Mide 36px de alto y un `::after` amplía la zona a 44×44px.
  - `prefers-reduced-motion`: sin transiciones ni escala.

##### Alert
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

##### Icon
- **Estados implementados en el código real:** no interactivo. Decorativo por defecto; con `label`, `role="img"`.
- **Contraste:** hereda `currentColor`; el ratio es el del texto o color del contenedor.
- **Texto alternativo:** obligatorio pasar `label` cuando el icono transmite información que no está en el texto adyacente.

#### Reglas de uso para el rol builder en apps que importen esta librería
- Nunca hardcodear valores de color, espaciado, tipografía, radios, sombras, tamaños de icono ni duraciones: siempre desde los tokens, a través de las variables `--ds-*` de `tokens/tokens.css`.
- Importar `design-system/tokens/tokens.css` una vez, a nivel global, en el punto de entrada de la app, junto con las fuentes. La app debe instalar `@fontsource-variable/plus-jakarta-sans` (y `@fontsource/jetbrains-mono` si usa `family.mono`) e importarlas; Inter ya no es necesaria.
- Instalar `@lucide/svelte` (`peerDependency`) en la app. Importar los iconos icono a icono (`@lucide/svelte/icons/<nombre>`) y mostrarlos con `Icon` (o el prop `icon` de Button, Badge y Chip), nunca como SVG suelto.
- Importar los componentes desde `design-system/components/index.js`. Requieren Svelte `^5.20` y los compila el plugin de Svelte de la app.
- Usar npm (no pnpm) para instalar dependencias.
- Modo de color: sin `data-theme` se sigue al sistema. Para forzarlo, poner `data-theme="light"` o `"dark"` en `<html>`.
- Usar `Button`, `Input`, `Textarea`, `Select`, `Dialog`, `Card`, `Badge`, `Chip`, `Alert`, `Column` y `DropPlaceholder` en lugar de estilizar elementos nativos a mano. Para un control propio, envolverlo en `Field` y aplicar `ds-control` / `ds-control--error`.
- Botones de solo icono: `<Button icon={…} aria-label="…" />`; el `aria-label` es obligatorio.
- Tablero: una `Column` por estado (`todo`, `doing`, `paused`, `done`) con su `count`, y la lista arrastrable dentro del cuerpo. `dropTarget` y la sombra de arrastre (`DropPlaceholder active`) los controla la app.
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

#### Inconsistencias detectadas
- **El token de foco se usa como grosor genérico:** el spinner de Button (`border`) y la flecha de Select (`border-right`/`border-bottom`) usan `--ds-focus-ring-width`, que semánticamente es el grosor del anillo de foco. Si cambia el foco, cambian también el spinner y la flecha.
- **`border.width.dashed` usado para un borde sólido:** `Column` usa `--ds-border-width-dashed` como grosor de su borde transparente / `dropTarget`, que es sólido. Si cambia el grosor del punteado de DropPlaceholder, cambia también el de la columna.
- **`column.body-min-height` reutilizado fuera de Column:** `DropPlaceholder` toma su alto mínimo de `--ds-column-body-min-height`.
- **Valores escritos en componentes que no salen de tokens:**
  - `Select.svelte`: `translateY(-75%) rotate(45deg)` en la flecha.
  - `Button.svelte`: `rotate(360deg)` en la animación del spinner.
  - `control.css`: `opacity: 1` en `::placeholder`, y `1px`, `-1px` y `clip: rect(0, 0, 0, 0)` en `.ds-visually-hidden`.
  - `Column.svelte`: `.ds-column__sr` repite el patrón de texto oculto con `1px`, `-1px` y `clip: rect(0 0 0 0)` en lugar de reutilizar `.ds-visually-hidden` de `control.css`.
  - `Icon.svelte`: `line-height: 0` y `100%` en el SVG.

  Son constantes geométricas o de utilidad, no valores de diseño, pero no salen de tokens.
- **Textos por defecto en español dentro de componentes:** `Column` genera `"{count} tarjeta(s)"` si no se pasa `countLabel`, y `Dialog` usa `closeLabel="Cerrar"`. Ligan los componentes a un idioma y a un dominio ("tarjetas").
- **Pares usados que no están en `contrast-pairs.json`:**
  - `priority.*` / `surface.raised`: la franja de la tarjeta limita por dentro con el interior de la tarjeta; solo se valida contra `surface.sunken`.
  - `status.*.accent` / `background`: la franja superior de la columna limita por arriba con la página; el par listado (`accent` / `surface.sunken`) no corresponde a una superficie adyacente (debajo de la franja está la cabecera `tint`, que sí está listada).
  - `tag.*.fg` sobre `surface.hover`, `surface.active` y `action.tint-active` (iconos del chip en hover y pulsado).
  - El borde del control en hover y la flecha del select usan `text.secondary` sobre `surface.raised` como indicador (`ui`). Cumplen por el par de texto equivalente (7.58 / 8.81), pero no figuran como `ui`.

  Calcularlos y añadirlos es tarea de `design-builder`; aquí quedan como **no verificados**.
- **Márgenes de contraste mínimos:** `status.paused.accent` / `status.paused.tint` (3.11) y `priority.medium` / `surface.sunken` y `status.paused.accent` / `surface.sunken` (3.05) cumplen en claro por muy poco; cualquier ajuste de esos tonos o de `surface.sunken` puede romperlos.
- **Descripciones desactualizadas en `contrast-pairs.json`:** los pares sobre `surface.base` siguen descritos como "columna" ("texto sobre columna/panel", "anillo de foco sobre columna"), pero `Column` usa ahora `surface.sunken`. Además, las descripciones "icono de cabeceratodo", "…doing", "…paused" y "…done" han perdido el espacio.
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

## Glosario de dominio
- **Proyecto**: contenedor con nombre (obligatorio, 1–80 caracteres sin contar espacios exteriores), descripción opcional, fechas de creación y última modificación automáticas, e identificador interno único. Los nombres pueden repetirse.
- **Tablero**: vista de un proyecto con 4 columnas fijas, una por estado.
- **Tarjeta**: unidad de trabajo dentro de un proyecto. Campos: título (obligatorio, 1–120 caracteres sin contar espacios exteriores), tipo, estado, descripción (opcional, multilínea), prioridad (opcional), fecha de creación y de última modificación (automáticas, no editables).
- **Tipo**: categoría fija de una tarjeta: `Novedad` (funcionalidad que no existía), `Mejora` (modificar o ampliar algo existente), `Arreglo` (algo que no funciona como debería), `Técnico` (dependencias, refactor, build, publicación). Por defecto `Novedad`.
- **Estado**: situación fija de una tarjeta, que determina su columna: `Sin empezar`, `En curso`, `En pausa`, `Finalizado` (en ese orden de columnas).
- **Prioridad**: `Alta`, `Media`, `Baja`, o sin prioridad.
- **Orden automático**: dentro de una columna, las tarjetas se ordenan por prioridad (Alta → Media → Baja → sin prioridad) y, a igual prioridad, por fecha de creación ascendente (la más antigua primero).
- **Archivar**: retirar una tarjeta o un proyecto de la vista activa de forma reversible, conservando todos sus datos.
- **Restaurar**: devolver a la vista activa algo archivado, en el mismo estado en que se archivó.
- **Borrado definitivo**: eliminación irreversible, solo posible desde una vista de archivados y siempre con confirmación.
- **Vista de archivados**: hay dos. La de tarjetas archivadas de un proyecto, y la global de proyectos archivados.
- **Filtro por tipo**: control del tablero que limita las tarjetas visibles a los tipos seleccionados. Se recuerda por proyecto.
- **Export completo**: archivo JSON con todos los proyectos (activos y archivados) y todas sus tarjetas (activas y archivadas).
- **Export de proyecto**: archivo JSON con un proyecto y todas sus tarjetas (activas y archivadas).
- **Versión de formato**: número incluido en todo archivo exportado que identifica la estructura del JSON.
- **Modo de color**: apariencia clara u oscura de la interfaz. La **preferencia de modo** puede ser `Auto` (sigue el modo del sistema operativo), `Claro` u `Oscuro`; por defecto `Auto`. Es una preferencia del navegador, no un dato de proyecto.
- **Carácter (en límites de longitud)**: unidad con la que se cuentan los límites de nombre de proyecto (80) y título de tarjeta (120): una unidad de código UTF-16, igual que el `maxlength` nativo (`"😀".length === 2`). Ver D-020.
- **Grafema**: lo que el usuario percibe como un solo carácter (por ejemplo "e", "😀" o la secuencia ZWJ "👨‍👩‍👧"), según `Intl.Segmenter` con `granularity: 'grapheme'`. Puede ocupar varias unidades UTF-16. Los recortes de longitud que hace la app nunca parten un grafema (D-020).
- **Estado del sistema de diseño (`status`)**: correspondencia fija entre los estados de tarjeta y la prop `status` de `Column` y los tokens `status.*`: `Sin empezar` → `todo`, `En curso` → `doing`, `En pausa` → `paused`, `Finalizado` → `done` (D-023).
- **Contador de columna**: número de tarjetas **visibles** en una columna del tablero, es decir, activas y que pasan el filtro por tipo actual (D-024). No confundir con el recuento por estado de la lista de proyectos (AC-008), que ignora el filtro.
- **Icono decorativo**: icono Lucide que acompaña a un texto visible o a un nombre accesible y que los lectores de pantalla ignoran (`aria-hidden="true"`). El significado nunca depende solo del icono.
- **Fecha de creación visible**: fecha de creación de la tarjeta mostrada como "Creada el {día} {mes abreviado} {año}" en hora local, con `Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' })` (por ejemplo "Creada el 9 oct 2026") (D-030).

## Contextos delimitados
- **proyectos**: crear, editar y listar proyectos; pantalla inicial y estado vacío.
- **tablero**: columnas por estado, creación y edición de tarjetas, orden automático, arrastrar y soltar, filtro por tipo.
- **archivo**: archivar, restaurar y borrar definitivamente tarjetas y proyectos; vistas de archivados; solo lectura de proyectos archivados.
- **intercambio**: exportar e importar (completo y por proyecto), resolución de conflictos y validación de archivos.
- **persistencia**: guardado automático en IndexedDB, errores de guardado, modo sin almacenamiento y sincronización entre pestañas.
- **apariencia**: selector de modo de color y recuerdo de la preferencia de modo; aspecto visual común (tipografía, paleta, cabecera de la app e iconos de botones y enlaces) según el sistema de diseño (D-022).

## Acceptance Checks

### AC-001 [proyectos] [categoría: edge-case]
Al abrir la app por primera vez (sin datos guardados), la pantalla inicial muestra un estado vacío con un botón "Crear proyecto" y una opción "Importar". depende_de: []

### AC-002 [proyectos] [categoría: functional]
Al crear un proyecto con nombre "Mi app" y descripción "Demo", aparece en la lista de proyectos con ese nombre; tras recargar la página sigue apareciendo con el mismo nombre y descripción. depende_de: [AC-036]

### AC-003 [proyectos] [categoría: edge-case]
Al intentar crear o guardar un proyecto con nombre vacío o formado solo por espacios, el proyecto no se crea ni se modifica y se muestra un mensaje de error junto al campo nombre. depende_de: [AC-002]

### AC-004 [proyectos] [categoría: edge-case]
No es posible guardar un proyecto con un nombre de más de 80 caracteres (el campo no admite más o se muestra un error y no se guarda). depende_de: [AC-002]

### AC-005 [proyectos] [categoría: functional]
Al editar el nombre y la descripción de un proyecto existente, los nuevos valores se muestran en la lista y en el tablero, y se conservan tras recargar. depende_de: [AC-002]

### AC-006 [proyectos] [categoría: functional]
Se pueden crear dos proyectos con el mismo nombre; ambos aparecen en la lista como proyectos distintos y editar uno no altera el otro. depende_de: [AC-002]

### AC-007 [proyectos] [categoría: functional]
La lista de proyectos se ordena por última modificación, el más reciente primero: si existen los proyectos A (más antiguo) y B, y se crea o edita una tarjeta en A, A pasa a aparecer primero. depende_de: [AC-002, AC-010]

### AC-008 [proyectos] [categoría: functional]
Cada proyecto de la lista muestra el número de tarjetas activas (no archivadas) en cada uno de los 4 estados; con 2 tarjetas en "Sin empezar" y 1 en "En curso", muestra 2, 1, 0 y 0 respectivamente. depende_de: [AC-010]

### AC-009 [tablero] [categoría: functional]
Al abrir un proyecto se muestra su tablero con exactamente 4 columnas en este orden: "Sin empezar", "En curso", "En pausa", "Finalizado". depende_de: [AC-002]

### AC-010 [tablero] [categoría: functional]
Al crear una tarjeta desde la columna "En curso" indicando solo el título, la tarjeta aparece en "En curso" con tipo "Novedad" y sin prioridad; tras recargar sigue ahí con los mismos valores. depende_de: [AC-009, AC-036]

### AC-011 [tablero] [categoría: edge-case]
Al intentar crear o guardar una tarjeta con título vacío o formado solo por espacios, o con más de 120 caracteres, la tarjeta no se crea ni se modifica y se muestra un mensaje de error junto al campo título. depende_de: [AC-010]

### AC-012 [tablero] [categoría: functional]
Al editar título, tipo, estado, descripción (multilínea) y prioridad de una tarjeta, los cambios se reflejan en el tablero (si cambia el estado, la tarjeta pasa a la columna correspondiente) y se conservan tras recargar. La fecha de última modificación se actualiza y la de creación no cambia; ninguna de las dos se puede editar. depende_de: [AC-010]

### AC-013 [tablero] [categoría: functional]
Cada tarjeta del tablero muestra su tipo como etiqueta con el nombre del tipo en texto y un color distinto por cada uno de los 4 tipos, y muestra su prioridad cuando la tiene. depende_de: [AC-010]

### AC-014 [tablero] [categoría: functional]
Dentro de una columna, las tarjetas aparecen en orden automático: con tarjetas creadas en este orden — T1 (Baja), T2 (sin prioridad), T3 (Alta), T4 (Alta) — la columna muestra T3, T4, T1, T2. depende_de: [AC-012]

### AC-015 [tablero] [categoría: functional]
Al arrastrar una tarjeta de "Sin empezar" a "En pausa", su estado pasa a "En pausa", aparece en esa columna en la posición que le corresponde según el orden automático, y tras recargar sigue en "En pausa". depende_de: [AC-014]

### AC-016 [tablero] [categoría: edge-case]
Al arrastrar una tarjeta a otra posición dentro de su misma columna, al soltarla el orden de la columna sigue siendo el orden automático y el estado de la tarjeta no cambia. depende_de: [AC-015]

### AC-017 [tablero] [categoría: functional]
Es posible mover una tarjeta a otra columna usando solo el teclado, y también mediante gestos táctiles en un viewport móvil (emulación táctil en Playwright). depende_de: [AC-015]

### AC-018 [tablero] [categoría: functional]
Con tarjetas de los 4 tipos en el tablero, al filtrar por el tipo "Arreglo" solo son visibles las tarjetas de tipo "Arreglo"; al quitar el filtro vuelven a verse todas. depende_de: [AC-013]

### AC-019 [tablero] [categoría: functional]
El filtro por tipo se recuerda por proyecto: tras filtrar por "Arreglo" en el proyecto A y recargar, A sigue filtrado por "Arreglo", y otro proyecto B sin filtro sigue mostrando todas sus tarjetas. depende_de: [AC-018]

### AC-020 [tablero] [categoría: edge-case]
En un viewport de 375 px de ancho, el tablero permite ver las 4 columnas desplazándose horizontalmente dentro del tablero, sin que el resto de la página se desplace horizontalmente. depende_de: [AC-009]

### AC-021 [archivo] [categoría: functional]
Al archivar una tarjeta, desaparece del tablero sin pedir confirmación y aparece en la vista de tarjetas archivadas de ese proyecto con todos sus campos. depende_de: [AC-012]

### AC-022 [archivo] [categoría: functional]
Al restaurar una tarjeta archivada que estaba en "En curso", vuelve a la columna "En curso" con título, tipo, descripción, prioridad y fecha de creación sin cambios, y deja de aparecer en la vista de archivadas. depende_de: [AC-021]

### AC-023 [archivo] [categoría: functional]
Desde la vista de tarjetas archivadas, borrar definitivamente una tarjeta pide confirmación; al cancelar la tarjeta sigue archivada, y al confirmar desaparece y no reaparece tras recargar. El tablero no ofrece borrado definitivo para tarjetas activas. depende_de: [AC-021]

### AC-024 [archivo] [categoría: functional]
Al archivar un proyecto, desaparece de la lista de proyectos y aparece en la vista global de proyectos archivados. depende_de: [AC-002]

### AC-025 [archivo] [categoría: functional]
Al restaurar un proyecto archivado que tenía 3 tarjetas activas y 1 archivada, vuelve a la lista de proyectos con esas mismas 3 tarjetas activas en sus columnas y 1 tarjeta en su vista de archivadas. depende_de: [AC-024, AC-021]

### AC-026 [archivo] [categoría: edge-case]
Al abrir el tablero de un proyecto archivado, se puede ver pero no se pueden crear, editar, mover ni archivar tarjetas, ni editar el proyecto; sí se puede exportar el proyecto. depende_de: [AC-024, AC-029]

### AC-027 [archivo] [categoría: functional]
Desde la vista global de proyectos archivados, borrar definitivamente un proyecto pide una confirmación que indica su nombre y su número total de tarjetas; al cancelar no cambia nada, y al confirmar el proyecto y todas sus tarjetas desaparecen y no reaparecen tras recargar. Desde la lista de proyectos activos no existe borrado definitivo. depende_de: [AC-024]

### AC-028 [intercambio] [categoría: functional]
"Exportar todo" descarga un archivo JSON que contiene un campo de versión de formato y todos los proyectos (activos y archivados) con todas sus tarjetas (activas y archivadas). depende_de: [AC-021, AC-024]

### AC-029 [intercambio] [categoría: functional]
"Exportar proyecto" descarga un archivo JSON con un campo de versión de formato, ese proyecto y todas sus tarjetas (activas y archivadas), y ningún otro proyecto. depende_de: [AC-021]

### AC-030 [intercambio] [categoría: functional]
Al importar un archivo de export completo habiendo al menos 1 proyecto (activo o archivado), la app pide confirmación indicando que se borrarán los N proyectos actuales (el caso sin proyectos está en AC-041); al cancelar los datos no cambian, y al confirmar los datos actuales se reemplazan por los del archivo. Exportar todo, crear un proyecto nuevo, e importar el archivo exportado deja exactamente los proyectos y tarjetas originales (mismos campos, estados de archivado y fechas), sin el proyecto nuevo. depende_de: [AC-028]

### AC-031 [intercambio] [categoría: functional]
Al importar un export de proyecto cuyo identificador no existe en la app, el proyecto se añade con todas sus tarjetas y los proyectos existentes no cambian. depende_de: [AC-029]

### AC-032 [intercambio] [categoría: edge-case]
Al importar un export de proyecto cuyo identificador ya existe, la app ofrece "Reemplazar" e "Importar como copia". "Reemplazar" sustituye el proyecto existente por el del archivo. "Importar como copia" añade un proyecto nuevo con el nombre original seguido de " (copia)" y deja intacto el existente. Cerrar el diálogo sin elegir no modifica ningún dato. depende_de: [AC-031]

### AC-033 [intercambio] [categoría: edge-case]
Al importar un archivo que no es JSON válido, que tiene una versión de formato desconocida o cuya estructura no es válida (por ejemplo, una tarjeta sin título o con un estado inexistente), se muestra un error que indica cuál de esos motivos aplica y ningún dato se modifica. depende_de: [AC-030, AC-031]

### AC-034 [intercambio] [categoría: functional]
La opción "Importar" del estado vacío (AC-001) acepta tanto un export completo como un export de proyecto, y tras importarlo se ven los proyectos importados en la lista. depende_de: [AC-001, AC-030, AC-031]

### AC-035 [persistencia] [categoría: edge-case]
Si al guardar un cambio el almacenamiento falla (por ejemplo, por cuota excedida, simulable en test), se muestra un aviso visible de error de guardado con un botón "Exportar ahora" que descarga el export completo con el estado actual en memoria; la interfaz no indica que se guardó. depende_de: [AC-028]

### AC-036 [persistencia] [categoría: functional]
Tras crear o modificar cualquier dato, sin pulsar ningún botón de guardar (no existe), recargar la página muestra el cambio. depende_de: []

### AC-037 [persistencia] [categoría: edge-case]
Si IndexedDB no está disponible, la app muestra un aviso permanente indicando que los datos no se conservarán al cerrar, y sigue permitiendo crear y editar proyectos y tarjetas en memoria y exportarlos. depende_de: [AC-002, AC-028]

### AC-038 [persistencia] [categoría: edge-case]
Con la app abierta en dos pestañas A y B, al crear una tarjeta en A aparece en B sin recargar. Si A y B editan el título de la misma tarjeta, el valor final en ambas pestañas y tras recargar es el del último cambio guardado. depende_de: [AC-036]

### AC-039 [tablero] [categoría: functional]
El filtro por tipo admite selección múltiple. Con tarjetas de los 4 tipos, al seleccionar "Arreglo" y "Técnico" solo son visibles las tarjetas de esos dos tipos. Al deseleccionar todos los tipos no hay filtro activo y se ven todas las tarjetas. La selección múltiple también se recuerda tras recargar. depende_de: [AC-018, AC-019]

### AC-040 [intercambio] [categoría: edge-case]
Al usar "Importar como copia" con un proyecto cuyo nombre más " (copia)" supera 80 caracteres, el nombre original se recorta para que el resultado tenga exactamente 80 caracteres y termine en " (copia)". Por ejemplo, un nombre de 78 caracteres queda en sus primeros 72 + " (copia)". La importación se completa sin error y el proyecto copiado se puede editar y guardar sin cambiar su nombre. depende_de: [AC-032, AC-004]
> Nota (2026-10-11): precisado por D-020 y AC-046. Los "caracteres" de este check son unidades UTF-16. El recorte se hace en el último límite de grafema completo, así que el resultado tiene **como máximo** 80 unidades y puede quedar por debajo si el corte cae dentro de un grafema. El ejemplo de 78 caracteres ASCII no cambia. El texto original se conserva como historial.

### AC-041 [intercambio] [categoría: edge-case]
Si la app no tiene ningún proyecto (ni activo ni archivado), al importar un export completo no se muestra confirmación: los proyectos del archivo aparecen directamente en la lista. depende_de: [AC-030]

### AC-042 [apariencia] [categoría: functional]
La cabecera de la app tiene un selector "Modo de color" con las opciones "Auto", "Claro" y "Oscuro". Es visible en la lista de proyectos, en el tablero y en las dos vistas de archivados, y se puede manejar solo con el teclado. Sin preferencia guardada, el selector muestra "Auto" y la interfaz sigue el sistema operativo: con `prefers-color-scheme: dark` emulado en Playwright, el fondo de página tiene el color oscuro del token `background`, y con `light` el claro. Con el sistema en claro, elegir "Oscuro" pasa la interfaz al modo oscuro sin recargar. Con el sistema en oscuro, elegir "Claro" la pasa al modo claro. Volver a "Auto" hace que siga de nuevo al sistema. depende_de: [AC-001]

### AC-043 [apariencia] [categoría: edge-case]
Tras elegir "Oscuro" y recargar la página, la interfaz sigue en modo oscuro y el selector muestra "Oscuro", aunque el sistema esté en claro. La preferencia de modo no aparece en el export completo ni en el export de proyecto, e importar cualquier archivo no la cambia. Si el navegador no permite guardar la preferencia, el selector sigue funcionando durante la sesión y al recargar vuelve a "Auto", sin mostrar ningún error. depende_de: [AC-042, AC-028, AC-029]

### AC-044 [persistencia] [categoría: edge-case]
Con el almacenamiento forzado a fallar (por ejemplo, `QuotaExceededError` en las escrituras de IndexedDB, simulable en test), ningún flujo que escribe datos produce un error no controlado. Los flujos son: crear, editar, archivar, restaurar y borrar definitivamente proyectos y tarjetas; mover una tarjeta con ratón, táctil o teclado; importar un export completo, un proyecto nuevo, "Reemplazar" e "Importar como copia"; y cambiar el filtro por tipo. Durante cada uno, Playwright no registra ningún evento `pageerror` y la consola no muestra ningún mensaje "Uncaught" ni "Uncaught (in promise)". En todos esos flujos se mantiene el comportamiento visible de AC-035: aparece el aviso de error de guardado con "Exportar ahora" y la interfaz no indica que se guardó. Al crear o editar un proyecto o una tarjeta, el diálogo sigue abierto. Si falla el guardado de la preferencia de modo de color (AC-043), tampoco hay `pageerror` ni "Uncaught". La app puede registrar el fallo a propósito con `console.error` o `console.warn`. Esos mensajes controlados están permitidos y no hacen fallar este check, que solo prohíbe los errores no controlados (`pageerror`, "Uncaught" y "Uncaught (in promise)"). depende_de: [AC-035]

### AC-045 [apariencia] [categoría: functional]
En la lista de proyectos, el tablero, la vista de proyectos archivados y la vista de tarjetas archivadas, el texto "Modo de color" se ve en la cabecera **encima** del selector de AC-042: su borde inferior queda por encima del borde superior del selector. Es la disposición de serie de `Field` y no se modifica `design-system/`. El texto no está oculto visualmente (no lleva `ds-visually-hidden`), tiene un tamaño mayor que 0 y queda dentro del viewport. Es la `<label>` asociada al `<select>`: al hacer clic en el texto, el foco pasa al selector. El selector conserva el nombre accesible "Modo de color" (`getByRole('combobox', { name: 'Modo de color' })`) y se sigue manejando solo con el teclado, como en AC-042. Con un viewport de 375 px, en esas 4 vistas, la página no se desplaza en horizontal (`document.documentElement.scrollWidth` ≤ 375), y la etiqueta y el selector se ven completos dentro del viewport sin solaparse con otros elementos de la cabecera. depende_de: [AC-042]

### AC-046 [intercambio] [categoría: edge-case]
Los límites del nombre de proyecto (80) y del título de tarjeta (120) se siguen contando en unidades UTF-16, igual que `maxlength`. La validación de AC-003, AC-004 y AC-011 no cambia, ni tampoco el `maxlength` donde lo haya. Cuando la app recorta un texto por longitud, lo corta en el último límite de grafema completo que quepa (`Intl.Segmenter` con `granularity: 'grapheme'`). Hoy el único caso es el nombre original en "Importar como copia" (AC-040), pero la regla vale para cualquier recorte. El resultado nunca contiene medio grafema, un surrogate suelto ni una secuencia ZWJ partida. Puede quedar por debajo del máximo y siempre pasa la validación del nombre. El nombre de la copia nunca tiene espacios exteriores. Si el recorte deja vacío el nombre original, porque su primer grafema no cabe, el resultado es "(copia)", sin espacio delante. Si el recorte termina en un espacio, ese espacio queda dentro del nombre (por ejemplo "…a  (copia)", ya aceptado en AC-040) y no hay que quitarlo. Ejemplos con "Importar como copia", donde quedan 72 unidades para el nombre original:
(a) 71 "e" + "😀" (73 unidades) da 71 "e" + " (copia)", con 79 unidades: el "😀" se descarta entero.
(b) 68 "e" + "👨‍👩‍👧" (la secuencia ocupa 8 unidades; 76 en total) da 68 "e" + " (copia)", con 76 unidades, sin ningún fragmento de la secuencia.
(c) 70 "e" + "😀" + "xyz" (75 unidades) da 70 "e" + "😀" + " (copia)", con 80 unidades: el emoji cabe y se conserva.
(d) Un nombre ASCII de 78 caracteres da sus primeros 72 + " (copia)", con 80 unidades, igual que en AC-040.
(e) "a" + 79 × U+0301 (acento agudo combinante) es un solo grafema de 80 unidades y un nombre válido. Da exactamente "(copia)", con 7 unidades, sin espacio delante y sin ningún fragmento del grafema.
En los cinco casos la importación se completa sin error. El nombre de la copia no contiene surrogates aislados (`String.prototype.isWellFormed()` devuelve `true`). El proyecto copiado aparece en la lista con ese nombre exacto y se puede editar y guardar sin cambiar el nombre. depende_de: [AC-040]

### AC-047 [apariencia] [categoría: functional]
Tipografía y paleta del rediseño. En la lista de proyectos, el tablero y las dos vistas de archivados: (1) la `font-family` computada de `body` empieza por `"Plus Jakarta Sans Variable"`, y `document.fonts.check('16px "Plus Jakarta Sans Variable"')` devuelve `true` tras `document.fonts.ready`; (2) con el modo "Claro" el `background-color` computado de `body` es `rgb(248, 250, 252)` (`#F8FAFC`, token `background`), y con "Oscuro" es `rgb(15, 23, 42)` (`#0F172A`); (3) el botón primario "Crear proyecto" de la lista tiene `background-color` `rgb(79, 70, 229)` (`#4F46E5`, `action.primary`) en claro y `rgb(139, 147, 250)` (`#8B93FA`) en oscuro. AC-042 y AC-045 siguen pasando sin cambios. depende_de: [AC-042]

### AC-048 [apariencia] [categoría: functional]
Cabecera de la app. En las 4 vistas de AC-047, la cabecera común: (1) tiene `background-color` igual al token `appbar.bg` (claro `rgb(255, 255, 255)`, oscuro `rgb(30, 41, 59)`), un `box-shadow` distinto de `none` y un borde inferior de 3 px sólido del color `appbar.accent` (claro `rgb(79, 70, 229)`, oscuro `rgb(139, 147, 250)`); (2) a la izquierda muestra un icono `svg.lucide-square-kanban` decorativo (dentro de un elemento con `aria-hidden="true"`) seguido del texto "Kanban de proyectos", que es un enlace (`getByRole('link', { name: 'Kanban de proyectos' })`) a la lista de proyectos: al pulsarlo desde el tablero o desde una vista de archivados se muestra la lista; (3) a la derecha sigue el selector "Modo de color" con su etiqueta visible, y AC-042 y AC-045 siguen pasando (incluido el caso de 375 px sin desplazamiento horizontal). depende_de: [AC-042, AC-045, AC-047]

### AC-049 [tablero] [categoría: functional]
Columnas del tablero con `Column`. En el tablero, cada una de las 4 columnas es una región (`getByRole('region', { name: <estado> })`) etiquetada por un encabezado con el nombre del estado, en el orden de AC-009. Para cada columna, con la correspondencia `Sin empezar` → `todo`, `En curso` → `doing`, `En pausa` → `paused`, `Finalizado` → `done`: (1) la cabecera tiene `background-color` igual a `status.<x>.tint` y la columna tiene un borde superior de 4 px del color `status.<x>.accent`, comprobado en claro y en oscuro con los valores de la tabla "Paleta de colores"; (2) la cabecera incluye un icono decorativo (`svg.lucide-circle-dashed`, `svg.lucide-circle-dot`, `svg.lucide-circle-pause` y `svg.lucide-circle-check` respectivamente) dentro de un elemento con `aria-hidden="true"`; (3) la cabecera muestra un contador con el número de tarjetas visibles de la columna y su texto accesible es "N tarjeta" (N = 1) o "N tarjetas" (resto). Ejemplo: con 2 tarjetas en "Sin empezar" y ninguna en "En pausa", los contadores muestran "2" y "0", con textos accesibles "2 tarjetas" y "0 tarjetas". Con el filtro por tipo activo (AC-018), el contador cuenta solo las tarjetas que se ven: con 3 tarjetas en "En curso", de las que 1 es "Arreglo", al filtrar por "Arreglo" muestra "1"; al quitar el filtro vuelve a "3". AC-009, AC-014, AC-018, AC-020 y AC-039 siguen pasando. depende_de: [AC-009, AC-018, AC-047]

### AC-050 [tablero] [categoría: functional]
"Añadir tarjeta" en la cabecera de la columna. Cada columna de un proyecto activo tiene, en su cabecera, un botón de solo icono (`svg.lucide-plus`, decorativo) cuyo nombre accesible es "Añadir tarjeta en <estado>" (por ejemplo `getByRole('button', { name: 'Añadir tarjeta en En curso' })`); no hay ningún otro botón "Añadir tarjeta" con texto al pie de la columna. El botón se alcanza con Tab y se activa con Intro o Espacio. Al pulsarlo se abre el diálogo de creación de tarjeta con el estado de esa columna, y AC-010 sigue pasando usando este botón. En el tablero de un proyecto archivado (AC-026) este botón no existe en ninguna columna. depende_de: [AC-010, AC-026, AC-049]

### AC-051 [tablero] [categoría: edge-case]
Columna vacía y destino de arrastre. (1) Una columna sin tarjetas visibles (porque no tiene ninguna o porque el filtro por tipo las oculta todas) muestra en su cuerpo el texto "Sin tarjetas" con un icono `svg.lucide-inbox` decorativo, dentro de un bloque con borde `dashed`; también en el tablero de solo lectura. (2) Mientras se arrastra una tarjeta con el ratón sobre otra columna, el borde de esa columna (lados izquierdo, derecho e inferior) pasa al color `action.primary` (claro `rgb(79, 70, 229)`), y el hueco donde caería la tarjeta se muestra como un bloque con borde `dashed` del color `action.primary`, fondo `action.tint` (claro `rgb(238, 242, 255)`) e icono `svg.lucide-arrow-down-to-line`; si esa columna estaba vacía, el texto "Sin tarjetas" no se ve mientras está el hueco. (3) Al soltar o cancelar el arrastre (Escape), ninguna columna conserva el borde `action.primary` ni queda ningún hueco activo, y solo las columnas sin tarjetas visibles muestran "Sin tarjetas". (4) AC-015, AC-016 y AC-017 siguen pasando, también con teclado y con gestos táctiles. depende_de: [AC-015, AC-017, AC-049]

### AC-052 [tablero] [categoría: functional]
Prioridad y tipo en la tarjeta. En el tablero: (1) una tarjeta con prioridad "Alta" tiene un borde superior de 4 px del color `priority.high` (claro `rgb(220, 38, 38)`, oscuro `rgb(248, 113, 113)`); "Media", de `priority.medium` (claro `rgb(234, 88, 12)`, oscuro `rgb(251, 146, 60)`); "Baja", de `priority.low` (claro `rgb(77, 124, 15)`, oscuro `rgb(163, 230, 53)`); una tarjeta sin prioridad tiene un borde superior de 1 px del color `border.default` y no muestra etiqueta de prioridad. (2) La etiqueta de prioridad conserva su texto ("Alta", "Media" o "Baja") y su tono de D-016, y lleva delante un icono decorativo: `svg.lucide-arrow-up` (Alta), `svg.lucide-equal` (Media) o `svg.lucide-arrow-down` (Baja). (3) La etiqueta de tipo conserva su texto y su color de AC-013 y lleva su icono decorativo: `svg.lucide-sparkles` (Novedad), `svg.lucide-trending-up` (Mejora), `svg.lucide-bug` (Arreglo) o `svg.lucide-wrench` (Técnico). (4) En el filtro por tipo, cada chip muestra el icono de su tipo y el seleccionado además `svg.lucide-check`. Todos estos iconos están dentro de elementos con `aria-hidden="true"`, y los nombres accesibles de etiquetas y chips no cambian. AC-013, AC-014, AC-018 y AC-039 siguen pasando. depende_de: [AC-013, AC-039, AC-047]

### AC-053 [tablero] [categoría: functional]
Pie de la tarjeta. En el tablero, cada tarjeta muestra en su pie un icono `svg.lucide-calendar` decorativo y el texto "Creada el {fecha}", donde la fecha es su fecha de creación en hora local con `Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' })` (una tarjeta creada el 9 de octubre de 2026 muestra "Creada el 9 oct 2026"; el test fija el reloj o calcula la cadena esperada con el mismo formateador). Editar la tarjeta (AC-012) no cambia ese texto. En un proyecto activo, el pie tiene también un botón de solo icono `svg.lucide-archive` (decorativo) con nombre accesible "Archivar {título}" (`getByRole('button', { name: 'Archivar Mi tarjeta' })` para la tarjeta "Mi tarjeta"); no hay ningún botón con el texto visible "Archivar" en la tarjeta. Al pulsarlo, la tarjeta se archiva como en AC-021. En el tablero de un proyecto archivado (AC-026) el pie muestra la fecha pero no el botón de archivar. depende_de: [AC-012, AC-021, AC-026, AC-047]

### AC-054 [proyectos] [categoría: functional]
Recuento por estado en la lista de proyectos. Cada proyecto de la lista muestra 4 pastillas, una por estado y en el orden de las columnas. Cada pastilla contiene el icono decorativo del estado (los mismos de AC-049), el nombre del estado y el número de tarjetas activas en ese estado, y su `background-color` es `status.<x>.tint` y su `color` es `status.<x>.on-tint` (claro y oscuro, valores de la tabla "Paleta de colores"). Las 4 pastillas se ven también con 0. El nombre del estado y el número son texto accesible (un lector de pantalla puede leer, por ejemplo, "Sin empezar" y "2"). Los números son los de AC-008, que sigue pasando con el ejemplo 2, 1, 0 y 0. depende_de: [AC-008, AC-049]

### AC-055 [apariencia] [categoría: functional]
Iconos en botones y enlaces. Cada botón o enlace de esta tabla muestra delante de su texto visible el icono indicado (`svg.lucide-<nombre>`), dentro de un elemento con `aria-hidden="true"`; su nombre accesible no incluye nada del icono:

| Vista | Botón o enlace (texto visible) | Icono |
|---|---|---|
| Lista de proyectos y estado vacío | "Crear proyecto" | `plus` |
| Lista de proyectos y estado vacío | "Importar" | `upload` |
| Lista de proyectos | "Exportar todo" | `download` |
| Lista de proyectos | "Editar" (de cada proyecto) | `pencil` |
| Lista de proyectos | "Archivar" (de cada proyecto) | `archive` |
| Lista de proyectos | "Proyectos archivados" | `archive` |
| Tablero | "Exportar proyecto" | `download` |
| Tablero | "Editar proyecto" | `pencil` |
| Tablero | "Tarjetas archivadas" | `archive` |
| Tablero, tarjetas archivadas, proyectos archivados, página no encontrada | "Volver a proyectos", "Volver a proyectos archivados", "Volver al tablero" | `arrow-left` |
| Proyectos archivados y tarjetas archivadas | "Restaurar" | `archive-restore` |
| Proyectos archivados y tarjetas archivadas (lista y diálogo de confirmación) | "Borrar definitivamente" | `trash-2` |
| Diálogos de importación | "Reemplazar" | `replace` |
| Diálogo de conflicto de importación | "Importar como copia" | `copy` |
| Aviso de error de guardado (AC-035) | "Exportar ahora" | `download` |

Los nombres accesibles de estos botones y enlaces no cambian, salvo en los enlaces de volver, que pierden la flecha de texto "←": ahora son "Volver a proyectos", "Volver a proyectos archivados" y "Volver al tablero" (el icono `arrow-left` sustituye a "←"). Los botones "Crear", "Añadir", "Guardar cambios", "Cancelar" y "Aceptar" de los diálogos no llevan icono. Los casos de solo icono están en AC-050 ("Añadir tarjeta") y AC-053 ("Archivar" de la tarjeta). Los AC que usan estos botones o enlaces siguen pasando. depende_de: [AC-047]

### AC-056 [archivo] [categoría: functional]
Tarjetas en la vista de tarjetas archivadas. Cada tarjeta archivada se muestra con la misma presentación de prioridad y tipo que en el tablero (franja superior por prioridad e iconos de las etiquetas, puntos (1) a (3) de AC-052) y sigue mostrando su estado, su fecha de creación y su fecha de última modificación. Sus botones "Restaurar" y "Borrar definitivamente" llevan los iconos de AC-055 y conservan sus nombres accesibles ("Restaurar {título}" y "Borrar definitivamente {título}"). AC-021, AC-022 y AC-023 siguen pasando. depende_de: [AC-021, AC-052, AC-055]

### AC-057 [apariencia] [categoría: edge-case]
Accesibilidad y adaptación del rediseño. (1) En las 4 vistas de AC-047, en claro y en oscuro, todo botón cuyo contenido visible sea solo un icono tiene un nombre accesible no vacío, y ningún `svg.lucide` está expuesto a lectores de pantalla (todos tienen `aria-hidden="true"` o están dentro de un elemento que lo tiene). (2) Con un viewport de 375 px, ninguna de esas vistas se desplaza en horizontal (`document.documentElement.scrollWidth` ≤ 375); en el tablero, las 4 columnas siguen viéndose desplazándose dentro del tablero (AC-020). (3) Los botones de solo icono de AC-050 y AC-053 tienen un área de pulsación mínima de 44 × 44 px, contando la zona ampliada del `::after` de `Button size="sm"` (se comprueba con `elementFromPoint` en un punto a 4 px fuera del borde visible del botón, que devuelve el propio botón). (4) Con `prefers-reduced-motion: reduce` emulado, AC-015 sigue pasando. depende_de: [AC-020, AC-048, AC-049, AC-050, AC-053]

## Decisiones de diseño

### D-001 [tema: ambiguedad]
Pregunta: ¿Qué representan las columnas del tablero: el tipo de tarjeta o su estado?
Opciones: A) Columnas por tipo con el estado como etiqueta; B) Columnas por estado con el tipo como etiqueta y filtro; C) Matriz tipo × estado.
Elegido: B.
Razón: Kanban clásico. Arrastrar entre columnas avanza el trabajo, que es la acción diaria, y el estado se ve de un vistazo.
Prueba (AC): AC-009, AC-013, AC-015, AC-018

### D-002 [tema: trade-off]
Pregunta: ¿Tipos y estados fijos o configurables?
Opciones: A) Todo fijo; B) Tipos configurables por proyecto; C) Tipos y columnas configurables.
Elegido: A.
Razón: Es lo más simple para la primera versión, el formato de import/export es predecible y no hay casos de borrado de columnas con tarjetas. Se puede ampliar más adelante sin romper datos.
Prueba (AC): AC-009, AC-013

### D-003 [tema: ambiguedad]
Pregunta: ¿Cuáles son los tipos y los estados?
Opciones: Tipos originales Novedad/Cambio/Arreglo vs. Novedad/Mejora/Arreglo/Técnico. Estados: añadir "En revisión" o "Descartado".
Elegido: Tipos Novedad · Mejora · Arreglo · Técnico. Estados Sin empezar · En curso · En pausa · Finalizado.
Razón: "Cambio" era ambiguo frente a "Novedad", y faltaba una categoría para tareas técnicas. "En revisión" no aplica a una persona sola, y "Descartado" se cubre con el archivado.
Prueba (AC): AC-009, AC-013, AC-018

### D-004 [tema: ambiguedad]
Pregunta: ¿Qué campos tiene una tarjeta?
Opciones: Título, tipo, estado, descripción, prioridad y fechas automáticas; opcionalmente versión de la app, fecha límite o checklist.
Elegido: Título (obligatorio, ≤120), tipo (por defecto Novedad), estado (por defecto el de la columna), descripción opcional, prioridad opcional (Alta/Media/Baja) y fechas de creación y modificación automáticas. Sin versión, fecha límite ni checklist.
Razón: Cubre el caso de uso sin complejidad extra en la primera versión.
Prueba (AC): AC-010, AC-011, AC-012, AC-013

### D-005 [tema: trade-off]
Pregunta: ¿Cómo se ordenan las tarjetas dentro de una columna?
Opciones: A) Automático por prioridad y antigüedad; B) Manual por arrastre; C) Manual con botón "Ordenar por prioridad".
Elegido: A.
Razón: Es predecible, coherente con el campo prioridad y no requiere guardar posiciones. Arrastrar solo cambia de columna.
Prueba (AC): AC-014, AC-015, AC-016

### D-006 [tema: trade-off]
Pregunta: ¿Qué pasa al borrar tarjetas y proyectos?
Opciones: A) Borrado definitivo con confirmación; B) Borrado con "Deshacer"; C) Archivar, con restauración y borrado definitivo desde archivados.
Elegido: C, para tarjetas y proyectos.
Razón: Conserva el historial (por ejemplo, lo hecho en versiones antiguas) sin llenar las columnas.
Prueba (AC): AC-021, AC-024

### D-007 [tema: edge-case]
Pregunta: ¿Cómo funciona exactamente el archivado?
Opciones: Propuesta de 6 puntos aceptada sin cambios.
Elegido: (1) Archivar una tarjeta no pide confirmación y conserva todos sus campos. (2) Al restaurarla vuelve a la columna de su estado. (3) Archivar un proyecto lo retira con todas sus tarjetas, y al restaurarlo vuelve igual. (4) Hay una vista de archivadas por proyecto y una global de proyectos. (5) El borrado definitivo solo es posible desde archivados, con confirmación. (6) Un proyecto archivado es de solo lectura pero exportable.
Razón: Archivar es reversible, así que no necesita fricción. Lo irreversible sí exige confirmación.
Prueba (AC): AC-021, AC-022, AC-023, AC-024, AC-025, AC-026, AC-027

### D-008 [tema: edge-case]
Pregunta: ¿Cómo funcionan el export y el import, y qué pasa con los conflictos?
Opciones: Importar todo reemplazando vs. fusionando. Conflicto de proyecto: reemplazar o copia.
Elegido: JSON con versión de formato. El export completo y el de proyecto incluyen lo archivado. Importar un export completo reemplaza todo, con confirmación. Importar un proyecto lo añade, y si el identificador ya existe se elige "Reemplazar" o "Importar como copia" (con sufijo " (copia)"). Un archivo inválido muestra el motivo y no modifica nada.
Razón: Fusionar un export completo es mucho más complejo, y la fusión parcial se consigue importando proyectos sueltos.
Prueba (AC): AC-028, AC-029, AC-030, AC-031, AC-032, AC-033, AC-034

### D-009 [tema: dependencia]
Pregunta: ¿Qué stack técnico se usa? (No hay plantilla para web solo de cliente.)
Opciones: Framework React, Svelte, Vue o TS sin framework. Persistencia IndexedDB o localStorage. Arrastre con librería o con HTML5 nativo. Estilos CSS Modules o Tailwind.
Elegido: TypeScript strict, Svelte 5 + Vite (SPA, sin SvelteKit), IndexedDB con `idb`, `svelte-dnd-action`, CSS de ámbito de componente con variables CSS, Vitest + `@testing-library/svelte`, Playwright, interfaz en español, escritorio y móvil.
Razón: Svelte es preferencia del usuario. IndexedDB evita el límite de unos 5 MB y no bloquea la interfaz. `svelte-dnd-action` soporta táctil y teclado, cosa que la API nativa no hace bien en móvil.
Prueba (AC): AC-017, AC-020, AC-036

### D-010 [tema: ambiguedad]
Pregunta: ¿Qué datos tiene un proyecto y cómo es la lista de proyectos?
Opciones: Propuesta de 5 puntos aceptada sin cambios.
Elegido: Nombre obligatorio (≤80, sin solo espacios), descripción opcional, fechas automáticas e identificador único. Se permiten nombres repetidos. La lista es la pantalla inicial, con recuento por estado y ordenada por última modificación descendente. Abrir un proyecto muestra el tablero. Sin proyectos se ve un estado vacío con "Crear proyecto" e "Importar".
Razón: El identificador interno evita conflictos con nombres repetidos y encaja con "Importar como copia".
Prueba (AC): AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009

### D-011 [tema: edge-case]
Pregunta: ¿Cómo se comporta la persistencia en casos límite?
Opciones: Propuesta de 5 puntos aceptada sin cambios.
Elegido: (1) Guardado automático e inmediato. (2) Un fallo de guardado muestra un aviso con "Exportar ahora". (3) Sin IndexedDB, se muestra un aviso permanente y la app funciona solo en memoria. (4) Las pestañas se sincronizan y gana el último cambio. (5) El filtro por tipo se recuerda por proyecto.
Razón: Evitar la pérdida silenciosa de datos en una app sin backend.
Prueba (AC): AC-019, AC-035, AC-036, AC-037, AC-038

### D-012 [tema: ambiguedad]
Pregunta: ¿El filtro por tipo permite seleccionar varios tipos a la vez?
Opciones: A) Selección única; B) Selección múltiple.
Elegido: B. Deseleccionar todos los tipos equivale a no tener filtro, y se ven todas las tarjetas.
Razón: Permite vistas combinadas como "Arreglo + Técnico".
Prueba (AC): AC-039

### D-013 [tema: edge-case]
Pregunta: Si al "Importar como copia" el nombre más " (copia)" supera 80 caracteres, ¿qué se hace?
Opciones: A) Recortar el nombre original para que el total quepa en 80; B) Permitir superar el límite solo en este caso; C) Pedir al usuario un nombre nuevo antes de importar.
Elegido: A.
Razón: La importación nunca falla por el nombre y se respeta la regla de 80 caracteres en todos los casos.
Prueba (AC): AC-040
> Nota (2026-10-11): precisada por D-020. La opción A se mantiene, pero el recorte se hace en el último límite de grafema completo, no en una unidad UTF-16 cualquiera. Por eso el total es como máximo 80, no exactamente 80. El texto original se conserva como historial.

### D-014 [tema: edge-case]
Pregunta: ¿Se pide confirmación al importar un export completo cuando no hay ningún proyecto?
Opciones: A) Sin confirmación; B) Confirmación siempre ("Se borrarán tus 0 proyectos actuales").
Elegido: A.
Razón: No hay datos que perder, así que la confirmación no aporta nada.
Prueba (AC): AC-041, AC-030

### D-015 [tema: dependencia]
Pregunta: ¿Dónde viven los componentes de UI que la app necesita (tarjeta, diálogo, campos, etiquetas, chips, avisos)?
Opciones: A) Todos en `design-system/` mediante `design-builder`; B) Todos en la app, en Svelte, usando solo tokens; C) Mixto.
Elegido: A. El usuario pidió regenerar el sistema de diseño desde cero en Svelte 5, con Button, Input, Textarea, Select, Field, Dialog, Card, Badge, Chip y Alert. La columna del tablero queda en la app, porque es solo maquetación.
Razón: Una única fuente de componentes y tokens, reutilizable y validada en contraste (claro y oscuro).
Prueba (AC): AC-013, AC-018, AC-039
> Nota (2026-10-12): precisada por D-023. La opción A se mantiene, pero la columna del tablero ya no queda en la app: se usa `Column` (y `DropPlaceholder`) del sistema de diseño. El texto original se conserva como historial.

### D-016 [tema: ambiguedad]
Pregunta: ¿Qué tono del sistema de diseño corresponde a cada tipo y a cada prioridad?
Opciones: Correspondencia propuesta por `design-builder` y aceptada por el usuario.
Elegido: Tipos: Novedad → `feature` (azul), Mejora → `improvement` (verde), Arreglo → `bugfix` (rojo), Técnico → `technical` (violeta), en Badge y en el punto del Chip de filtro. Prioridades (Badge): Alta → `danger`, Media → `warning`, Baja → `neutral`. Sin prioridad no se muestra badge.
Razón: Cada tipo tiene un color propio con contraste AA en ambos modos, y la prioridad reutiliza los colores de feedback. El texto siempre acompaña al color.
Prueba (AC): AC-013
> Nota (2026-10-12): ampliada por D-026. Los tonos no cambian. El "punto del Chip" es ahora el icono del tipo (D-021). La prioridad añade la franja superior de la tarjeta (`priority.*`) y un icono de flecha en el badge. El texto original se conserva como historial.

### D-017 [tema: ambiguedad]
Pregunta: ¿La app ofrece un selector de modo claro/oscuro?
Opciones: A) Sin selector, siempre según el sistema operativo; B) Selector Auto / Claro / Oscuro en la cabecera, recordado entre sesiones.
Elegido: B. Por defecto "Auto". La preferencia se guarda en el navegador, separada de los datos de proyectos, y no se incluye en ningún export ni la modifica ninguna importación. "Auto" no pone `data-theme`, y "Claro" u "Oscuro" ponen `data-theme="light"` o `"dark"` en `<html>`.
Razón: El sistema de diseño ya soporta ambos modos y la opción de forzarlos, así que el coste es pequeño. Es una preferencia del dispositivo, no un dato de proyecto, y por eso no viaja en los exports.
Prueba (AC): AC-042, AC-043

### D-018 [tema: edge-case]
Pregunta: QA observó en WI-AC-035 y WI-AC-038 que, cuando falla el guardado al crear o editar un proyecto o una tarjeta, queda un rechazo de promesa sin capturar (`pageerror` / "Uncaught (in promise)"). El aviso de AC-035 se ve bien, pero el error no aparece en la interfaz. ¿Se corrige?
Opciones: A) Dejarlo como está, porque no lo ve el usuario; B) Corregirlo: ningún fallo de guardado, en ningún flujo de escritura, produce un error no controlado, y se mantiene el comportamiento visible de AC-035.
Elegido: B. Todo fallo de guardado se trata de forma controlada y llega al aviso de AC-035 (con "Exportar ahora", sin indicación de éxito, y con el diálogo abierto si lo hay), sin `pageerror` ni "Uncaught" en la consola. Se permite que la app registre el fallo a propósito con `console.error` o `console.warn`: solo se prohíben los errores no controlados (`pageerror`, "Uncaught" y "Uncaught (in promise)"). Esto lo confirmó el usuario el 2026-10-11 (antes era P-2). Se registra como un AC nuevo (AC-044) y no se reescribe AC-035.
Razón: Un rechazo sin capturar es un fallo real aunque no se vea. Ensucia la consola, enmascara otros errores en los tests e2e, y en algunos entornos puede cortar flujos posteriores. Un AC aparte deja el requisito verificable sin alterar el historial de AC-035.
Prueba (AC): AC-044

### D-019 [tema: ambiguedad]
Pregunta: ¿La etiqueta "Modo de color" del selector de AC-042 se oculta (solo para lectores de pantalla) o se ve?
Opciones: A) Oculta con `hideLabel` de `Select`, que es lo implementado hasta ahora (`ds-visually-hidden`); B) Visible, usando la etiqueta que ya renderiza `Select` a través de `Field`, sin `hideLabel`; C) Visible, con un texto propio de la app fuera de `Field`.
Elegido: B. El texto "Modo de color" se ve **encima** del selector, en la cabecera de las 4 vistas, y es la `<label>` del `Field` asociada al `<select>`. Es la disposición de serie de `Field` (`.ds-field` en columna) y no se toca `design-system/`. Esto lo confirmó el usuario el 2026-10-11 (antes era P-1). El nombre accesible y el manejo con teclado no cambian, y a 375 px no hay desbordamiento horizontal.
Razón: Según la sección "Sistema de diseño", `Select` se construye sobre `Field`, que siempre renderiza una `<label for>` y solo la oculta con `hideLabel`. Quitar `hideLabel` da una etiqueta visible sin componentes nuevos y sin duplicar el nombre accesible, cosa que sí arriesgaría la opción C.
Prueba (AC): AC-045

### D-020 [tema: edge-case]
Pregunta: QA observó en WI-AC-040 que, si hay un emoji en la posición de corte de `copyName` (D-013), el recorte deja un surrogate suelto. ¿Cómo se cuentan los límites y cómo se recorta?
Opciones: A) Contar y recortar en unidades UTF-16, como hasta ahora; B) Contar en code points; C) Contar en grafemas; D) Contar en unidades UTF-16 y recortar en límites de grafema.
Elegido: D. Los límites (nombre de proyecto 80, título de tarjeta 120) se siguen contando en unidades UTF-16, igual que el `maxlength` nativo, y no cambian ni la validación ni el `maxlength`. Cuando la app recorta un texto por longitud, lo corta en el último límite de grafema completo que quepa (`Intl.Segmenter` con `granularity: 'grapheme'`). Hoy solo pasa en "Importar como copia", pero la regla vale para cualquier recorte futuro. Nunca deja medio carácter, un surrogate suelto ni una secuencia ZWJ partida. El resultado puede quedar unas unidades por debajo del máximo y siempre pasa la validación del nombre. El nombre de la copia nunca tiene espacios exteriores. Si el recorte deja vacío el nombre original, se guarda "(copia)" sin espacio delante; esto lo confirmó el usuario el 2026-10-11 (antes era P-3). Como el nombre original ya viene sin espacios exteriores, ese es el único caso en que podría aparecer uno. Si el recorte termina en un espacio, ese espacio queda en medio, entre el texto y " (copia)" (caso "…a  (copia)", verificado en AC-040), así que no es exterior y no hace falta ninguna regla más. Quitar los espacios exteriores (`trim`) no es un recorte por longitud y no se ve afectado.
Efecto sobre decisiones y checks anteriores: precisa D-013, que mantiene la opción A ("recortar"), pero el total pasa de "exactamente 80" a "como máximo 80". Precisa también AC-040: el ejemplo ASCII de 78 caracteres sigue igual, y si el corte cae dentro de un grafema el resultado puede tener menos de 80 unidades. Los textos de D-013 y AC-040 se conservan, con una nota que remite aquí.
Razón: Contar en UTF-16 mantiene la coherencia con `maxlength` y con la validación ya implementada y verificada, sin migrar datos. Recortar por grafemas evita que la app corrompa el texto del usuario, que es el único defecto observado. `Intl.Segmenter` es nativo del navegador y no añade dependencias.
Prueba (AC): AC-046, AC-040

### D-021 [tema: dependencia]
Pregunta: El sistema de diseño (2026-10-12) cambia de paleta (ámbar → índigo sobre slate), de fuente (Inter → Plus Jakarta Sans) y añade iconos Lucide (`@lucide/svelte`, `peerDependency`). ¿Cómo se incorpora a la app?
Opciones: A) Adoptarlo entero: instalar `@lucide/svelte` y `@fontsource-variable/plus-jakarta-sans` en la app, importar la fuente nueva en el punto de entrada y dejar de usar Inter; B) Adoptar solo los tokens nuevos, sin iconos ni fuente nueva.
Elegido: A. Lo pidió el usuario durante la iteración con `design-builder` (2026-10-12): "cambia la fuente de letra y mejora/añade iconos… usa lucide-icons". Se añade a "Reglas base de stack" (Iconos, Tipografía, Gestor de paquetes npm).
Razón: Sin `@lucide/svelte` los componentes nuevos del sistema de diseño no compilan en la app, y sin la fuente instalada la pila cae a Inter o a la del sistema, que no es el diseño acordado.
Prueba (AC): AC-047, AC-052, AC-055

### D-022 [tema: ambiguedad]
Pregunta: ¿A qué vistas se aplica el rediseño (maquetación e iconos, más allá de lo que ya llega por tokens)?
Opciones: A) Todas: cabecera, lista de proyectos, tablero, las 2 vistas de archivados, diálogos y flujo de importación; B) Solo tablero y cabecera; C) Tablero, cabecera y lista.
Elegido: A.
Razón: Un aspecto coherente en toda la app. El resto de vistas cambia poco: iconos en botones y la misma presentación de tarjeta.
Prueba (AC): AC-047, AC-048, AC-054, AC-055, AC-056, AC-057

### D-023 [tema: dependencia]
Pregunta: D-015 dejó la columna del tablero en la app. Ahora el sistema de diseño tiene `Column` y `DropPlaceholder`. ¿El tablero pasa a usarlos?
Opciones: A) Sí, `Column` + `DropPlaceholder` (columna vacía y hueco de arrastre); B) Solo `Column`; C) No, mantener columnas propias.
Elegido: A. Correspondencia de estados: `Sin empezar` → `todo`, `En curso` → `doing`, `En pausa` → `paused`, `Finalizado` → `done`. Columna sin tarjetas visibles → `DropPlaceholder` con "Sin tarjetas". Durante el arrastre: `dropTarget` en la columna de destino y `DropPlaceholder active` en el hueco de la tarjeta (en lugar de la tarjeta semitransparente).
Efecto sobre decisiones anteriores: precisa D-015 (la columna deja de ser maquetación propia de la app), con una nota en D-015.
Razón: El sistema de diseño ya resuelve la cabecera por estado, el contador accesible y el destino de arrastre con contraste validado; duplicarlo en la app contradice la regla "Estilos".
Prueba (AC): AC-049, AC-051

### D-024 [tema: ambiguedad]
Pregunta: ¿Qué número muestra el contador de cada columna cuando hay un filtro por tipo activo?
Opciones: A) Tarjetas visibles; B) Todas las tarjetas activas de la columna, sin tener en cuenta el filtro; C) "visibles/total" con filtro activo.
Elegido: A.
Razón: El contador coincide siempre con lo que se ve en la columna. El recuento total por estado sigue estando en la lista de proyectos (AC-008), que no tiene en cuenta el filtro.
Prueba (AC): AC-049

### D-025 [tema: ambiguedad]
Pregunta: ¿Dónde va el botón "Añadir tarjeta" de cada columna?
Opciones: A) Botón de solo icono (`Plus`) en la cabecera de la columna, con nombre accesible "Añadir tarjeta en <estado>"; B) Al pie de la columna, con icono y texto; C) Ambos.
Elegido: A. Su nombre accesible cambia de "Añadir tarjeta" a "Añadir tarjeta en <estado>" para que sea único en el tablero; los tests que lo usan se adaptan.
Razón: Es el patrón de las referencias y deja el cuerpo de la columna solo para tarjetas.
Prueba (AC): AC-050, AC-057

### D-026 [tema: ambiguedad]
Pregunta: ¿Cómo se muestra la prioridad en la tarjeta?
Opciones: A) Franja superior de color (`Card priority`) + badge con texto e icono de flecha; B) Franja + badge solo con texto; C) Solo badge con flecha.
Elegido: A. Alta → franja `priority.high` + badge `danger` con `ArrowUp`; Media → `priority.medium` + `warning` con `Equal`; Baja → `priority.low` + `neutral` con `ArrowDown`. Sin prioridad: ni franja ni badge. Los badges de tipo llevan sus iconos por defecto (`CATEGORY_ICONS`) y los chips del filtro, el icono de su tipo.
Efecto sobre decisiones anteriores: amplía D-016 sin cambiar sus tonos, con una nota en D-016.
Razón: La franja deja ver la prioridad de un vistazo (como en las referencias) y el badge con texto evita depender solo del color.
Prueba (AC): AC-052, AC-056

### D-027 [tema: ambiguedad]
Pregunta: ¿Cómo se añaden los iconos al resto de botones y enlaces, y cuáles?
Opciones: A) Icono + texto en todos, salvo "Archivar" de la tarjeta, que pasa a solo icono; B) Icono + texto en todos; C) Solo icono en las acciones secundarias.
Elegido: A, con la correspondencia aceptada por el usuario: Crear proyecto `Plus`; Importar `Upload`; Exportar todo / Exportar proyecto / Exportar ahora `Download`; Editar / Editar proyecto `Pencil`; Archivar (proyecto), Tarjetas archivadas y Proyectos archivados `Archive`; Archivar (tarjeta) `Archive` solo icono con nombre accesible "Archivar {título}"; Restaurar `ArchiveRestore`; Borrar definitivamente `Trash2`; enlaces "Volver a …" `ArrowLeft`, que sustituye a la flecha de texto "←" (su nombre accesible pierde la "←"); Añadir tarjeta `Plus` solo icono (D-025); cabecera de la app `SquareKanban` (D-028).
Razón: El texto visible mantiene los nombres accesibles y los tests existentes. "Archivar" en cada tarjeta se repetía en todo el tablero; como solo icono, la tarjeta queda más limpia y el nombre accesible con el título la hace única.
Prueba (AC): AC-053, AC-055, AC-057

### D-028 [tema: ambiguedad]
Pregunta: ¿Cómo es la cabecera común de la app?
Opciones: A) Barra `appbar` (fondo `appbar.bg`, sombra `sm`, franja inferior `appbar.accent` de 3 px), con logo `SquareKanban` + "Kanban de proyectos" como enlace a la lista y el selector de modo a la derecha; B) Igual, pero el título no es enlace; C) La barra actual con los tokens nuevos.
Elegido: A. El selector "Modo de color" y su etiqueta visible no cambian (AC-042, AC-045).
Razón: Da identidad visual a la app y un camino corto a la lista desde cualquier vista.
Prueba (AC): AC-048

### D-029 [tema: ambiguedad]
Pregunta: ¿Cómo se ve el recuento por estado de cada proyecto en la lista?
Opciones: A) Una pastilla por estado con el icono y los colores `status.*` del estado, el nombre y el número; B) Texto como ahora; C) Barra de progreso segmentada.
Elegido: A. Las 4 pastillas se muestran siempre, también con 0. Colores: fondo `status.<x>.tint`, texto `status.<x>.on-tint`, icono `status.<x>.accent` (pares ya validados en el sistema de diseño).
Razón: Relaciona visualmente la lista con las columnas del tablero sin tokens nuevos.
Prueba (AC): AC-054

### D-030 [tema: ambiguedad]
Pregunta: ¿Las tarjetas del tablero muestran algún metadato nuevo en el pie?
Opciones: A) Fecha de creación ("Creada el 9 oct 2026") con icono `Calendar`; B) Última modificación con `Clock`; C) Nada nuevo.
Elegido: A. Formato `Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' })` en hora local. El botón de archivar (solo icono, D-027) va en el mismo pie. La vista de tarjetas archivadas mantiene su pie actual (estado, creada y última modificación).
Razón: Da contexto temporal sin abrir la tarjeta; la fecha de creación no cambia al editar, así que es estable.
Prueba (AC): AC-053

### D-031 [tema: trade-off]
Pregunta: ¿Cómo se verifican los checks visuales del rediseño?
Opciones: A) Con Playwright sobre DOM y estilos computados (colores de tokens en claro y oscuro, clases `lucide-*` de los iconos, fuente computada, nombres accesibles); B) A + capturas de referencia (`toHaveScreenshot`); C) Solo capturas.
Elegido: A. Los AC del rediseño dan valores exactos (`rgb(...)`, clases `svg.lucide-<nombre>`, textos accesibles) para que `qa` los compruebe sin imágenes de referencia.
Razón: Es robusto ante diferencias de fuente y sistema operativo, y no obliga a regenerar capturas en cada cambio. Las capturas se pueden añadir más adelante sin cambiar estos AC.
Prueba (AC): AC-047, AC-048, AC-049, AC-050, AC-051, AC-052, AC-053, AC-054, AC-055, AC-056, AC-057

### D-032 [tema: ambiguedad]
Pregunta: Dentro de los diálogos (crear/editar, confirmaciones, importación), ¿qué botones llevan icono?
Opciones: A) Solo los destructivos y los de importación; B) Todos (también Guardar, Crear y Cancelar); C) Ninguno.
Elegido: A. "Borrar definitivamente" `Trash2`, "Reemplazar" `Replace`, "Importar como copia" `Copy`. "Crear", "Añadir", "Guardar cambios", "Cancelar" y "Aceptar" sin icono. Los avisos (`Alert`) ya traen su icono del sistema de diseño. No hay botón "Elegir archivo": el selector de archivo de la importación es el `<input type="file">` oculto que abre "Importar", que ya lleva `Upload`.
Razón: El icono marca las acciones con consecuencias; en las acciones neutras solo añadiría ruido.
Prueba (AC): AC-055

## Preguntas abiertas
Ninguna pendiente. Resueltas el 2026-10-11:
- **P-1 (AC-045, D-019)**: ¿la etiqueta visible va encima del selector o en la misma línea? → **Resuelta**: va encima, que es la disposición de serie de `Field`, y no se toca `design-system/`.
- **P-2 (AC-044, D-018)**: ¿se permite registrar el fallo a propósito con `console.error` o `console.warn`? → **Resuelta**: sí. AC-044 solo prohíbe `pageerror`, "Uncaught" y "Uncaught (in promise)".
- **P-3 (AC-046, D-020)**: ¿qué pasa si el recorte deja vacío el nombre original? → **Resuelta**: se guarda "(copia)" sin espacio delante (ejemplo (e) de AC-046). Un recorte que termina en espacio deja un espacio interno, no exterior, así que no hace falta ninguna regla más.
