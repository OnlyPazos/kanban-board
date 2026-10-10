<!--
  Lista de proyectos (pantalla inicial). Sin proyectos muestra el estado
  vacío. "Importar" se conecta en WI-AC-034. Cada proyecto tiene un botón
  "Editar" que avisa con el proyecto (identificado por id); al abrir la
  tarjeta (`onopen`) se avisa para mostrar su tablero. Cada proyecto muestra
  el recuento de sus tarjetas no archivadas en los 4 estados, en el orden de
  las columnas (AC-008). El orden de `projects` lo decide el store (AC-007).
-->
<script lang="ts">
  import { Button, Card } from 'design-system';
  import {
    CARD_STATUSES,
    CARD_STATUS_LABELS,
    countCardsByProject,
    emptyStatusCounts,
    type Card as KanbanCard,
    type Project,
  } from '../domain';

  let {
    projects = [],
    cards = [],
    oncreate,
    onimport,
    onedit,
    onopen,
  }: {
    projects?: Project[];
    cards?: KanbanCard[];
    oncreate?: () => void;
    onimport?: () => void;
    onedit?: (project: Project) => void;
    onopen?: (project: Project) => void;
  } = $props();

  const countsByProject = $derived(countCardsByProject(cards));
</script>

<section class="project-list" aria-labelledby="project-list-title">
  <div class="project-list__header">
    <h1 id="project-list-title" class="project-list__title">Proyectos</h1>
    {#if projects.length > 0}
      <div class="project-list__actions">
        <Button variant="secondary" onclick={() => onimport?.()}>Importar</Button>
        <Button onclick={() => oncreate?.()}>Crear proyecto</Button>
      </div>
    {/if}
  </div>

  {#if projects.length > 0}
    <ul class="project-list__items">
      {#each projects as project (project.id)}
        {@const counts = countsByProject.get(project.id) ?? emptyStatusCounts()}
        <li>
          <Card
            title={project.name}
            description={project.description || undefined}
            onopen={onopen ? () => onopen(project) : undefined}
          >
            {#snippet footer()}
              <dl class="status-counts">
                {#each CARD_STATUSES as status (status)}
                  <div class="status-counts__item" data-status={status}>
                    <dt>{CARD_STATUS_LABELS[status]}</dt>
                    <dd class="status-counts__value">{counts[status]}</dd>
                  </div>
                {/each}
              </dl>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Editar ${project.name}`}
                onclick={() => onedit?.(project)}>Editar</Button
              >
            {/snippet}
          </Card>
        </li>
      {/each}
    </ul>
  {:else}
    <div class="empty-state">
      <p class="empty-state__title">Todavía no tienes proyectos</p>
      <p class="empty-state__text">Crea tu primer proyecto o importa un archivo exportado.</p>
      <div class="empty-state__actions">
        <Button onclick={() => oncreate?.()}>Crear proyecto</Button>
        <Button variant="secondary" onclick={() => onimport?.()}>Importar</Button>
      </div>
    </div>
  {/if}
</section>

<style>
  .project-list {
    padding: var(--ds-spacing-5) var(--ds-spacing-4);
  }

  .project-list__header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--ds-spacing-3);
    margin: 0 0 var(--ds-spacing-5);
  }

  .project-list__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ds-spacing-3);
  }

  .project-list__items {
    display: flex;
    flex-direction: column;
    gap: var(--ds-spacing-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .status-counts {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ds-spacing-1) var(--ds-spacing-3);
    flex: 1 1 auto;
    margin: 0;
  }

  .status-counts__item {
    display: flex;
    gap: var(--ds-spacing-1);
  }

  .status-counts__item dt::after {
    content: ':';
  }

  .status-counts__value {
    margin: 0;
    color: var(--ds-color-text-primary);
    font-family: var(--ds-font-family-mono);
  }

  .project-list__title {
    margin: 0;
    font-size: var(--ds-font-heading-size);
    font-weight: var(--ds-font-heading-weight);
    line-height: var(--ds-font-heading-line-height);
    letter-spacing: var(--ds-font-heading-letter-spacing);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--ds-spacing-3);
    padding: var(--ds-spacing-7) var(--ds-spacing-4);
    text-align: center;
    background: var(--ds-color-surface-base);
    border: var(--ds-border-width-default) solid var(--ds-color-border-default);
    border-radius: var(--ds-radii-large);
  }

  .empty-state__title {
    margin: 0;
    font-size: var(--ds-font-subheading-size);
    font-weight: var(--ds-font-subheading-weight);
    line-height: var(--ds-font-subheading-line-height);
  }

  .empty-state__text {
    margin: 0;
    color: var(--ds-color-text-secondary);
  }

  .empty-state__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--ds-spacing-3);
    margin-top: var(--ds-spacing-3);
  }
</style>
