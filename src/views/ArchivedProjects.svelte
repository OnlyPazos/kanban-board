<!--
  Vista global "Proyectos archivados" (WI-AC-024). Lista los proyectos
  archivados con su nombre, descripción y número total de tarjetas (activas y
  archivadas). Cada uno ofrece:
  - "Restaurar" (AC-025): avisa con `onrestore`; la app pone el `archived` del
    proyecto a `false` y vuelve a la lista con sus tarjetas tal cual estaban.
  - "Borrar definitivamente" (AC-027): pide confirmación en un `Dialog`
    pequeño que indica el nombre y el total de tarjetas; solo al confirmar
    avisa con `ondelete`.
  - "Ver tablero" (AC-026): enlace al tablero del proyecto, que se muestra en
    modo solo lectura (desde ahí se puede exportar).
-->
<script lang="ts">
  import { Button, Card, Dialog } from 'design-system';
  import type { Card as CardData, Project } from '../domain';
  import { boardHref, LIST_HREF } from '../lib/route';

  let {
    projects = [],
    cards = [],
    onrestore,
    ondelete,
  }: {
    /** Proyectos (archivados o no); solo se muestran los archivados. */
    projects?: Project[];
    /** Todas las tarjetas, para contar las de cada proyecto (activas y archivadas). */
    cards?: CardData[];
    onrestore?: (project: Project) => unknown;
    /** Solo se llama tras confirmar el borrado definitivo. */
    ondelete?: (project: Project) => unknown;
  } = $props();

  const archived = $derived(projects.filter((p) => p.archived));

  /** Número total de tarjetas (activas y archivadas) de cada proyecto. */
  const totals = $derived.by(() => {
    const map = new Map<string, number>();
    for (const card of cards) map.set(card.projectId, (map.get(card.projectId) ?? 0) + 1);
    return map;
  });

  function cardTotalLabel(total: number): string {
    return total === 1 ? '1 tarjeta' : `${total} tarjetas`;
  }

  let confirming = $state(false);
  let deleteTarget = $state<Project | null>(null);
  let deleting = $state(false);

  function restore(project: Project) {
    Promise.resolve(onrestore?.(project)).catch((error: unknown) => {
      console.error('No se pudo restaurar el proyecto', error);
    });
  }

  function askDelete(project: Project) {
    deleteTarget = project;
    confirming = true;
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    deleting = true;
    try {
      await ondelete?.(deleteTarget);
      confirming = false;
    } catch (error: unknown) {
      console.error('No se pudo borrar el proyecto', error);
    } finally {
      deleting = false;
    }
  }
</script>

<section class="archived-projects" aria-labelledby="archived-projects-title">
  <div class="archived-projects__header">
    <a class="archived-projects__back" href={LIST_HREF}>← Volver a proyectos</a>
    <h1 id="archived-projects-title" class="archived-projects__title">Proyectos archivados</h1>
  </div>

  {#if archived.length > 0}
    <ul class="archived-projects__items">
      {#each archived as project (project.id)}
        {@const total = totals.get(project.id) ?? 0}
        <li aria-label={project.name} data-project-id={project.id}>
          <Card title={project.name} description={project.description || undefined} readonly>
            {#snippet footer()}
              <p class="archived-projects__total" data-testid="archived-project-total">{cardTotalLabel(total)}</p>
              <div class="archived-projects__actions">
                <a
                  class="archived-projects__open"
                  href={boardHref(project.id)}
                  aria-label={`Ver tablero de ${project.name}`}>Ver tablero</a
                >
                <Button
                  variant="secondary"
                  size="sm"
                  aria-label={`Restaurar ${project.name}`}
                  onclick={() => restore(project)}>Restaurar</Button
                >
                <Button
                  variant="danger"
                  size="sm"
                  aria-label={`Borrar definitivamente ${project.name}`}
                  onclick={() => askDelete(project)}>Borrar definitivamente</Button
                >
              </div>
            {/snippet}
          </Card>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="archived-projects__empty">No hay proyectos archivados.</p>
  {/if}
</section>

<Dialog
  bind:open={confirming}
  title="¿Borrar definitivamente el proyecto?"
  description={deleteTarget
    ? `Se borrará para siempre el proyecto «${deleteTarget.name}» junto con todas sus tarjetas (total: ${cardTotalLabel(totals.get(deleteTarget.id) ?? 0)}). Esta acción no se puede deshacer.`
    : undefined}
  size="sm"
>
  {#snippet actions()}
    <Button variant="secondary" onclick={() => (confirming = false)}>Cancelar</Button>
    <Button variant="danger" loading={deleting} onclick={confirmDelete}>Borrar definitivamente</Button>
  {/snippet}
</Dialog>

<style>
  .archived-projects {
    padding: var(--ds-spacing-5) var(--ds-spacing-4);
  }

  .archived-projects__header {
    display: flex;
    flex-direction: column;
    gap: var(--ds-spacing-2);
    margin: 0 0 var(--ds-spacing-5);
  }

  .archived-projects__back {
    align-self: flex-start;
    color: var(--ds-color-action-primary);
    font-size: var(--ds-font-label-size);
    font-weight: var(--ds-font-label-weight);
    line-height: var(--ds-font-label-line-height);
    border-radius: var(--ds-radii-small);
  }

  .archived-projects__open {
    align-self: center;
    color: var(--ds-color-action-primary);
    font-size: var(--ds-font-label-size);
    font-weight: var(--ds-font-label-weight);
    line-height: var(--ds-font-label-line-height);
    border-radius: var(--ds-radii-small);
  }

  .archived-projects__open:focus-visible,
  .archived-projects__back:focus-visible {
    outline: var(--ds-focus-ring-width) solid var(--ds-color-focus);
    outline-offset: var(--ds-focus-ring-offset);
  }

  .archived-projects__title {
    margin: 0;
    font-size: var(--ds-font-heading-size);
    font-weight: var(--ds-font-heading-weight);
    line-height: var(--ds-font-heading-line-height);
    letter-spacing: var(--ds-font-heading-letter-spacing);
  }

  .archived-projects__items {
    display: flex;
    flex-direction: column;
    gap: var(--ds-spacing-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .archived-projects__total {
    flex: 1 1 auto;
    margin: 0;
    color: var(--ds-color-text-secondary);
  }

  .archived-projects__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ds-spacing-2);
  }

  .archived-projects__empty {
    margin: 0;
    color: var(--ds-color-text-secondary);
  }
</style>
