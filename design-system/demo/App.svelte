<!--
  Página de demo del sistema de diseño. Muestra todos los componentes con
  sus variantes y estados, y permite alternar Auto / Claro / Oscuro.
  Arrancar: npm run demo (dentro de design-system/).
-->
<script lang="ts">
  import {
    Alert,
    Badge,
    Button,
    Card,
    Chip,
    Dialog,
    Input,
    Select,
    Textarea,
  } from '../components/index.js';

  let theme = $state('auto');

  $effect(() => {
    const root = document.documentElement;
    if (theme === 'auto') delete root.dataset.theme;
    else root.dataset.theme = theme;
  });

  let loading = $state(false);
  function fakeSave() {
    loading = true;
    setTimeout(() => (loading = false), 1500);
  }

  let title = $state('');
  let description = $state('');
  let type = $state('novedad');
  let titleError = $derived(title.trim() === '' ? 'El título no puede estar vacío.' : undefined);

  let filters = $state({ feature: true, improvement: false, bugfix: true, technical: false });

  let editOpen = $state(false);
  let confirmOpen = $state(false);
  let log = $state('Sin eventos todavía.');

  const typeOptions = [
    { value: 'novedad', label: 'Novedad' },
    { value: 'mejora', label: 'Mejora' },
    { value: 'arreglo', label: 'Arreglo' },
    { value: 'tecnico', label: 'Técnico' },
  ];
</script>

<main class="demo">
  <header class="demo__header">
    <h1 class="demo__title">Design System — Demo</h1>
    <Select
      label="Modo de color"
      bind:value={theme}
      options={[
        { value: 'auto', label: 'Auto (sistema)' },
        { value: 'light', label: 'Claro' },
        { value: 'dark', label: 'Oscuro' },
      ]}
    />
  </header>

  <section class="demo__section">
    <h2 class="demo__heading">Button</h2>
    <div class="demo__row">
      <Button onclick={() => (log = 'click en primary')}>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
    </div>
    <div class="demo__row">
      <Button size="sm">Pequeño (zona táctil 44px)</Button>
      <Button size="md">Mediano</Button>
      <Button size="lg">Grande</Button>
    </div>
    <div class="demo__row">
      <Button disabled>Deshabilitado</Button>
      <Button variant="secondary" disabled>Deshabilitado</Button>
      <Button {loading} onclick={fakeSave}>{loading ? 'Guardando…' : 'Loading (1,5 s)'}</Button>
      <Button variant="ghost" size="sm" aria-label="Cerrar"><span aria-hidden="true">×</span></Button>
    </div>
    <Button block variant="outline">Ancho completo</Button>
    <p class="demo__log">{log}</p>
  </section>

  <section class="demo__section">
    <h2 class="demo__heading">Badge</h2>
    <div class="demo__row">
      <Badge tone="feature">Novedad</Badge>
      <Badge tone="improvement">Mejora</Badge>
      <Badge tone="bugfix">Arreglo</Badge>
      <Badge tone="technical">Técnico</Badge>
    </div>
    <div class="demo__row demo__surface">
      <Badge tone="danger">Alta</Badge>
      <Badge tone="warning">Media</Badge>
      <Badge tone="neutral">Baja</Badge>
      <Badge tone="success">Éxito</Badge>
      <Badge tone="info">Info</Badge>
    </div>
  </section>

  <section class="demo__section">
    <h2 class="demo__heading">Chip (filtro de selección múltiple)</h2>
    <div class="demo__row" role="group" aria-label="Filtrar por tipo">
      <Chip tone="feature" bind:selected={filters.feature}>Novedad</Chip>
      <Chip tone="improvement" bind:selected={filters.improvement}>Mejora</Chip>
      <Chip tone="bugfix" bind:selected={filters.bugfix}>Arreglo</Chip>
      <Chip tone="technical" bind:selected={filters.technical}>Técnico</Chip>
      <Chip disabled>Deshabilitado</Chip>
    </div>
  </section>

  <section class="demo__section">
    <h2 class="demo__heading">Input · Textarea · Select</h2>
    <div class="demo__grid">
      <Input label="Título" bind:value={title} required maxlength={120} error={titleError} hint="Máximo 120 caracteres" />
      <Select label="Tipo" bind:value={type} options={typeOptions} />
      <Textarea label="Descripción" bind:value={description} placeholder="Opcional" />
      <Input label="Deshabilitado" value="No editable" disabled />
    </div>
  </section>

  <section class="demo__section">
    <h2 class="demo__heading">Card (sobre una columna)</h2>
    <div class="demo__column">
      <Card
        title="Exportar proyecto a JSON"
        description={'Descargar un archivo con el proyecto y todas sus tarjetas,\nincluidas las archivadas.'}
        onopen={() => (editOpen = true)}
      >
        {#snippet tags()}
          <Badge tone="feature">Novedad</Badge>
          <Badge tone="danger">Alta</Badge>
        {/snippet}
        {#snippet footer()}Creada el 9 oct 2026{/snippet}
      </Card>
      <Card title="Arrastrando" dragging>
        {#snippet tags()}<Badge tone="bugfix">Arreglo</Badge>{/snippet}
      </Card>
      <Card title="Solo lectura (proyecto archivado)" readonly onopen={() => {}}>
        {#snippet tags()}<Badge tone="technical">Técnico</Badge>{/snippet}
      </Card>
    </div>
  </section>

  <section class="demo__section">
    <h2 class="demo__heading">Alert</h2>
    <Alert tone="danger" title="No se pudo guardar">
      Tus últimos cambios no se han guardado en este navegador.
      {#snippet actions()}
        <Button size="sm">Exportar ahora</Button>
      {/snippet}
    </Alert>
    <Alert tone="warning" title="Almacenamiento no disponible">Tus datos no se conservarán al cerrar.</Alert>
    <Alert tone="success" title="Importación completada">Se han añadido 3 proyectos.</Alert>
    <Alert tone="info">Consejo: arrastra una tarjeta para cambiar su estado.</Alert>
  </section>

  <section class="demo__section">
    <h2 class="demo__heading">Dialog</h2>
    <div class="demo__row">
      <Button variant="secondary" onclick={() => (editOpen = true)}>Abrir edición</Button>
      <Button variant="danger" onclick={() => (confirmOpen = true)}>Abrir confirmación</Button>
    </div>
  </section>
</main>

<Dialog bind:open={editOpen} title="Editar tarjeta">
  <Input label="Título" bind:value={title} required error={titleError} />
  <Select label="Tipo" bind:value={type} options={typeOptions} />
  <Textarea label="Descripción" bind:value={description} />
  {#snippet actions()}
    <Button variant="secondary" onclick={() => (editOpen = false)}>Cancelar</Button>
    <Button disabled={!!titleError} onclick={() => (editOpen = false)}>Guardar</Button>
  {/snippet}
</Dialog>

<Dialog
  bind:open={confirmOpen}
  size="sm"
  title="¿Borrar el proyecto?"
  description="Se borrarán el proyecto «Mi app» y sus 12 tarjetas. No se puede deshacer."
>
  {#snippet actions()}
    <Button variant="secondary" onclick={() => (confirmOpen = false)}>Cancelar</Button>
    <Button variant="danger" onclick={() => (confirmOpen = false)}>Borrar definitivamente</Button>
  {/snippet}
</Dialog>

<style>
  :global(body) {
    margin: 0;
    background-color: var(--ds-color-background);
    color: var(--ds-color-text-primary);
    font-family: var(--ds-font-family-sans);
    font-size: var(--ds-font-body-size);
    line-height: var(--ds-font-body-line-height);
  }

  .demo {
    display: flex;
    flex-direction: column;
    gap: var(--ds-spacing-6);
    max-width: calc(var(--ds-dialog-max-width-md) * 1.5);
    margin: 0 auto;
    padding: var(--ds-spacing-6) var(--ds-spacing-4);
  }

  .demo__header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--ds-spacing-4);
  }

  .demo__title {
    margin: 0;
    font-size: var(--ds-font-display-size);
    font-weight: var(--ds-font-display-weight);
    line-height: var(--ds-font-display-line-height);
    letter-spacing: var(--ds-font-display-letter-spacing);
  }

  .demo__section {
    display: flex;
    flex-direction: column;
    gap: var(--ds-spacing-3);
  }

  .demo__heading {
    margin: 0;
    font-size: var(--ds-font-heading-size);
    font-weight: var(--ds-font-heading-weight);
    line-height: var(--ds-font-heading-line-height);
    letter-spacing: var(--ds-font-heading-letter-spacing);
  }

  .demo__row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ds-spacing-3);
  }

  .demo__surface {
    padding: var(--ds-spacing-3);
    background-color: var(--ds-color-surface-raised);
    border-radius: var(--ds-radii-medium);
  }

  .demo__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(calc(var(--ds-spacing-8) * 4), 1fr));
    gap: var(--ds-spacing-4);
  }

  .demo__column {
    display: flex;
    flex-direction: column;
    gap: var(--ds-spacing-3);
    max-width: calc(var(--ds-spacing-8) * 5);
    padding: var(--ds-spacing-3);
    background-color: var(--ds-color-surface-base);
    border-radius: var(--ds-radii-large);
  }

  .demo__log {
    margin: 0;
    color: var(--ds-color-text-secondary);
    font-size: var(--ds-font-caption-size);
  }
</style>
