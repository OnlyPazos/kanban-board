<!--
  Lista de proyectos (pantalla inicial). En este Work Item solo existe el
  estado vacío; "Crear proyecto" se conecta en WI-AC-002 e "Importar" en
  WI-AC-034.
-->
<script lang="ts">
  import { Button } from 'design-system';
  import type { Project } from '../domain';

  let {
    projects = [],
    oncreate,
    onimport,
  }: {
    projects?: Project[];
    oncreate?: () => void;
    onimport?: () => void;
  } = $props();
</script>

<section class="project-list" aria-labelledby="project-list-title">
  <h1 id="project-list-title" class="project-list__title">Proyectos</h1>

  {#if projects.length === 0}
    <div class="empty-state">
      <p class="empty-state__title">Todavía no tienes proyectos</p>
      <p class="empty-state__text">Crea tu primer proyecto o importa un archivo exportado.</p>
      <div class="empty-state__actions">
        <Button onclick={() => oncreate?.()}>Crear proyecto</Button>
        <Button variant="secondary" onclick={() => onimport?.()}>Importar</Button>
      </div>
    </div>
  {/if}
</section>

<style>
  .project-list {
    padding: var(--ds-spacing-5) var(--ds-spacing-4);
  }

  .project-list__title {
    margin: 0 0 var(--ds-spacing-5);
    font-size: var(--ds-font-heading-size);
    font-weight: var(--ds-font-heading-weight);
    line-height: var(--ds-font-heading-line-height);
    letter-spacing: var(--ds-font-heading-letter-spacing);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--ds-spacing-3);
    padding: var(--ds-spacing-7) var(--ds-spacing-4);
    text-align: center;
    background: var(--ds-color-surface-base);
    border: var(--ds-border-width-default) solid var(--ds-color-border-default);
    border-radius: var(--ds-radii-large);
  }

  .empty-state__title {
    margin: 0;
    font-size: var(--ds-font-subheading-size);
    font-weight: var(--ds-font-subheading-weight);
    line-height: var(--ds-font-subheading-line-height);
  }

  .empty-state__text {
    margin: 0;
    color: var(--ds-color-text-secondary);
  }

  .empty-state__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--ds-spacing-3);
    margin-top: var(--ds-spacing-3);
  }
</style>
