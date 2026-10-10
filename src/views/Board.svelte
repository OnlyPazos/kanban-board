<!--
  Tablero de un proyecto: cabecera con el nombre del proyecto (siempre el
  valor actual del store, así que se actualiza al editarlo), enlace para
  volver a la lista y botón "Editar". Debajo, exactamente 4 columnas en el
  orden de `CARD_STATUSES` (constante única del dominio). Cada columna lista
  sus tarjetas no archivadas (componente `Card`) y tiene el botón "Añadir
  tarjeta", que avisa con el estado de la columna.
-->
<script lang="ts">
  import { Button, Card } from 'design-system';
  import { CARD_STATUS_LABELS, CARD_STATUSES, type Card as CardData, type CardStatus, type Project } from '../domain';
  import { LIST_HREF } from '../lib/route';

  let {
    project,
    cards = [],
    onedit,
    onaddcard,
  }: {
    project: Project;
    /** Tarjetas del proyecto. */
    cards?: CardData[];
    onedit?: (project: Project) => void;
    onaddcard?: (status: CardStatus) => void;
  } = $props();

  const cardsByStatus = $derived.by(() => {
    const groups = Object.fromEntries(CARD_STATUSES.map((s) => [s, [] as CardData[]])) as Record<
      CardStatus,
      CardData[]
    >;
    for (const card of cards) {
      if (card.projectId === project.id && !card.archived) groups[card.status].push(card);
    }
    return groups;
  });
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
        {#if cardsByStatus[status].length > 0}
          <ul class="board__cards">
            {#each cardsByStatus[status] as card (card.id)}
              <li data-card-id={card.id} data-type={card.type} data-priority={card.priority ?? ''}>
                <Card title={card.title} description={card.description} />
              </li>
            {/each}
          </ul>
        {/if}
        <Button variant="ghost" size="sm" onclick={() => onaddcard?.(status)}>Añadir tarjeta</Button>
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

  .board__cards {
    display: flex;
    flex-direction: column;
    gap: var(--ds-spacing-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .board__column-title {
    margin: 0;
    font-size: var(--ds-font-subheading-size);
    font-weight: var(--ds-font-subheading-weight);
    line-height: var(--ds-font-subheading-line-height);
    letter-spacing: var(--ds-font-subheading-letter-spacing);
  }
</style>
