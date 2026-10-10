<!--
  Tablero de un proyecto: cabecera con el nombre del proyecto (siempre el
  valor actual del store, así que se actualiza al editarlo), enlace para
  volver a la lista y botón "Editar". Debajo, exactamente 4 columnas en el
  orden de `CARD_STATUSES` (constante única del dominio). Cada columna lista
  sus tarjetas no archivadas en el orden automático de `sortCards` (componente `Card`, con el tipo y la prioridad
  como `Badge` según `CARD_TYPE_TONE`/`PRIORITY_TONE`; al abrirla avisa con
  `oneditcard`) y tiene el botón "Añadir tarjeta", que avisa con el estado de
  la columna.

  Arrastrar y soltar (WI-AC-015, `svelte-dnd-action`): cada lista de tarjetas
  es una zona de arrastre, con ratón, táctil y teclado (Espacio/Intro para
  coger la tarjeta, Tab para llevarla a otra columna, Escape para soltarla).
  Al soltar en otra columna avisa con `onmovecard` (la app cambia `status` y
  lo persiste); al soltar en la misma se descarta el orden visual y se
  re-aplica `sortCards`. El componente `Card` refleja el arrastre con `dragging`.
-->
<script lang="ts">
  import { tick } from 'svelte';
  import { Badge, Button, Card } from 'design-system';
  import {
    dndzone,
    DRAGGED_ELEMENT_ID,
    SHADOW_ITEM_MARKER_PROPERTY_NAME,
    type DndEvent,
  } from 'svelte-dnd-action';
  import {
    CARD_STATUS_LABELS,
    CARD_STATUSES,
    CARD_TYPE_LABELS,
    CARD_TYPE_TONE,
    PRIORITY_LABELS,
    PRIORITY_TONE,
    sortCards,
    type Card as CardData,
    type CardStatus,
    type Project,
  } from '../domain';
  import { LIST_HREF } from '../lib/route';
  import { applyDndAriaStrings } from '../lib/dnd';

  let {
    project,
    cards = [],
    onedit,
    onaddcard,
    oneditcard,
    onmovecard,
  }: {
    project: Project;
    /** Tarjetas del proyecto. */
    cards?: CardData[];
    onedit?: (project: Project) => void;
    onaddcard?: (status: CardStatus) => void;
    oneditcard?: (card: CardData) => void;
    /** Al soltar una tarjeta en otra columna. Si la promesa falla, el tablero vuelve a los datos. */
    onmovecard?: (card: CardData, status: CardStatus) => unknown;
  } = $props();

  /** Tarjeta tal como la maneja `svelte-dnd-action` (el hueco del arrastre lleva la marca). */
  type DndCard = CardData & { [SHADOW_ITEM_MARKER_PROPERTY_NAME]?: boolean };

  applyDndAriaStrings();

  const reducedMotion =
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cardsByStatus = $derived.by(() => {
    const groups = Object.fromEntries(CARD_STATUSES.map((s) => [s, [] as CardData[]])) as Record<
      CardStatus,
      CardData[]
    >;
    for (const card of cards) {
      if (card.projectId === project.id && !card.archived) groups[card.status].push(card);
    }
    for (const status of CARD_STATUSES) groups[status] = sortCards(groups[status]);
    return groups;
  });

  /*
   * Listas que ve `svelte-dnd-action`: parten del orden automático y, mientras
   * dura un arrastre, reflejan la posición provisional. Cuando cambian los
   * datos (p. ej. tras guardar el movimiento) vuelven a derivarse de ellos.
   */
  let columnItems: Record<CardStatus, DndCard[]> = $derived(cardsByStatus);

  let boardEl: HTMLElement | undefined = $state();

  /*
   * El elemento que sigue al puntero es una copia estática que crea la
   * librería; le copiamos el aspecto del `Card` del hueco, que se renderiza
   * con `dragging`, para que la tarjeta arrastrada se vea como tal.
   */
  function reflectDragging() {
    const dragged = document.getElementById(DRAGGED_ELEMENT_ID)?.querySelector('article');
    const source = boardEl?.querySelector('[data-dnd-shadow] article');
    if (dragged && source) dragged.className = source.className;
  }

  function handleConsider(status: CardStatus, event: CustomEvent<DndEvent<DndCard>>) {
    columnItems = { ...columnItems, [status]: event.detail.items };
    void tick().then(reflectDragging);
  }

  function handleFinalize(status: CardStatus, event: CustomEvent<DndEvent<DndCard>>) {
    const { items, info } = event.detail;
    // El orden manual no se guarda: al soltar, la columna vuelve al orden automático (AC-016).
    columnItems = { ...columnItems, [status]: sortCards(items) };
    const dropped = items.find((card) => card.id === info.id);
    if (!dropped || dropped.status === status) return;
    const { [SHADOW_ITEM_MARKER_PROPERTY_NAME]: _shadow, ...card } = dropped;
    Promise.resolve(onmovecard?.(card, status)).catch(() => {
      columnItems = cardsByStatus;
    });
  }
</script>

<div class="board" bind:this={boardEl}>
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
        <ul
          class="board__cards"
          aria-label={CARD_STATUS_LABELS[status]}
          use:dndzone={{
            items: columnItems[status],
            flipDurationMs: 0,
            dropAnimationDisabled: reducedMotion,
            dropTargetStyle: {},
            dropTargetClasses: ['board-drop-target'],
            transformDraggedElement: reflectDragging,
          }}
          onconsider={(event) => handleConsider(status, event)}
          onfinalize={(event) => handleFinalize(status, event)}
        >
          {#each columnItems[status] as card (card.id)}
            {@const dragging = !!card[SHADOW_ITEM_MARKER_PROPERTY_NAME]}
            <li
              aria-label={card.title}
              data-card-id={card.id}
              data-type={card.type}
              data-priority={card.priority ?? ''}
              data-dnd-shadow={dragging || undefined}
            >
              <Card title={card.title} description={card.description} {dragging} onopen={() => oneditcard?.(card)}>
                {#snippet tags()}
                  <Badge tone={CARD_TYPE_TONE[card.type]}>{CARD_TYPE_LABELS[card.type]}</Badge>
                  {#if card.priority !== null}
                    <Badge tone={PRIORITY_TONE[card.priority]}>{PRIORITY_LABELS[card.priority]}</Badge>
                  {/if}
                {/snippet}
              </Card>
            </li>
          {/each}
        </ul>
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
    /* Una columna vacía sigue siendo un destino donde soltar. */
    min-height: var(--ds-spacing-8);
    margin: 0;
    padding: 0;
    list-style: none;
    border-radius: var(--ds-radii-medium);
  }

  .board__cards:focus-visible {
    outline: var(--ds-focus-ring-width) solid var(--ds-color-focus);
    outline-offset: var(--ds-focus-ring-offset);
  }

  .board__cards > li {
    border-radius: var(--ds-radii-large);
  }

  .board__cards > li:focus-visible {
    outline: var(--ds-focus-ring-width) solid var(--ds-color-focus);
    outline-offset: var(--ds-focus-ring-offset);
  }

  /* Columnas donde se puede soltar mientras dura un arrastre (clase que pone svelte-dnd-action). */
  :global(.board-drop-target) {
    outline: var(--ds-border-width-accent) dashed var(--ds-color-border-strong);
    outline-offset: var(--ds-spacing-1);
  }

  @media (prefers-reduced-motion: reduce) {
    /* Copia que sigue al puntero: sin transiciones de posición ni tamaño. */
    :global(#dnd-action-dragged-el) {
      transition: none !important;
    }
  }

  .board__column-title {
    margin: 0;
    font-size: var(--ds-font-subheading-size);
    font-weight: var(--ds-font-subheading-weight);
    line-height: var(--ds-font-subheading-line-height);
    letter-spacing: var(--ds-font-subheading-letter-spacing);
  }
</style>
