<script lang="ts">
  import { onMount } from 'svelte';
  import AppHeader from './lib/AppHeader.svelte';
  import ProjectList from './views/ProjectList.svelte';
  import CreateProjectDialog from './views/CreateProjectDialog.svelte';
  import EditProjectDialog from './views/EditProjectDialog.svelte';
  import Board from './views/Board.svelte';
  import CreateCardDialog from './views/CreateCardDialog.svelte';
  import EditCardDialog from './views/EditCardDialog.svelte';
  import { boardHref, LIST_HREF, parseRoute } from './lib/route';
  import type { Card, CardStatus, Project } from './domain';
  import { createIdbRepository, type Repository } from './persistence/repository';
  import { AppStore } from './state/app-store.svelte';

  let { repository = createIdbRepository() }: { repository?: Repository } = $props();

  // El repositorio se fija al montar la app.
  // svelte-ignore state_referenced_locally
  const store = new AppStore(repository);
  let creating = $state(false);
  let editing = $state(false);
  let editTarget = $state<Project | null>(null);
  let addingCard = $state(false);
  let addCardStatus = $state<CardStatus>('sin-empezar');
  let editingCard = $state(false);
  let editCardId = $state<string | null>(null);
  // Siempre el valor actual del store para la tarjeta en edición.
  const editCardTarget = $derived(store.cards.find((c) => c.id === editCardId) ?? null);
  let route = $state(parseRoute(window.location.hash));
  // Siempre el valor actual del store: tras editar, el tablero ve el nuevo nombre.
  const boardProject = $derived.by(() => {
    const current = route;
    if (current.name !== 'board') return undefined;
    return store.projects.find((p) => p.id === current.projectId);
  });

  function openBoard(project: Project) {
    window.location.hash = boardHref(project.id);
  }

  function startAddCard(status: CardStatus) {
    addCardStatus = status;
    addingCard = true;
  }

  function startEditCard(card: Card) {
    editCardId = card.id;
    editingCard = true;
  }

  function startEdit(project: Project) {
    editTarget = project;
    editing = true;
  }

  onMount(() => {
    const syncRoute = () => (route = parseRoute(window.location.hash));
    window.addEventListener('hashchange', syncRoute);
    store.hydrate().catch((error: unknown) => {
      console.error('No se pudieron cargar los datos guardados', error);
    });
    return () => window.removeEventListener('hashchange', syncRoute);
  });
</script>

<AppHeader />
<main>
  {#if route.name === 'board'}
    {#if boardProject}
      <Board project={boardProject} cards={store.cards} onedit={startEdit} onaddcard={startAddCard} oneditcard={startEditCard} />
    {:else if store.loaded}
      <section class="not-found">
        <h1 class="not-found__title">Proyecto no encontrado</h1>
        <a class="not-found__back" href={LIST_HREF}>← Volver a proyectos</a>
      </section>
    {/if}
  {:else}
    <ProjectList
      projects={store.projects}
      cards={store.cards}
      oncreate={() => (creating = true)}
      onedit={startEdit}
      onopen={openBoard}
    />
  {/if}
</main>
<CreateProjectDialog bind:open={creating} oncreate={(input) => store.createProject(input)} />
{#if boardProject}
  {@const projectId = boardProject.id}
  <CreateCardDialog
    bind:open={addingCard}
    status={addCardStatus}
    oncreate={(title, status) => store.createCard(projectId, title, status)}
  />
{/if}
<EditCardDialog card={editCardTarget} bind:open={editingCard} onsave={(id, edit) => store.updateCard(id, edit)} />
<EditProjectDialog
  project={editTarget}
  bind:open={editing}
  onsave={(id, edit) => store.updateProject(id, edit)}
/>

<style>
  .not-found {
    display: flex;
    flex-direction: column;
    gap: var(--ds-spacing-3);
    padding: var(--ds-spacing-5) var(--ds-spacing-4);
  }

  .not-found__title {
    margin: 0;
    font-size: var(--ds-font-heading-size);
    font-weight: var(--ds-font-heading-weight);
    line-height: var(--ds-font-heading-line-height);
    letter-spacing: var(--ds-font-heading-letter-spacing);
  }

  .not-found__back {
    align-self: flex-start;
    color: var(--ds-color-action-primary);
    border-radius: var(--ds-radii-small);
  }

  .not-found__back:focus-visible {
    outline: var(--ds-focus-ring-width) solid var(--ds-color-focus);
    outline-offset: var(--ds-focus-ring-offset);
  }
</style>
