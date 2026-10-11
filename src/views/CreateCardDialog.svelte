<!--
  Diálogo "Añadir tarjeta": solo el título. La tarjeta se crea en la columna
  `status` desde la que se abrió (tipo Novedad, sin prioridad). Si el título no
  es válido (`validateCardTitle`), muestra el error junto al campo y no crea nada.
  Sin `maxlength`: AC-011 exige ver el error con más de 120 caracteres, no recortar.
-->
<script lang="ts">
  import { Button, Dialog, Input } from 'design-system';
  import { CARD_STATUS_LABELS, validateCardTitle, type CardStatus } from '../domain';

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
    } catch (error) {
      // AC-044: el aviso de AC-035 ya lo muestra App.svelte; el diálogo sigue
      // abierto con lo escrito y no queda ningún rechazo sin capturar.
      console.error('No se pudo crear la tarjeta', error);
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
