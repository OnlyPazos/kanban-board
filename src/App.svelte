<script lang="ts">
  import { onMount } from 'svelte';
  import AppHeader from './lib/AppHeader.svelte';
  import ProjectList from './views/ProjectList.svelte';
  import CreateProjectDialog from './views/CreateProjectDialog.svelte';
  import { createIdbRepository, type Repository } from './persistence/repository';
  import { AppStore } from './state/app-store.svelte';

  let { repository = createIdbRepository() }: { repository?: Repository } = $props();

  // El repositorio se fija al montar la app.
  // svelte-ignore state_referenced_locally
  const store = new AppStore(repository);
  let creating = $state(false);

  onMount(() => {
    store.hydrate().catch((error: unknown) => {
      console.error('No se pudieron cargar los datos guardados', error);
    });
  });
</script>

<AppHeader />
<main>
  <ProjectList projects={store.projects} oncreate={() => (creating = true)} />
</main>
<CreateProjectDialog bind:open={creating} oncreate={(input) => store.createProject(input)} />
