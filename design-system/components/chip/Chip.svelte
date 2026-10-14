<!--
  Chip — design-system/components/chip/Chip.svelte

  Botón conmutable (aria-pressed) para filtros. Varios chips forman un
  filtro de selección múltiple. Seleccionado se indica con relleno y con
  un borde de doble grosor en action.primary (no solo con color).

  Uso:
    <Chip bind:selected={showBugs} tone="bugfix">Arreglo</Chip>

  Props:
    selected  boolean, bindable                                (false)
    tone      feature | improvement | bugfix | technical — muestra el
              icono de la categoría en su color             (sin icono)
    icon      icono de @lucide/svelte que sustituye al de la categoría
    disabled  boolean
    onchange  (selected: boolean) => void
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon, { type IconComponent } from '../icon/Icon.svelte';
  import { CATEGORY_ICONS } from '../icon/category-icons.js';

  type Props = {
    selected?: boolean;
    tone?: 'feature' | 'improvement' | 'bugfix' | 'technical';
    icon?: IconComponent;
    disabled?: boolean;
    onchange?: (selected: boolean) => void;
    children: Snippet;
  };

  let { selected = $bindable(false), tone, icon, disabled = false, onchange, children }: Props = $props();

  const resolvedIcon = $derived(icon ?? (tone ? CATEGORY_ICONS[tone] : undefined));

  function toggle() {
    selected = !selected;
    onchange?.(selected);
  }
</script>

<button
  type="button"
  class="ds-chip"
  class:ds-chip--selected={selected}
  aria-pressed={selected}
  {disabled}
  onclick={toggle}
>
  {#if resolvedIcon}
    <span class="ds-chip__icon ds-chip__icon--{tone ?? 'none'}"><Icon icon={resolvedIcon} size="sm" /></span>
  {/if}
  <span>{@render children()}</span>
</button>

<style>
  .ds-chip {
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: var(--ds-spacing-2);
    margin: 0;
    min-height: var(--ds-control-min-height-sm);
    padding: var(--ds-spacing-1) var(--ds-spacing-3);

    font-family: var(--ds-font-family-sans);
    font-size: var(--ds-font-label-size);
    font-weight: var(--ds-font-label-weight);
    line-height: var(--ds-font-label-line-height);
    letter-spacing: var(--ds-font-label-letter-spacing);

    background-color: var(--ds-color-surface-raised);
    color: var(--ds-color-text-primary);
    border: var(--ds-border-width-default) solid var(--ds-color-border-strong);
    border-radius: var(--ds-radii-full);

    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    outline: none;
    transition: background-color var(--ds-duration-fast) var(--ds-easing-standard),
                border-color var(--ds-duration-fast) var(--ds-easing-standard),
                color var(--ds-duration-fast) var(--ds-easing-standard),
                transform var(--ds-duration-base) var(--ds-easing-emphasized);
  }

  /* Zona táctil mínima de 44px sin alterar el layout. */
  .ds-chip::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    min-width: var(--ds-control-hit-area);
    min-height: var(--ds-control-hit-area);
    transform: translate(-50%, -50%);
  }

  .ds-chip:hover:not(:disabled) {
    background-color: var(--ds-color-surface-hover);
  }

  .ds-chip:active:not(:disabled) {
    background-color: var(--ds-color-surface-active);
    transform: scale(var(--ds-control-press-scale));
  }

  .ds-chip:focus-visible {
    outline: var(--ds-focus-ring-width) solid var(--ds-color-focus);
    outline-offset: var(--ds-focus-ring-offset);
  }

  /* ── Seleccionado ───────────────────────────────────────── */
  .ds-chip--selected,
  .ds-chip--selected:hover:not(:disabled) {
    background-color: var(--ds-color-action-tint);
    border-color: var(--ds-color-action-primary);
    /* Segundo trazo hacia dentro: el borde engorda sin mover el contenido. */
    box-shadow: inset 0 0 0 var(--ds-border-width-default) var(--ds-color-action-primary);
    color: var(--ds-color-action-on-tint);
  }

  .ds-chip--selected:active:not(:disabled) {
    background-color: var(--ds-color-action-tint-active);
  }

  /* ── Icono de categoría (en el color de su tag) ─────────── */
  .ds-chip__icon {
    display: inline-flex;
  }

  .ds-chip__icon--feature {
    color: var(--ds-color-tag-feature-fg);
  }

  .ds-chip__icon--improvement {
    color: var(--ds-color-tag-improvement-fg);
  }

  .ds-chip__icon--bugfix {
    color: var(--ds-color-tag-bugfix-fg);
  }

  .ds-chip__icon--technical {
    color: var(--ds-color-tag-technical-fg);
  }

  .ds-chip:disabled .ds-chip__icon {
    color: inherit;
  }

  /* ── Disabled (exento de contraste por WCAG) ────────────── */
  .ds-chip:disabled {
    cursor: not-allowed;
    background-color: var(--ds-color-surface-base);
    border-color: var(--ds-color-border-default);
    color: var(--ds-color-text-disabled);
  }

  @media (prefers-reduced-motion: reduce) {
    .ds-chip {
      transition: none;
    }

    .ds-chip:active:not(:disabled) {
      transform: none;
    }
  }
</style>
