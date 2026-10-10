<!--
  Diálogo "Crear proyecto": nombre + descripción. La validación completa del
  nombre llega en WI-AC-003; aquí solo se exige un nombre no vacío.
-->
<script lang="ts">
  import { Button, Dialog, Input, Textarea } from 'design-system';
  import type { NewProjectInput } from '../domain';

  let {
    open = $bindable(false),
    oncreate,
  }: {
    open?: boolean;
    oncreate: (input: NewProjectInput) => Promise<unknown> | void;
  } = $props();

  const formId = $props.id();
  let name = $state('');
  let description = $state('');
  let saving = $state(false);

  function reset() {
    name = '';
    description = '';
    saving = false;
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (saving || name.trim() === '') return;
    saving = true;
    try {
      await oncreate({ name, description });
      open = false;
    } finally {
      saving = false;
    }
  }
</script>

<Dialog bind:open title="Crear proyecto" onclose={reset}>
  <form id={formId} class="create-project" onsubmit={submit}>
    <Input label="Nombre" bind:value={name} required maxlength={80} autocomplete="off" />
    <Textarea label="Descripción" bind:value={description} rows={3} />
  </form>

  {#snippet actions()}
    <Button variant="secondary" onclick={() => (open = false)}>Cancelar</Button>
    <Button type="submit" form={formId} loading={saving}>Crear</Button>
  {/snippet}
</Dialog>

<style>
  .create-project {
    display: flex;
    flex-direction: column;
    gap: var(--ds-spacing-4);
  }
</style>
