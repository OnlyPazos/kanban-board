<!--
  Tablero de un proyecto: cabecera con el nombre del proyecto (siempre el
  valor actual del store, así que se actualiza al editarlo), enlace para
  volver a la lista y botón "Editar". Debajo, exactamente 4 columnas en el
  orden de `CARD_STATUSES` (constante única del dominio), cada una con el
  `Column` del sistema de diseño (WI-AC-049, D-023): color e icono de su
  estado (`CARD_STATUS_DS`) y contador de tarjetas visibles (D-024). Cada columna lista
  sus tarjetas no archivadas en el orden automático de `sortCards` (componente `Card`, con el tipo y la prioridad
  como `Badge` según `CARD_TYPE_TONE`/`PRIORITY_TONE`, la franja superior por prioridad
  de `PRIORITY_DS` y el icono de `PRIORITY_ICON`, WI-AC-052; al abrirla avisa con
  `oneditcard`) y en su cabecera el botón de solo icono "Añadir tarjeta en <estado>" (WI-AC-050), que avisa con el estado de
  la columna.

  Arrastrar y soltar (WI-AC-015, `svelte-dnd-action`): cada lista de tarjetas
  es una zona de arrastre, con ratón, táctil y teclado (Espacio/Intro para
  coger la tarjeta, Tab para llevarla a otra columna, Escape para soltarla).
  Al soltar en otra columna avisa con `onmovecard` (la app cambia `status` y
  lo persiste); al soltar en la misma se descarta el orden visual y se
  re-aplica `sortCards`. La copia que sigue al puntero lleva el aspecto
  `dragging` de `Card`; el hueco donde caerá es un `DropPlaceholder` activo y
  la columna que lo contiene se marca como destino (`dropTarget`). Una columna
  sin tarjetas visibles muestra "Sin tarjetas" (WI-AC-051, D-023).

  Filtro por tipo (WI-AC-018, D-012): un `Chip` por tipo (tono de
  `CARD_TYPE_TONE`) en un grupo "Filtrar por tipo", de selección múltiple.
  Solo se ven las tarjetas de los tipos seleccionados; sin ninguno, se ven
  todas. La selección llega en `typeFilter` y cada cambio se avisa con
  `ontypefilterchange` (la app la recuerda por proyecto).

  Archivo (WI-AC-021): cada tarjeta tiene "Archivar", que avisa con
  `onarchivecard` sin pedir confirmación. La cabecera enlaza con la vista de
  tarjetas archivadas del proyecto. El tablero no ofrece borrado definitivo.

  Export (WI-AC-028): "Exportar proyecto" avisa con `onexport`. Es una acción
  de lectura, independiente de las de edición (sigue disponible en el
  tablero de solo lectura de WI-AC-026).

  Solo lectura (WI-AC-026, D-007): si el proyecto está archivado, el tablero
  se puede ver (tarjetas, filtro, tarjetas archivadas, "Exportar proyecto")
  pero no ofrece "Añadir tarjeta", "Archivar", "Editar proyecto" ni abrir una
  tarjeta para editarla, y el arrastre está desactivado (`dragDisabled`).
  El enlace de vuelta lleva a la vista de proyectos archivados. La guarda
  también está en el dominio (`ArchivedProjectError`).
-->
<script lang="ts">
  import Plus from '@lucide/svelte/icons/plus';
  import { Alert, Badge, Button, Card, Chip, Column, DropPlaceholder } from 'design-system';
  import {
    dndzone,
    SHADOW_ITEM_MARKER_PROPERTY_NAME,
    type DndEvent,
  } from 'svelte-dnd-action';
  import {
    CARD_STATUS_DS,
    CARD_STATUS_LABELS,
    CARD_STATUSES,
    CARD_TYPE_LABELS,
    CARD_TYPE_TONE,
    CARD_TYPES,
    matchesTypeFilter,
    PRIORITY_DS,
    PRIORITY_LABELS,
    PRIORITY_TONE,
    sortCards,
    toggleTypeFilter,
    type Card as CardData,
    type CardStatus,
    type CardType,
    type Project,
  } from '../domain';
  import { ARCHIVED_PROJECTS_HREF, archivedCardsHref, LIST_HREF } from '../lib/route';
  import { applyDndAriaStrings } from '../lib/dnd';
  import { PRIORITY_ICON } from '../lib/icons';

  let {
    project,
    cards = [],
    onedit,
    onaddcard,
    oneditcard,
    onmovecard,
    onarchivecard,
    typeFilter = [],
    ontypefilterchange,
    onexport,
  }: {
    project: Project;
    /** Tarjetas del proyecto. */
    cards?: CardData[];
    onedit?: (project: Project) => void;
    onaddcard?: (status: CardStatus) => void;
    oneditcard?: (card: CardData) => void;
    /** Al soltar una tarjeta en otra columna. Si la promesa falla, el tablero vuelve a los datos. */
    onmovecard?: (card: CardData, status: CardStatus) => unknown;
    /** "Archivar" en una tarjeta (sin confirmación, AC-021). */
    onarchivecard?: (card: CardData) => unknown;
    /** Tipos seleccionados en el filtro; vacío → se ven todas las tarjetas. */
    typeFilter?: CardType[];
    /** Al cambiar la selección del filtro por tipo. */
    ontypefilterchange?: (types: CardType[]) => unknown;
    /** "Exportar proyecto" (AC-029). */
    onexport?: (project: Project) => void;
  } = $props();

  /** Proyecto archivado → tablero de solo lectura (AC-026). */
  const readonly = $derived(project.archived);

  function setTypeSelected(type: CardType, selected: boolean) {
    Promise.resolve(ontypefilterchange?.(toggleTypeFilter(typeFilter, type, selected))).catch((error: unknown) => {
      console.error('No se pudo guardar el filtro por tipo', error);
    });
  }

  function archive(card: CardData) {
    Promise.resolve(onarchivecard?.(card)).catch((error: unknown) => {
      console.error('No se pudo archivar la tarjeta', error);
    });
  }

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
      if (card.projectId === project.id && !card.archived && matchesTypeFilter(card, typeFilter)) {
        groups[card.status].push(card);
      }
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

  const isShadow = (card: DndCard) => !!card[SHADOW_ITEM_MARKER_PROPERTY_NAME];

  /*
   * El elemento que sigue al puntero es una copia estática del `li` de la
   * tarjeta que crea la librería; su `article` conserva la clase de ámbito del
   * `Card`, así que basta con añadirle la de `dragging` para que se vea como
   * tarjeta arrastrada (sombra lg y giro).
   */
  function markDragging(element?: HTMLElement) {
    element?.querySelector('article')?.classList.add('ds-card--dragging');
  }

  function handleConsider(status: CardStatus, event: CustomEvent<DndEvent<DndCard>>) {
    columnItems = { ...columnItems, [status]: event.detail.items };
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

<div class="board">
  <div class="board__header">
    {#if readonly}
      <a class="board__back" href={ARCHIVED_PROJECTS_HREF}>← Volver a proyectos archivados</a>
    {:else}
      <a class="board__back" href={LIST_HREF}>← Volver a proyectos</a>
    {/if}
    <div class="board__title-row">
      <h1 class="board__title">{project.name}</h1>
      <div class="board__actions">
        <a class="board__link" href={archivedCardsHref(project.id)}>Tarjetas archivadas</a>
        <Button variant="secondary" size="sm" onclick={() => onexport?.(project)}>Exportar proyecto</Button>
        {#if !readonly}
          <Button variant="secondary" size="sm" onclick={() => onedit?.(project)}>Editar proyecto</Button>
        {/if}
      </div>
    </div>
    {#if readonly}
      <Alert tone="info" title="Proyecto archivado">
        Este tablero es de solo lectura: no se pueden crear, editar, mover ni archivar tarjetas, ni editar el
        proyecto. Puedes exportarlo o restaurarlo desde «Proyectos archivados».
      </Alert>
    {/if}
    <div class="board__filter" role="group" aria-label="Filtrar por tipo">
      {#each CARD_TYPES as type (type)}
        <Chip
          tone={CARD_TYPE_TONE[type]}
          bind:selected={() => typeFilter.includes(type), (selected) => setTypeSelected(type, selected)}
        >
          {CARD_TYPE_LABELS[type]}
        </Chip>
      {/each}
    </div>
  </div>

  <div class="board__columns" data-testid="board-columns">
    {#each CARD_STATUSES as status (status)}
      <div class="board__column" data-status={status}>
        <Column
          title={CARD_STATUS_LABELS[status]}
          status={CARD_STATUS_DS[status]}
          headingLevel={2}
          count={cardsByStatus[status].length}
          dropTarget={columnItems[status].some(isShadow)}
        >
          {#snippet actions()}
            {#if !readonly}
              <!-- "Añadir tarjeta" en la cabecera, solo icono (WI-AC-050, D-025). -->
              <Button
                variant="ghost"
                size="sm"
                icon={Plus}
                aria-label={`Añadir tarjeta en ${CARD_STATUS_LABELS[status]}`}
                onclick={() => onaddcard?.(status)}
              />
            {/if}
          {/snippet}
          <div class="board__zone">
            <ul
              class="board__cards"
              aria-label={CARD_STATUS_LABELS[status]}
              use:dndzone={{
                items: columnItems[status],
                flipDurationMs: 0,
                dropAnimationDisabled: reducedMotion,
                // El destino lo pinta `Column` (`dropTarget`), no la librería.
                dropTargetStyle: {},
                dropTargetClasses: [],
                dragDisabled: readonly,
                // Sin arrastre, las tarjetas no son paradas de tabulación "cogibles".
                zoneItemTabIndex: readonly ? -1 : 0,
                transformDraggedElement: markDragging,
              }}
              onconsider={(event) => handleConsider(status, event)}
              onfinalize={(event) => handleFinalize(status, event)}
            >
              {#each columnItems[status] as card (card.id)}
                {@const shadow = isShadow(card)}
                <li
                  aria-label={card.title}
                  data-card-id={card.id}
                  data-type={card.type}
                  data-priority={card.priority ?? ''}
                  data-dnd-shadow={shadow || undefined}
                >
                  {#if shadow}
                    <!-- Hueco donde caerá la tarjeta. La librería oculta el `li` del hueco
                         (visibility: hidden); el placeholder se vuelve a mostrar. -->
                    <div class="board__shadow"><DropPlaceholder active /></div>
                  {:else}
                    <Card
                      title={card.title}
                      description={card.description}
                      priority={card.priority ? PRIORITY_DS[card.priority] : undefined}
                      {readonly}
                      onopen={readonly ? undefined : () => oneditcard?.(card)}
                    >
                      {#snippet tags()}
                        <Badge tone={CARD_TYPE_TONE[card.type]}>{CARD_TYPE_LABELS[card.type]}</Badge>
                        {#if card.priority !== null}
                          <Badge tone={PRIORITY_TONE[card.priority]} icon={PRIORITY_ICON[card.priority]}>
                            {PRIORITY_LABELS[card.priority]}
                          </Badge>
                        {/if}
                      {/snippet}
                      {#snippet footer()}
                        {#if !readonly}
                          <Button variant="ghost" size="sm" onclick={() => archive(card)}>Archivar</Button>
                        {/if}
                      {/snippet}
                    </Card>
                  {/if}
                </li>
              {/each}
            </ul>
            {#if columnItems[status].length === 0}
              <!-- Va superpuesto a la zona (no la sustituye): se puede seguir soltando encima. -->
              <div class="board__empty"><DropPlaceholder label="Sin tarjetas" /></div>
            {/if}
          </div>
        </Column>
      </div>
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

  .board__back,
  .board__link {
    align-self: flex-start;
    color: var(--ds-color-action-primary);
    font-size: var(--ds-font-label-size);
    font-weight: var(--ds-font-label-weight);
    line-height: var(--ds-font-label-line-height);
    border-radius: var(--ds-radii-small);
  }

  .board__back:focus-visible,
  .board__link:focus-visible {
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

  .board__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ds-spacing-3);
  }

  .board__link {
    align-self: center;
  }

  .board__title {
    margin: 0;
    overflow-wrap: anywhere;
    font-size: var(--ds-font-heading-size);
    font-weight: var(--ds-font-heading-weight);
    line-height: var(--ds-font-heading-line-height);
    letter-spacing: var(--ds-font-heading-letter-spacing);
  }

  .board__filter {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ds-spacing-2);
  }

  .board__columns {
    /* `Column` tiene ancho fijo (column.width): con 4 columnas no caben en
       móvil y el tablero se desplaza horizontalmente dentro de sí mismo,
       nunca la página (AC-020). */
    display: flex;
    align-items: flex-start;
    gap: var(--ds-spacing-4);
    overflow-x: auto;
    /* Hueco para el anillo de foco y el contorno de destino al desplazar. */
    padding: var(--ds-spacing-2);
    margin: calc(var(--ds-spacing-2) * -1);
  }

  /* Envoltorio de la app alrededor de `Column` (que no admite atributos
     propios): lleva `data-status` y es el elemento flexible del tablero. */
  .board__column {
    display: flex;
    flex: 0 0 auto;
  }

  /* Zona de arrastre y, si la columna está vacía, "Sin tarjetas" en la misma
     celda: el placeholder queda encima de la lista sin capturar el puntero. */
  .board__zone {
    display: grid;
  }

  .board__cards,
  .board__empty {
    grid-area: 1 / 1;
  }

  .board__empty {
    display: flex;
    flex-direction: column;
    pointer-events: none;
  }

  .board__shadow {
    visibility: visible;
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

  @media (prefers-reduced-motion: reduce) {
    /* Copia que sigue al puntero: sin transiciones de posición ni tamaño. */
    :global(#dnd-action-dragged-el) {
      transition: none !important;
    }
  }
</style>
