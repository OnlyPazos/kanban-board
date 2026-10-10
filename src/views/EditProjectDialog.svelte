<!--
  Diálogo "Editar proyecto": nombre + descripción del proyecto indicado. Al
  abrirse parte de los valores actuales. Si el nombre no es válido
  (`validateProjectName`), muestra el error junto al campo y no modifica nada.
-->
<script lang="ts">
  import { Button, Dialog, Input, Textarea } from 'design-system';
  import { PROJECT_NAME_MAX_LENGTH, validateProjectName, type Project, type ProjectEdit } from '../domain';

  let {
    project,
    open = $bindable(false),
    onsave,
  }: {
    project: Project | null;
    open?: boolean;
    onsave: (id: string, edit: ProjectEdit) => Promise<unknown> | void;
  } = $props();

  const formId = $props.id();
  let name = $state('');
  let description = $state('');
  let saving = $state(false);
  let nameError = $state<string | null>(null);

  // Carga los valores del proyecto cada vez que se abre el diálogo.
  $effect.pre(() => {
    if (open && project) {
      name = project.name;
      description = project.description;
      saving = false;
      nameError = null;
    }
  });

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!project || saving) return;
    nameError = validateProjectName(name);
    if (nameError) return;
    saving = true;
    try {
      await onsave(project.id, { name, description });
      open = false;
    } finally {
      saving = false;
    }
  }
</script>

<Dialog bind:open title="Editar proyecto">
  <form id={formId} class="edit-project" novalidate onsubmit={submit}>
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
    <Button type="submit" form={formId} loading={saving}>Guardar cambios</Button>
  {/snippet}
</Dialog>

<style>
  .edit-project {
    display: flex;
    flex-direction: column;
    gap: var(--ds-spacing-4);
  }
</style>
