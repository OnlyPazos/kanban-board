<!--
  Página de demo del sistema de diseño. Muestra todos los componentes con
  sus variantes y estados, y permite alternar Auto / Claro / Oscuro.
  Arrancar: npm run demo (dentro de design-system/).
-->
<script lang="ts">
  import Archive from '@lucide/svelte/icons/archive';
  import ArrowDown from '@lucide/svelte/icons/arrow-down';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import Calendar from '@lucide/svelte/icons/calendar';
  import Download from '@lucide/svelte/icons/download';
  import Equal from '@lucide/svelte/icons/equal';
  import KanbanSquare from '@lucide/svelte/icons/square-kanban';
  import Monitor from '@lucide/svelte/icons/monitor';
  import Moon from '@lucide/svelte/icons/moon';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Plus from '@lucide/svelte/icons/plus';
  import Sun from '@lucide/svelte/icons/sun';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import X from '@lucide/svelte/icons/x';
  import {
    Alert,
    Badge,
    Button,
    Card,
    Chip,
    Column,
    Dialog,
    DropPlaceholder,
    Icon,
    Input,
    MenuButton,
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

  const THEME_ICONS: Record<string, typeof Sun> = { auto: Monitor, light: Sun, dark: Moon };
  const themeItems = [
    { value: 'auto', label: 'Automático', icon: Monitor },
    { value: 'light', label: 'Claro', icon: Sun },
    { value: 'dark', label: 'Oscuro', icon: Moon },
  ];

  let priority = $state('');
  const priorityOptions = [
    { value: '', label: 'Sin prioridad' },
    { value: 'alta', label: 'Alta' },
    { value: 'media', label: 'Media' },
    { value: 'baja', label: 'Baja' },
  ];

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
    <MenuButton label="Tema" icon={THEME_ICONS[theme]} items={themeItems} bind:value={theme} />
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
      <Button variant="ghost" size="sm" icon={X} aria-label="Cerrar" />
    </div>
    <div class="demo__row">
      <Button icon={Plus}>Nueva tarjeta</Button>
      <Button variant="secondary" icon={Pencil}>Editar</Button>
      <Button variant="outline" icon={Download}>Exportar</Button>
      <Button variant="ghost" icon={Archive}>Archivar</Button>
      <Button variant="danger" icon={Trash2}>Borrar</Button>
      <Button variant="secondary" icon={Pencil} aria-label="Editar" />
      <Button size="lg" icon={Plus} aria-label="Añadir" />
    </div>
    <div class="demo__row">
      <Button href="#volver" variant="ghost" size="sm" icon={ArrowLeft}>Volver a proyectos (enlace)</Button>
      <Button href="#archivados" variant="secondary" size="sm" icon={Archive}>Proyectos archivados (enlace)</Button>
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
      <Badge tone="danger" icon={ArrowUp}>Alta</Badge>
      <Badge tone="warning" icon={Equal}>Media</Badge>
      <Badge tone="neutral" icon={ArrowDown}>Baja</Badge>
      <Badge tone="feature" icon={null}>Sin icono</Badge>
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
    <h2 class="demo__heading">Input · Textarea · Select · MenuButton</h2>
    <div class="demo__grid">
      <Input label="Título" bind:value={title} required maxlength={120} error={titleError} hint="Máximo 120 caracteres" />
      <Select label="Tipo" bind:value={type} options={typeOptions} />
      <Select label="Prioridad" bind:value={priority} options={priorityOptions} hint="Lista propia, no el <select> nativo" />
      <Select label="Con error" options={typeOptions} placeholder="Elige un tipo" error="Elige un tipo." />
      <Select label="Deshabilitado" value="mejora" options={typeOptions} disabled />
      <Textarea label="Descripción" bind:value={description} placeholder="Opcional" />
      <Input label="Deshabilitado" value="No editable" disabled />
    </div>
    <div class="demo__row">
      <MenuButton label="Tema (con texto)" items={themeItems} bind:value={theme} variant="secondary" align="start" />
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
    <h2 class="demo__heading">Tablero (AppBar · Column · DropPlaceholder)</h2>
    <div class="demo__appbar">
      <span class="demo__appbar-title"><Icon icon={KanbanSquare} size="lg" /> Kanban · Mi app</span>
      <Button size="sm" icon={Plus}>Nueva tarjeta</Button>
    </div>
    <div class="demo__board">
      <Column title="Sin empezar" status="todo" count={2} headingLevel={3}>
        {#snippet actions()}
          <Button variant="ghost" size="sm" icon={Plus} aria-label="Añadir tarjeta en Sin empezar" />
        {/snippet}
        <Card title="Exportar proyecto a JSON" priority="high" onopen={() => (editOpen = true)}>
          {#snippet tags()}
            <Badge tone="feature">Novedad</Badge>
            <Badge tone="danger" icon={ArrowUp}>Alta</Badge>
          {/snippet}
          {#snippet footer()}<Icon icon={Calendar} size="sm" /> Creada el 9 oct 2026{/snippet}
        </Card>
        <Card title="Revisar textos de ayuda" onopen={() => (editOpen = true)}>
          {#snippet tags()}<Badge tone="improvement">Mejora</Badge>{/snippet}
        </Card>
      </Column>

      <Column title="En curso" status="doing" count={2} headingLevel={3} dropTarget>
        {#snippet actions()}
          <Button variant="ghost" size="sm" icon={Plus} aria-label="Añadir tarjeta en En curso" />
        {/snippet}
        <Card title="Arreglar orden tras importar" priority="medium" onopen={() => (editOpen = true)}>
          {#snippet tags()}
            <Badge tone="bugfix">Arreglo</Badge>
            <Badge tone="warning" icon={Equal}>Media</Badge>
          {/snippet}
        </Card>
        <DropPlaceholder active label="Suelta aquí" />
        <Card title="Arrastrando" priority="low" dragging>
          {#snippet tags()}
            <Badge tone="technical">Técnico</Badge>
            <Badge tone="neutral" icon={ArrowDown}>Baja</Badge>
          {/snippet}
        </Card>
      </Column>

      <Column title="En pausa" status="paused" count={0} headingLevel={3}>
        {#snippet actions()}
          <Button variant="ghost" size="sm" icon={Plus} aria-label="Añadir tarjeta en En pausa" />
        {/snippet}
        <DropPlaceholder label="Sin tarjetas" />
      </Column>

      <Column title="Finalizado" status="done" count={1} headingLevel={3}>
        {#snippet actions()}
          <Button variant="ghost" size="sm" icon={Plus} aria-label="Añadir tarjeta en Finalizado" />
        {/snippet}
        <Card title="Modo oscuro" priority="low" onopen={() => (editOpen = true)}>
          {#snippet tags()}
            <Badge tone="feature">Novedad</Badge>
            <Badge tone="neutral" icon={ArrowDown}>Baja</Badge>
          {/snippet}
          {#snippet footer()}<Icon icon={Calendar} size="sm" /> Creada el 2 oct 2026{/snippet}
        </Card>
      </Column>
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
    background-color: var(--ds-color-surface-sunken);
    border-radius: var(--ds-radii-large);
  }

  .demo__appbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ds-spacing-3);
    padding: var(--ds-spacing-2) var(--ds-spacing-4);
    background-color: var(--ds-color-appbar-bg);
    color: var(--ds-color-appbar-fg);
    border-bottom: var(--ds-appbar-accent-width) solid var(--ds-color-appbar-accent);
    border-radius: var(--ds-radii-medium);
    box-shadow: var(--ds-shadow-sm);
  }

  .demo__appbar-title {
    display: inline-flex;
    align-items: center;
    gap: var(--ds-spacing-2);
    font-size: var(--ds-font-subheading-size);
    font-weight: var(--ds-font-subheading-weight);
    line-height: var(--ds-font-subheading-line-height);
  }

  .demo__board {
    display: flex;
    align-items: flex-start;
    gap: var(--ds-spacing-4);
    overflow-x: auto;
    padding-bottom: var(--ds-spacing-3);
  }

  .demo__log {
    margin: 0;
    color: var(--ds-color-text-secondary);
    font-size: var(--ds-font-caption-size);
  }
</style>
