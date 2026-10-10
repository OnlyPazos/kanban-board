<!--
  Diálogo "Añadir tarjeta": solo el título. La tarjeta se crea en la columna
  `status` desde la que se abrió (tipo Novedad, sin prioridad). Si el título no
  es válido (`validateCardTitle`), muestra el error junto al campo y no crea nada.
-->
<script lang="ts">
  import { Button, Dialog, Input } from 'design-system';
  import { CARD_STATUS_LABELS, CARD_TITLE_MAX_LENGTH, validateCardTitle, type CardStatus } from '../domain';

  let {
    open = $bindable(false),
    status,
    oncreate,
  }: {
    open?: boolean;
    status: CardStatus;
    oncreate: (title: string, status: CardStatus) => Promise<unknown> | void;
  } = $props();

  const formId = $props.id();
  let title = $state('');
  let saving = $state(false);
  let titleError = $state<string | null>(null);

  function reset() {
    title = '';
    saving = false;
    titleError = null;
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (saving) return;
    titleError = validateCardTitle(title);
    if (titleError) return;
    saving = true;
    try {
      await oncreate(title, status);
      open = false;
    } finally {
      saving = false;
    }
  }
</script>

<Dialog bind:open title="Añadir tarjeta" description={`Columna: ${CARD_STATUS_LABELS[status]}`} onclose={reset}>
  <form id={formId} class="create-card" novalidate onsubmit={submit}>
    <Input
      label="Título"
      bind:value={title}
      error={titleError ?? undefined}
      required
      maxlength={CARD_TITLE_MAX_LENGTH}
      autocomplete="off"
    />
  </form>

  {#snippet actions()}
    <Button variant="secondary" onclick={() => (open = false)}>Cancelar</Button>
    <Button type="submit" form={formId} loading={saving}>Añadir</Button>
  {/snippet}
</Dialog>

<style>
  .create-card {
    display: flex;
    flex-direction: column;
    gap: var(--ds-spacing-4);
  }
</style>
