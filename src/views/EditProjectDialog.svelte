<!--
  Diálogo "Editar proyecto": nombre + descripción del proyecto indicado. Al
  abrirse parte de los valores actuales. La validación completa del nombre
  llega en WI-AC-003; aquí solo se exige un nombre no vacío.
-->
<script lang="ts">
  import { Button, Dialog, Input, Textarea } from 'design-system';
  import type { Project, ProjectEdit } from '../domain';

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

  // Carga los valores del proyecto cada vez que se abre el diálogo.
  $effect.pre(() => {
    if (open && project) {
      name = project.name;
      description = project.description;
      saving = false;
    }
  });

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!project || saving || name.trim() === '') return;
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
  <form id={formId} class="edit-project" onsubmit={submit}>
    <Input label="Nombre" bind:value={name} required maxlength={80} autocomplete="off" />
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
