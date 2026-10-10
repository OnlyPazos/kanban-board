<!--
  Diálogo "Crear proyecto": nombre + descripción. Si el nombre no es válido
  (`validateProjectName`), muestra el error junto al campo y no crea nada.
-->
<script lang="ts">
  import { Button, Dialog, Input, Textarea } from 'design-system';
  import { PROJECT_NAME_MAX_LENGTH, validateProjectName, type NewProjectInput } from '../domain';

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
  let nameError = $state<string | null>(null);

  function reset() {
    name = '';
    description = '';
    saving = false;
    nameError = null;
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (saving) return;
    nameError = validateProjectName(name);
    if (nameError) return;
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
  <form id={formId} class="create-project" novalidate onsubmit={submit}>
    <Input
      label="Nombre"
      bind:value={name}
      error={nameError ?? undefined}
      required
      maxlength={PROJECT_NAME_MAX_LENGTH}
      autocomplete="off"
    />
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
