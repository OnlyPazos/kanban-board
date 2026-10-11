<!--
  Cabecera común a todas las vistas. Aloja el selector "Modo de color"
  (AC-042) en el snippet `actions`.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let { actions }: { actions?: Snippet } = $props();
</script>

<header class="app-header">
  <span class="app-header__title">Kanban de proyectos</span>
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
    background: var(--ds-color-surface-base);
    border-bottom: var(--ds-border-width-default) solid var(--ds-color-border-default);
  }

  .app-header__title {
    font-size: var(--ds-font-subheading-size);
    font-weight: var(--ds-font-subheading-weight);
    line-height: var(--ds-font-subheading-line-height);
    letter-spacing: var(--ds-font-subheading-letter-spacing);
  }

  .app-header__actions {
    display: flex;
    align-items: center;
    gap: var(--ds-spacing-2);
  }
</style>
