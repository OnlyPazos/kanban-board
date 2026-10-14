<!--
  Cabecera común a todas las vistas (AC-048, D-028): barra `appbar` con el
  logo y el título "Kanban de proyectos", que enlaza con la lista de
  proyectos. Aloja el menú "Modo de color" (AC-058) en el snippet
  `actions`.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import SquareKanban from '@lucide/svelte/icons/square-kanban';
  import { Icon } from 'design-system';
  import { LIST_HREF } from './route';

  let { actions }: { actions?: Snippet } = $props();
</script>

<header class="app-header">
  <a class="app-header__title" href={LIST_HREF}>
    <Icon icon={SquareKanban} size="lg" />
    <span>Kanban de proyectos</span>
  </a>
  {#if actions}
    <div class="app-header__actions">{@render actions()}</div>
  {/if}
</header>

<style>
  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ds-spacing-4);
    padding: var(--ds-spacing-3) var(--ds-spacing-4);
    background: var(--ds-color-appbar-bg);
    color: var(--ds-color-appbar-fg);
    border-bottom: var(--ds-appbar-accent-width) solid var(--ds-color-appbar-accent);
    box-shadow: var(--ds-shadow-sm);
  }

  .app-header__title {
    display: inline-flex;
    align-items: center;
    gap: var(--ds-spacing-2);
    min-width: 0;
    color: inherit;
    text-decoration: none;
    font-size: var(--ds-font-subheading-size);
    font-weight: var(--ds-font-subheading-weight);
    line-height: var(--ds-font-subheading-line-height);
    letter-spacing: var(--ds-font-subheading-letter-spacing);
    border-radius: var(--ds-radii-small);
  }

  .app-header__title:focus-visible {
    outline: var(--ds-focus-ring-width) solid var(--ds-color-focus);
    outline-offset: var(--ds-focus-ring-offset);
  }

  .app-header__actions {
    display: flex;
    align-items: center;
    gap: var(--ds-spacing-2);
  }
</style>
