<!--
  Flujo de importación (WI-AC-030). La app llama a `start()` desde cualquier
  botón "Importar": se abre el selector de archivos
  (`<input type="file" accept=".json,application/json">`), se lee el archivo
  y se distingue su tipo por el campo `kind`.
  - `kind: "full"` (AC-030): confirmación "Se borrarán tus N proyectos
    actuales" (N = activos + archivados). Cancelar o cerrar no cambia nada;
    al confirmar se avisa con `onreplaceall`, que sustituye todos los datos.
  - `kind: "project"`: se implementa en WI-AC-031.
  Validación mínima (`parseImport`); los motivos y mensajes completos van en
  WI-AC-033. Un archivo no válido no modifica nada.
-->
<script lang="ts">
  import { Button, Dialog } from 'design-system';
  import { parseImport, type ExportFile } from '../domain';

  let {
    projectCount = 0,
    onreplaceall,
  }: {
    /** Proyectos actuales (activos + archivados): la N de la confirmación. */
    projectCount?: number;
    /** Import completo confirmado: sustituir todos los proyectos y tarjetas. */
    onreplaceall?: (data: ExportFile) => unknown;
  } = $props();

  let input: HTMLInputElement | undefined = $state();

  /** Archivo completo pendiente de confirmar. */
  let pendingFull = $state<ExportFile | null>(null);
  let confirming = $state(false);
  let replacing = $state(false);

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
      fail('El archivo no es un export válido de la app.');
      return;
    }
    switch (result.data.kind) {
      case 'full':
        pendingFull = result.data;
        confirming = true;
        break;
      case 'project':
        // Import de proyecto: WI-AC-031.
        fail('Este tipo de archivo todavía no se puede importar.');
        break;
    }
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
    <Button variant="danger" loading={replacing} onclick={confirmFull}>Reemplazar</Button>
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
