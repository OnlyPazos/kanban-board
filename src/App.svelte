<script lang="ts">
  import { onMount } from 'svelte';
  import AppHeader from './lib/AppHeader.svelte';
  import ProjectList from './views/ProjectList.svelte';
  import CreateProjectDialog from './views/CreateProjectDialog.svelte';
  import EditProjectDialog from './views/EditProjectDialog.svelte';
  import type { Project } from './domain';
  import { createIdbRepository, type Repository } from './persistence/repository';
  import { AppStore } from './state/app-store.svelte';

  let { repository = createIdbRepository() }: { repository?: Repository } = $props();

  // El repositorio se fija al montar la app.
  // svelte-ignore state_referenced_locally
  const store = new AppStore(repository);
  let creating = $state(false);
  let editing = $state(false);
  let editTarget = $state<Project | null>(null);

  function startEdit(project: Project) {
    editTarget = project;
    editing = true;
  }

  onMount(() => {
    store.hydrate().catch((error: unknown) => {
      console.error('No se pudieron cargar los datos guardados', error);
    });
  });
</script>

<AppHeader />
<main>
  <ProjectList projects={store.projects} oncreate={() => (creating = true)} onedit={startEdit} />
</main>
<CreateProjectDialog bind:open={creating} oncreate={(input) => store.createProject(input)} />
<EditProjectDialog
  project={editTarget}
  bind:open={editing}
  onsave={(id, edit) => store.updateProject(id, edit)}
/>
