<!--
  Vista "Tarjetas archivadas" de un proyecto (WI-AC-021). Lista las tarjetas
  archivadas del proyecto con todos sus campos: título, tipo y prioridad
  (`Badge` según `CARD_TYPE_TONE`/`PRIORITY_TONE`), descripción, estado y
  fechas de creación y última modificación. Cada una ofrece:
  - "Restaurar" (AC-022): avisa con `onrestorecard`; la app pone `archived` a
    `false` y la tarjeta vuelve a la columna de su estado.
  - "Borrar definitivamente" (AC-023): pide confirmación en un `Dialog`
    pequeño; solo al confirmar avisa con `ondeletecard`.
-->
<script lang="ts">
  import { Badge, Button, Card, Dialog } from 'design-system';
  import {
    CARD_STATUS_LABELS,
    CARD_TYPE_LABELS,
    CARD_TYPE_TONE,
    PRIORITY_LABELS,
    PRIORITY_TONE,
    sortCards,
    type Card as CardData,
    type Project,
  } from '../domain';
  import { boardHref } from '../lib/route';

  let {
    project,
    cards = [],
    onrestorecard,
    ondeletecard,
  }: {
    project: Project;
    /** Tarjetas (de este u otros proyectos); solo se muestran las archivadas de `project`. */
    cards?: CardData[];
    onrestorecard?: (card: CardData) => unknown;
    /** Solo se llama tras confirmar el borrado definitivo. */
    ondeletecard?: (card: CardData) => unknown;
  } = $props();

  const archived = $derived(sortCards(cards.filter((c) => c.projectId === project.id && c.archived)));

  const dateFormat = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' });

  let confirming = $state(false);
  let deleteTarget = $state<CardData | null>(null);
  let deleting = $state(false);

  function restore(card: CardData) {
    Promise.resolve(onrestorecard?.(card)).catch((error: unknown) => {
      console.error('No se pudo restaurar la tarjeta', error);
    });
  }

  function askDelete(card: CardData) {
    deleteTarget = card;
    confirming = true;
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    deleting = true;
    try {
      await ondeletecard?.(deleteTarget);
      confirming = false;
    } catch (error: unknown) {
      console.error('No se pudo borrar la tarjeta', error);
    } finally {
      deleting = false;
    }
  }
</script>

<section class="archived" aria-labelledby="archived-title">
  <div class="archived__header">
    <a class="archived__back" href={boardHref(project.id)}>← Volver al tablero</a>
    <h1 id="archived-title" class="archived__title">Tarjetas archivadas</h1>
    <p class="archived__project">{project.name}</p>
  </div>

  {#if archived.length > 0}
    <ul class="archived__items">
      {#each archived as card (card.id)}
        <li aria-label={card.title} data-card-id={card.id} data-status={card.status}>
          <Card title={card.title} description={card.description} readonly>
            {#snippet tags()}
              <Badge tone={CARD_TYPE_TONE[card.type]}>{CARD_TYPE_LABELS[card.type]}</Badge>
              {#if card.priority !== null}
                <Badge tone={PRIORITY_TONE[card.priority]}>{PRIORITY_LABELS[card.priority]}</Badge>
              {/if}
            {/snippet}
            {#snippet footer()}
              <dl class="archived__meta">
                <div class="archived__meta-item">
                  <dt>Estado</dt>
                  <dd data-testid="archived-card-status">{CARD_STATUS_LABELS[card.status]}</dd>
                </div>
                <div class="archived__meta-item">
                  <dt>Creada</dt>
                  <dd><time datetime={card.createdAt}>{dateFormat.format(new Date(card.createdAt))}</time></dd>
                </div>
                <div class="archived__meta-item">
                  <dt>Última modificación</dt>
                  <dd><time datetime={card.updatedAt}>{dateFormat.format(new Date(card.updatedAt))}</time></dd>
                </div>
              </dl>
              <div class="archived__actions">
                <Button
                  variant="secondary"
                  size="sm"
                  aria-label={`Restaurar ${card.title}`}
                  onclick={() => restore(card)}>Restaurar</Button
                >
                <Button
                  variant="danger"
                  size="sm"
                  aria-label={`Borrar definitivamente ${card.title}`}
                  onclick={() => askDelete(card)}>Borrar definitivamente</Button
                >
              </div>
            {/snippet}
          </Card>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="archived__empty">No hay tarjetas archivadas en este proyecto.</p>
  {/if}
</section>

<Dialog
  bind:open={confirming}
  title="¿Borrar definitivamente la tarjeta?"
  description={deleteTarget
    ? `Se borrará la tarjeta «${deleteTarget.title}» para siempre. Esta acción no se puede deshacer.`
    : undefined}
  size="sm"
>
  {#snippet actions()}
    <Button variant="secondary" onclick={() => (confirming = false)}>Cancelar</Button>
    <Button variant="danger" loading={deleting} onclick={confirmDelete}>Borrar definitivamente</Button>
  {/snippet}
</Dialog>

<style>
  .archived {
    padding: var(--ds-spacing-5) var(--ds-spacing-4);
  }

  .archived__header {
    display: flex;
    flex-direction: column;
    gap: var(--ds-spacing-2);
    margin: 0 0 var(--ds-spacing-5);
  }

  .archived__back {
    align-self: flex-start;
    color: var(--ds-color-action-primary);
    font-size: var(--ds-font-label-size);
    font-weight: var(--ds-font-label-weight);
    line-height: var(--ds-font-label-line-height);
    border-radius: var(--ds-radii-small);
  }

  .archived__back:focus-visible {
    outline: var(--ds-focus-ring-width) solid var(--ds-color-focus);
    outline-offset: var(--ds-focus-ring-offset);
  }

  .archived__title {
    margin: 0;
    font-size: var(--ds-font-heading-size);
    font-weight: var(--ds-font-heading-weight);
    line-height: var(--ds-font-heading-line-height);
    letter-spacing: var(--ds-font-heading-letter-spacing);
  }

  .archived__project {
    margin: 0;
    overflow-wrap: anywhere;
    color: var(--ds-color-text-secondary);
  }

  .archived__items {
    display: flex;
    flex-direction: column;
    gap: var(--ds-spacing-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .archived__meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ds-spacing-2) var(--ds-spacing-5);
    margin: 0;
  }

  .archived__meta-item {
    display: flex;
    gap: var(--ds-spacing-1);
  }

  .archived__meta-item dt {
    font-weight: var(--ds-font-label-weight);
  }

  .archived__meta-item dt::after {
    content: ':';
  }

  .archived__meta-item dd {
    margin: 0;
  }

  .archived__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ds-spacing-2);
  }

  .archived__empty {
    margin: 0;
    color: var(--ds-color-text-secondary);
  }
</style>
