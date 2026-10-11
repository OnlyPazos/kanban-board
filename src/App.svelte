<script lang="ts">
  import { onMount } from 'svelte';
  import { Alert, Button } from 'design-system';
  import AppHeader from './lib/AppHeader.svelte';
  import ProjectList from './views/ProjectList.svelte';
  import CreateProjectDialog from './views/CreateProjectDialog.svelte';
  import EditProjectDialog from './views/EditProjectDialog.svelte';
  import Board from './views/Board.svelte';
  import ArchivedCards from './views/ArchivedCards.svelte';
  import ArchivedProjects from './views/ArchivedProjects.svelte';
  import CreateCardDialog from './views/CreateCardDialog.svelte';
  import EditCardDialog from './views/EditCardDialog.svelte';
  import ImportFlow from './views/ImportFlow.svelte';
  import { boardHref, LIST_HREF, parseRoute } from './lib/route';
  import { buildExport, exportFileName, type Card, type CardStatus, type Project } from './domain';
  import { downloadJson } from './lib/download';
  import { createBrowserRepository, type Repository } from './persistence/repository';
  import { createTabSync } from './persistence/sync';
  import { AppStore } from './state/app-store.svelte';

  let { repository }: { repository?: Repository } = $props();

  /** IndexedDB no está disponible (AC-037): los datos solo viven en memoria. */
  let storageUnavailable = $state(false);

  // Sincronización entre pestañas (AC-038): solo con el repositorio del navegador.
  // svelte-ignore state_referenced_locally
  const tabSync = repository ? undefined : createTabSync();

  // El repositorio se fija al montar la app. Sin uno dado, se usa IndexedDB
  // o, si no está disponible, un repositorio en memoria (AC-037).
  const store = new AppStore(
    // svelte-ignore state_referenced_locally
    repository ??
      createBrowserRepository({
        onUnavailable: (error) => {
          console.warn('IndexedDB no está disponible; los datos solo se guardan en memoria', error);
          storageUnavailable = true;
        },
        sync: tabSync,
      }),
  );
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
    if (current.name === 'list' || current.name === 'archived-projects') return undefined;
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

  /** Descarga el export completo (AC-028; "Exportar ahora" de AC-035) con el estado en memoria. */
  function exportAll() {
    const now = new Date();
    downloadJson(exportFileName(now), buildExport(store, { kind: 'full' }, now));
  }

  /** Descarga el export del proyecto (AC-029), archivado o no. */
  function exportProject(project: Project) {
    const now = new Date();
    downloadJson(exportFileName(now, project.name), buildExport(store, { kind: 'project', projectId: project.id }, now));
  }

  let importFlow: ImportFlow | undefined = $state();

  function startEdit(project: Project) {
    editTarget = project;
    editing = true;
  }

  onMount(() => {
    const syncRoute = () => (route = parseRoute(window.location.hash));
    window.addEventListener('hashchange', syncRoute);
    // Cambios guardados en otras pestañas (AC-038): se releen y se muestran sin recargar.
    tabSync?.subscribe((change) => {
      store.applyRemoteChange(change).catch(() => {});
    });
    store.hydrate().catch((error: unknown) => {
      console.error('No se pudieron cargar los datos guardados', error);
    });
    return () => {
      window.removeEventListener('hashchange', syncRoute);
      tabSync?.close();
    };
  });
</script>

<AppHeader />
{#if storageUnavailable}
  <div class="storage-warning">
    <Alert tone="warning" title="Tus datos no se conservarán al cerrar">
      Este navegador no permite guardar datos. Puedes seguir trabajando, pero exporta tus datos antes de cerrar para no
      perderlos.
    </Alert>
  </div>
{/if}
{#if store.saveError}
  <div class="save-error">
    <Alert tone="danger" title="No se pudieron guardar los cambios">
      Tus últimos cambios no se han guardado en este navegador. Exporta tus datos para no perderlos.
      {#snippet actions()}
        <Button size="sm" onclick={exportAll}>Exportar ahora</Button>
      {/snippet}
    </Alert>
  </div>
{/if}
<main>
  {#if route.name === 'archived-projects'}
    <ArchivedProjects
      projects={store.archivedProjects}
      cards={store.cards}
      onrestore={(project) => store.restoreProject(project.id)}
      ondelete={(project) => store.deleteProject(project.id)}
    />
  {:else if route.name !== 'list'}
    {#if boardProject && route.name === 'archived-cards'}
      <ArchivedCards
        project={boardProject}
        cards={store.cards}
        onrestorecard={(card) => store.restoreCard(card.id)}
        ondeletecard={(card) => store.deleteCard(card.id)}
      />
    {:else if boardProject}
      <Board
        project={boardProject}
        cards={store.cards}
        onedit={startEdit}
        onaddcard={startAddCard}
        oneditcard={startEditCard}
        onmovecard={(card, status) => store.moveCard(card.id, status)}
        onarchivecard={(card) => store.archiveCard(card.id)}
        typeFilter={store.typeFilterOf(boardProject.id)}
        ontypefilterchange={(types) => store.setTypeFilter(boardProject.id, types)}
        onexport={exportProject}
      />
    {:else if store.loaded}
      <section class="not-found">
        <h1 class="not-found__title">Proyecto no encontrado</h1>
        <a class="not-found__back" href={LIST_HREF}>← Volver a proyectos</a>
      </section>
    {/if}
  {:else}
    <ProjectList
      projects={store.activeProjects}
      cards={store.cards}
      oncreate={() => (creating = true)}
      onimport={() => importFlow?.start()}
      onedit={startEdit}
      onopen={openBoard}
      onarchive={(project) => store.archiveProject(project.id)}
      canExportAll={store.projects.length > 0}
      onexportall={exportAll}
    />
  {/if}
</main>
<ImportFlow
  bind:this={importFlow}
  projectCount={store.projects.length}
  onreplaceall={(data) => store.replaceAll(data.projects, data.cards)}
  projectIds={store.projects.map((p) => p.id)}
  onimportproject={(project, cards) => store.importProject(project, cards)}
/>
<CreateProjectDialog bind:open={creating} oncreate={(input) => store.createProject(input)} />
{#if boardProject && !boardProject.archived}
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
  .storage-warning,
  .save-error {
    padding: var(--ds-spacing-3) var(--ds-spacing-4) 0;
  }

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
