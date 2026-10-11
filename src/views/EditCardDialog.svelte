<!--
  Diálogo "Editar tarjeta": título, tipo, estado, descripción (multilínea) y
  prioridad (Alta, Media, Baja o Sin prioridad) de la tarjeta indicada. Al
  abrirse parte de sus valores actuales. Las fechas de creación y de última
  modificación se muestran en solo lectura. Si el título no es válido
  (`validateCardTitle`), muestra el error junto al campo y no guarda nada.
  Sin `maxlength`: AC-011 exige ver el error con más de 120 caracteres, no recortar.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import { Button, Dialog, Input, Select, Textarea } from 'design-system';
  import {
    CARD_STATUS_LABELS,
    CARD_STATUSES,
    CARD_TYPE_LABELS,
    CARD_TYPES,
    NO_PRIORITY_LABEL,
    PRIORITIES,
    PRIORITY_LABELS,
    validateCardTitle,
    type Card,
    type CardEdit,
    type CardStatus,
    type CardType,
    type Priority,
  } from '../domain';

  let {
    card,
    open = $bindable(false),
    onsave,
  }: {
    card: Card | null;
    open?: boolean;
    onsave: (id: string, edit: CardEdit) => Promise<unknown> | void;
  } = $props();

  /** Valor del selector para "Sin prioridad" (`priority: null`). */
  const NO_PRIORITY = '';

  const typeOptions = CARD_TYPES.map((value) => ({ value, label: CARD_TYPE_LABELS[value] }));
  const statusOptions = CARD_STATUSES.map((value) => ({ value, label: CARD_STATUS_LABELS[value] }));
  const priorityOptions = [
    ...PRIORITIES.map((value) => ({ value, label: PRIORITY_LABELS[value] })),
    { value: NO_PRIORITY, label: NO_PRIORITY_LABEL },
  ];

  const dateFormat = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' });

  const formId = $props.id();
  let title = $state('');
  let type = $state<string>('novedad');
  let status = $state<string>('sin-empezar');
  let description = $state('');
  let priority = $state<string>(NO_PRIORITY);
  let saving = $state(false);
  let titleError = $state<string | null>(null);

  // Solo cambia si es otra tarjeta, no cuando cambian sus valores.
  const cardId = $derived(card?.id);

  // Carga los valores de la tarjeta cada vez que se abre el diálogo. Si otra
  // pestaña guarda la misma tarjeta mientras está abierto (AC-038), no se pisa
  // lo que se está escribiendo: al guardar, gana el último cambio guardado.
  $effect.pre(() => {
    if (open && cardId) {
      untrack(() => {
        if (!card) return;
        title = card.title;
        type = card.type;
        status = card.status;
        description = card.description;
        priority = card.priority ?? NO_PRIORITY;
        saving = false;
        titleError = null;
      });
    }
  });

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!card || saving) return;
    titleError = validateCardTitle(title);
    if (titleError) return;
    saving = true;
    try {
      await onsave(card.id, {
        title,
        type: type as CardType,
        status: status as CardStatus,
        description,
        priority: priority === NO_PRIORITY ? null : (priority as Exclude<Priority, null>),
      });
      open = false;
    } catch (error) {
      // AC-044: el aviso de AC-035 ya lo muestra App.svelte; el diálogo sigue
      // abierto con lo escrito y no queda ningún rechazo sin capturar.
      console.error('No se pudo guardar la tarjeta', error);
    } finally {
      saving = false;
    }
  }
</script>

<Dialog bind:open title="Editar tarjeta">
  <form id={formId} class="edit-card" novalidate onsubmit={submit}>
    <Input
      label="Título"
      bind:value={title}
      error={titleError ?? undefined}
      required
      autocomplete="off"
    />
    <Select label="Tipo" bind:value={type} options={typeOptions} />
    <Select label="Estado" bind:value={status} options={statusOptions} />
    <Textarea label="Descripción" bind:value={description} rows={5} />
    <Select label="Prioridad" bind:value={priority} options={priorityOptions} />
    {#if card}
      <dl class="edit-card__dates">
        <div class="edit-card__date">
          <dt>Creada</dt>
          <dd><time datetime={card.createdAt} data-testid="card-created-at">{dateFormat.format(new Date(card.createdAt))}</time></dd>
        </div>
        <div class="edit-card__date">
          <dt>Última modificación</dt>
          <dd><time datetime={card.updatedAt} data-testid="card-updated-at">{dateFormat.format(new Date(card.updatedAt))}</time></dd>
        </div>
      </dl>
    {/if}
  </form>

  {#snippet actions()}
    <Button variant="secondary" onclick={() => (open = false)}>Cancelar</Button>
    <Button type="submit" form={formId} loading={saving}>Guardar cambios</Button>
  {/snippet}
</Dialog>

<style>
  .edit-card {
    display: flex;
    flex-direction: column;
    gap: var(--ds-spacing-4);
  }

  .edit-card__dates {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ds-spacing-2) var(--ds-spacing-5);
    margin: 0;
    color: var(--ds-color-text-secondary);
    font-size: var(--ds-font-caption-size);
    line-height: var(--ds-font-caption-line-height);
    letter-spacing: var(--ds-font-caption-letter-spacing);
  }

  .edit-card__date {
    display: flex;
    gap: var(--ds-spacing-1);
  }

  .edit-card__date dt {
    font-weight: var(--ds-font-label-weight);
  }

  .edit-card__date dt::after {
    content: ':';
  }

  .edit-card__date dd {
    margin: 0;
  }
</style>
