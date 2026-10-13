<!--
  Flujo de importación (WI-AC-030). La app llama a `start()` desde cualquier
  botón "Importar": se abre el selector de archivos
  (`<input type="file" accept=".json,application/json">`), se lee el archivo
  y se distingue su tipo por el campo `kind`.
  - `kind: "full"` (AC-030): confirmación "Se borrarán tus N proyectos
    actuales" (N = activos + archivados). Cancelar o cerrar no cambia nada;
    al confirmar se avisa con `onreplaceall`, que sustituye todos los datos.
    Si N es 0 no hay nada que perder: no se pide confirmación y el contenido
    se escribe directamente (AC-041, D-014).
  - `kind: "project"` (WI-AC-031): si su `id` no existe, se añade con sus
    tarjetas (AC-031). Si ya existe, un diálogo ofrece "Reemplazar" (sustituye
    el existente y sus tarjetas) e "Importar como copia" (ids nuevos y nombre
    `<original> (copia)`); cerrar o cancelar no cambia nada (AC-032). Ambos
    casos se avisan con `onimportproject`, que escribe en una transacción.
  Validación completa antes de escribir nada (`parseImport`, AC-033): si el
  archivo no es JSON válido, tiene una versión de formato desconocida o su
  estructura no es válida, se muestra un error en español con el motivo
  (`importFailureMessage`) y no se modifica ningún dato.
-->
<script lang="ts">
  import Copy from '@lucide/svelte/icons/copy';
  import Replace from '@lucide/svelte/icons/replace';
  import { Button, Dialog } from 'design-system';
  import {
    copyImportedProject,
    importFailureMessage,
    parseImport,
    type Card,
    type ExportFile,
    type Project,
  } from '../domain';

  let {
    projectCount = 0,
    projectIds = [],
    onreplaceall,
    onimportproject,
  }: {
    /** Proyectos actuales (activos + archivados): la N de la confirmación. */
    projectCount?: number;
    /** `id` de los proyectos actuales (activos + archivados), para detectar si ya existe. */
    projectIds?: readonly string[];
    /** Import completo confirmado: sustituir todos los proyectos y tarjetas. */
    onreplaceall?: (data: ExportFile) => unknown;
    /**
     * Import de proyecto: añadir el proyecto con sus tarjetas o, si ya existe
     * uno con el mismo `id`, sustituirlo junto con sus tarjetas.
     */
    onimportproject?: (project: Project, cards: Card[]) => unknown;
  } = $props();

  let input: HTMLInputElement | undefined = $state();

  /** Archivo completo pendiente de confirmar. */
  let pendingFull = $state<ExportFile | null>(null);
  let confirming = $state(false);
  let replacing = $state(false);

  /** Proyecto del archivo cuyo `id` ya existe, pendiente de elegir qué hacer. */
  let pendingProject = $state<{ project: Project; cards: Card[] } | null>(null);
  let resolvingConflict = $state(false);
  let importingProject = $state(false);

  let failed = $state(false);
  let failureText = $state('');

  /** Abre el selector de archivos. */
  export function start() {
    input?.click();
  }

  async function handleChange() {
    const file = input?.files?.[0];
    // Se vacía para poder elegir de nuevo el mismo archivo.
    if (input) input.value = '';
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch (error: unknown) {
      console.error('No se pudo leer el archivo', error);
      fail('No se ha podido leer el archivo.');
      return;
    }
    const result = parseImport(text);
    if (!result.ok) {
      fail(importFailureMessage(result.reason, result.detail));
      return;
    }
    switch (result.data.kind) {
      case 'full':
        if (projectCount === 0) {
          // Sin proyectos (ni activos ni archivados) no hay nada que perder (D-014).
          await replaceAllDirectly(result.data);
        } else {
          pendingFull = result.data;
          confirming = true;
        }
        break;
      case 'project': {
        // `parseImport` garantiza exactamente un proyecto.
        const [project] = result.data.projects;
        if (!project) return;
        const cards = result.data.cards;
        if (projectIds.includes(project.id)) {
          pendingProject = { project, cards };
          resolvingConflict = true;
        } else {
          await importProject(project, cards);
        }
        break;
      }
    }
  }

  /** Escribe el proyecto; devuelve `true` si se guardó. */
  async function importProject(project: Project, cards: Card[]): Promise<boolean> {
    importingProject = true;
    try {
      await onimportproject?.(project, cards);
      return true;
    } catch (error: unknown) {
      console.error('No se pudo importar el archivo', error);
      fail('No se ha podido guardar el proyecto importado.');
      return false;
    } finally {
      importingProject = false;
    }
  }

  async function resolveConflict(mode: 'replace' | 'copy') {
    if (!pendingProject || importingProject) return;
    const { project, cards } = mode === 'replace' ? pendingProject : copyImportedProject(pendingProject.project, pendingProject.cards);
    if (await importProject(project, cards)) resolvingConflict = false;
  }

  function fail(text: string) {
    failureText = text;
    failed = true;
  }

  async function confirmFull() {
    if (!pendingFull || replacing) return;
    replacing = true;
    try {
      await onreplaceall?.(pendingFull);
      confirming = false;
    } catch (error: unknown) {
      console.error('No se pudo importar el archivo', error);
    } finally {
      replacing = false;
    }
  }

  /** Import completo sin confirmación (N = 0): si el guardado falla, se avisa. */
  async function replaceAllDirectly(data: ExportFile) {
    replacing = true;
    try {
      await onreplaceall?.(data);
    } catch (error: unknown) {
      console.error('No se pudo importar el archivo', error);
      fail('No se han podido guardar los datos importados.');
    } finally {
      replacing = false;
    }
  }

  function confirmText(n: number): string {
    return n === 1
      ? 'Se borrará tu 1 proyecto actual (con sus tarjetas) y se sustituirá por el contenido del archivo.'
      : `Se borrarán tus ${n} proyectos actuales (con sus tarjetas) y se sustituirán por el contenido del archivo.`;
  }
</script>

<input
  bind:this={input}
  class="import-input"
  type="file"
  accept=".json,application/json"
  aria-label="Archivo para importar"
  tabindex="-1"
  onchange={handleChange}
/>

<Dialog
  bind:open={confirming}
  title="¿Importar y reemplazar todos tus datos?"
  description={confirmText(projectCount)}
  size="sm"
  onclose={() => (pendingFull = null)}
>
  {#snippet actions()}
    <Button variant="secondary" onclick={() => (confirming = false)}>Cancelar</Button>
    <Button variant="danger" icon={Replace} loading={replacing} onclick={confirmFull}>Reemplazar</Button>
  {/snippet}
</Dialog>

<Dialog
  bind:open={resolvingConflict}
  title="Este proyecto ya existe"
  description={`«${pendingProject?.project.name ?? ''}» ya está en la app. Puedes reemplazar el proyecto existente y sus tarjetas por el del archivo, o importarlo como copia.`}
  size="sm"
  onclose={() => (pendingProject = null)}
>
  {#snippet actions()}
    <Button variant="secondary" onclick={() => (resolvingConflict = false)}>Cancelar</Button>
    <Button variant="secondary" icon={Copy} disabled={importingProject} onclick={() => resolveConflict('copy')}>
      Importar como copia
    </Button>
    <Button variant="danger" icon={Replace} disabled={importingProject} onclick={() => resolveConflict('replace')}>
      Reemplazar
    </Button>
  {/snippet}
</Dialog>

<Dialog bind:open={failed} title="No se pudo importar el archivo" description={failureText} size="sm">
  {#snippet actions()}
    <Button onclick={() => (failed = false)}>Aceptar</Button>
  {/snippet}
</Dialog>

<style>
  .import-input {
    display: none;
  }
</style>
