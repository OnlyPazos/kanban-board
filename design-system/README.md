# design-system/ — sistema de diseño

Tokens agnósticos de lenguaje (JSON → CSS) y componentes en **Svelte 5**.
Paleta "ámbar cálido" sobre neutros stone, tono animado, densidad cómoda,
bordes redondeados y **modo claro y oscuro**.

## Qué hay aquí

```
design-system/
├── tokens/              # valores semánticos en JSON (fuente de verdad)
│   ├── colors.json      # roles con { light, dark }
│   ├── typography.json  # familias (Inter, JetBrains Mono) + escala 1.25
│   ├── spacing.json     # espaciado (múltiplos de 4) y radios
│   ├── sizes.json       # bordes, foco, controles, chip, tarjeta, diálogo
│   ├── motion.json      # duraciones y curvas (standard, emphasized)
│   ├── shadows.json     # elevación sm/md/lg con { light, dark }
│   └── tokens.css       # GENERADO desde los JSON — no editar a mano
├── scripts/
│   ├── build-tokens.mjs     # JSON → tokens.css (--check para CI)
│   ├── check-contrast.mjs   # valida WCAG AA de los pares, en ambos modos
│   └── contrast-pairs.json  # pares de color que usan los componentes
├── components/          # componentes Svelte 5 (runes, TypeScript)
│   ├── index.js         # punto de entrada: export { Button, … }
│   ├── shared/control.css
│   ├── alert/ badge/ button/ card/ chip/ dialog/
│   └── field/ input/ select/ textarea/
├── demo/                # página de demo (Vite) con todos los componentes
├── package.json         # scripts y dependencias de la demo
└── vite.config.js
```

## Comandos

Los scripts de tokens requieren Node 18+ y no tienen dependencias:

```bash
node design-system/scripts/build-tokens.mjs           # regenera tokens/tokens.css
node design-system/scripts/build-tokens.mjs --check   # falla si tokens.css está desactualizado
node design-system/scripts/check-contrast.mjs         # falla si algún par no cumple WCAG AA (claro y oscuro)
```

La demo necesita instalar dependencias una vez:

```bash
cd design-system
npm install
npm run demo        # abre la demo con todos los componentes y el selector de modo
```

Los JSON son la única fuente de verdad: cambia un valor allí y regenera.

## Modo claro / oscuro

Un token de color o sombra con forma `{ "light": …, "dark": … }` genera:

- su valor claro en `:root`;
- su valor oscuro en `@media (prefers-color-scheme: dark)` (sigue al sistema)
  y en `:root[data-theme="dark"]`.

La app puede forzar un modo con `data-theme="light"` o `data-theme="dark"`
en `<html>`; sin el atributo, sigue la preferencia del sistema.

## Usar los componentes en una app Svelte

```ts
// una vez, en el punto de entrada de la app
import '@fontsource-variable/inter';          // la app instala las fuentes
import '<ruta>/design-system/tokens/tokens.css';
```

```svelte
<script lang="ts">
  import { Button, Dialog, Input } from '<ruta>/design-system/components';
</script>

<Button onclick={save}>Guardar</Button>
<Button variant="secondary" size="sm">Cancelar</Button>
<Input label="Título" bind:value={title} error={titleError} required />
```

Requisitos: Svelte `^5.20` (se usa `$props.id()`). Los componentes se
compilan con el plugin de Svelte de la app; no hay paso de build propio.

| Componente | Para qué |
|---|---|
| `Button` | Acciones. Variantes primary/secondary/outline/ghost/danger; tamaños sm/md/lg; `loading` mantiene el foco |
| `Input`, `Textarea`, `Select` | Campos con etiqueta, ayuda y error enlazados por aria |
| `Field` | Envoltorio de etiqueta/ayuda/error para controles propios |
| `Dialog` | Modal sobre `<dialog>` nativo (foco atrapado, Escape, clic fuera) |
| `Card` | Tarjeta con etiquetas, título, descripción recortada, pie; estados hover, arrastrando y solo lectura |
| `Badge` | Etiqueta de categoría (feature/improvement/bugfix/technical) o feedback |
| `Chip` | Botón conmutable (`aria-pressed`) para filtros de selección múltiple |
| `Alert` | Aviso en línea con acento de color y acciones |

La documentación de props de cada componente está en el comentario de
cabecera de su archivo `.svelte`.

## Cómo trabajan los roles

(Ver `AGENTS.md` y `agents/` en la raíz.)

- **`design-builder`** crea y edita componentes solo en la sintaxis detectada
  en `components/` (ahora **Svelte**).
- Los componentes **siempre toman sus valores de `tokens/*.json`** (vía las
  variables `--ds-*`) — nunca colores, tamaños o espaciados sueltos.
- Los estados de focus, disabled, loading y error, y la accesibilidad
  (contraste WCAG AA en ambos modos, teclado, zonas táctiles de 44px,
  `prefers-reduced-motion`) son obligatorios.
- **`design-extractor`** genera `design_system.md` documentando lo que
  existe de verdad, su conformidad de accesibilidad y las inconsistencias.

## Categorías de tokens

`colors`, `typography`, `spacing`, `sizes`, `motion`, `shadows`. Para
categorías nuevas (breakpoints, z-index…), pídeselas a `design-builder`:
las propondrá y las añadirá tras tu confirmación.
