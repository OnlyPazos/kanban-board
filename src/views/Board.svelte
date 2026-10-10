<!--
  Tablero de un proyecto: cabecera con el nombre del proyecto (siempre el
  valor actual del store, así que se actualiza al editarlo), enlace para
  volver a la lista y botón "Editar". Debajo, exactamente 4 columnas en el
  orden de `CARD_STATUSES` (constante única del dominio). Las tarjetas
  llegan en WI-AC-010.
-->
<script lang="ts">
  import { Button } from 'design-system';
  import { CARD_STATUS_LABELS, CARD_STATUSES, type Project } from '../domain';
  import { LIST_HREF } from '../lib/route';

  let { project, onedit }: { project: Project; onedit?: (project: Project) => void } = $props();
</script>

<div class="board">
  <div class="board__header">
    <a class="board__back" href={LIST_HREF}>← Volver a proyectos</a>
    <div class="board__title-row">
      <h1 class="board__title">{project.name}</h1>
      <Button variant="secondary" size="sm" onclick={() => onedit?.(project)}>Editar proyecto</Button>
    </div>
  </div>

  <div class="board__columns">
    {#each CARD_STATUSES as status (status)}
      <section class="board__column" aria-label={CARD_STATUS_LABELS[status]} data-status={status}>
        <h2 class="board__column-title">{CARD_STATUS_LABELS[status]}</h2>
      </section>
    {/each}
  </div>
</div>

<style>
  .board {
    padding: var(--ds-spacing-5) var(--ds-spacing-4);
  }

  .board__header {
    display: flex;
    flex-direction: column;
    gap: var(--ds-spacing-2);
    margin: 0 0 var(--ds-spacing-5);
  }

  .board__back {
    align-self: flex-start;
    color: var(--ds-color-action-primary);
    font-size: var(--ds-font-label-size);
    font-weight: var(--ds-font-label-weight);
    line-height: var(--ds-font-label-line-height);
    border-radius: var(--ds-radii-small);
  }

  .board__back:focus-visible {
    outline: var(--ds-focus-ring-width) solid var(--ds-color-focus);
    outline-offset: var(--ds-focus-ring-offset);
  }

  .board__title-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--ds-spacing-3);
  }

  .board__title {
    margin: 0;
    overflow-wrap: anywhere;
    font-size: var(--ds-font-heading-size);
    font-weight: var(--ds-font-heading-weight);
    line-height: var(--ds-font-heading-line-height);
    letter-spacing: var(--ds-font-heading-letter-spacing);
  }

  .board__columns {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--ds-spacing-4);
  }

  .board__column {
    display: flex;
    flex-direction: column;
    gap: var(--ds-spacing-3);
    padding: var(--ds-spacing-3);
    background: var(--ds-color-surface-base);
    border: var(--ds-border-width-default) solid var(--ds-color-border-default);
    border-radius: var(--ds-radii-large);
  }

  .board__column-title {
    margin: 0;
    font-size: var(--ds-font-subheading-size);
    font-weight: var(--ds-font-subheading-weight);
    line-height: var(--ds-font-subheading-line-height);
    letter-spacing: var(--ds-font-subheading-letter-spacing);
  }
</style>
