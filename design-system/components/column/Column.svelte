<!--
  Column — design-system/components/column/Column.svelte

  Columna del tablero kanban: cabecera tintada con el color de su estado
  (franja superior, icono, título y contador) y un cuerpo con las tarjetas.
  Iconos por estado (decorativos, refuerzan el color): todo CircleDashed,
  doing CircleDot, paused CirclePause, done CircleCheck.

  Uso:
    <Column title="En curso" status="doing" count={cards.length} dropTarget={over}>
      {#snippet actions()}
        <Button variant="ghost" size="sm" icon={Plus} aria-label="Añadir tarjeta en En curso" />
      {/snippet}
      <ul use:dndzone={…}>…</ul>
    </Column>

  Props:
    title         nombre de la columna (obligatorio)
    status        todo | doing | paused | done   → status.*      (todo)
    count         número de tarjetas; si se omite no se muestra contador
    countLabel    texto accesible del contador ("{count} tarjetas" por defecto)
    headingLevel  2–6, nivel del encabezado del título                  (2)
    dropTarget    resalta la columna mientras una tarjeta se arrastra encima
    actions       snippet opcional en la cabecera (p. ej. botón "Añadir")
    children      cuerpo de la columna
  La columna no implementa el arrastre: la app pone su propia lista
  (p. ej. svelte-dnd-action) dentro del cuerpo.
-->
<script lang="ts" module>
  export type ColumnStatus = 'todo' | 'doing' | 'paused' | 'done';
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import CircleDashed from '@lucide/svelte/icons/circle-dashed';
  import CircleDot from '@lucide/svelte/icons/circle-dot';
  import CirclePause from '@lucide/svelte/icons/circle-pause';
  import Icon from '../icon/Icon.svelte';

  const STATUS_ICONS = { todo: CircleDashed, doing: CircleDot, paused: CirclePause, done: CircleCheck };

  type Props = {
    title: string;
    status?: ColumnStatus;
    count?: number;
    countLabel?: string;
    headingLevel?: 2 | 3 | 4 | 5 | 6;
    dropTarget?: boolean;
    actions?: Snippet;
    children: Snippet;
  };

  let {
    title,
    status = 'todo',
    count,
    countLabel,
    headingLevel = 2,
    dropTarget = false,
    actions,
    children,
  }: Props = $props();

  const headingId = $props.id();
  const accessibleCount = $derived(countLabel ?? `${count} ${count === 1 ? 'tarjeta' : 'tarjetas'}`);
</script>

<section
  class="ds-column ds-column--{status}"
  class:ds-column--drop-target={dropTarget}
  aria-labelledby={headingId}
>
  <header class="ds-column__header">
    <span class="ds-column__icon"><Icon icon={STATUS_ICONS[status]} /></span>
    <svelte:element this={`h${headingLevel}`} id={headingId} class="ds-column__title">
      {title}
    </svelte:element>
    {#if count !== undefined}
      <span class="ds-column__count">
        <span aria-hidden="true">{count}</span>
        <span class="ds-column__sr">{accessibleCount}</span>
      </span>
    {/if}
    {#if actions}
      <div class="ds-column__actions">{@render actions()}</div>
    {/if}
  </header>

  <div class="ds-column__body">
    {@render children()}
  </div>
</section>

<style>
  .ds-column {
    --ds-column-accent: var(--ds-color-status-todo-accent);
    --ds-column-tint: var(--ds-color-status-todo-tint);
    --ds-column-on-tint: var(--ds-color-status-todo-on-tint);

    /* Bloque contenedor del texto oculto del contador (.ds-column__sr, que es
       position: absolute): sin esto se escapa del overflow y ensancha la página. */
    position: relative;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    flex: 0 0 var(--ds-column-width);
    width: var(--ds-column-width);
    max-width: 100%;
    min-height: 0;

    background-color: var(--ds-color-surface-sunken);
    color: var(--ds-color-text-primary);
    border: var(--ds-border-width-dashed) solid transparent;
    border-top: var(--ds-border-width-accent) solid var(--ds-column-accent);
    border-radius: var(--ds-radii-large);
    overflow: hidden;

    font-family: var(--ds-font-family-sans);
    transition: border-color var(--ds-duration-base) var(--ds-easing-standard),
                background-color var(--ds-duration-base) var(--ds-easing-standard);
  }

  /* ── Colores por estado ─────────────────────────────────── */
  .ds-column--doing {
    --ds-column-accent: var(--ds-color-status-doing-accent);
    --ds-column-tint: var(--ds-color-status-doing-tint);
    --ds-column-on-tint: var(--ds-color-status-doing-on-tint);
  }

  .ds-column--paused {
    --ds-column-accent: var(--ds-color-status-paused-accent);
    --ds-column-tint: var(--ds-color-status-paused-tint);
    --ds-column-on-tint: var(--ds-color-status-paused-on-tint);
  }

  .ds-column--done {
    --ds-column-accent: var(--ds-color-status-done-accent);
    --ds-column-tint: var(--ds-color-status-done-tint);
    --ds-column-on-tint: var(--ds-color-status-done-on-tint);
  }

  /* ── Destino de arrastre ────────────────────────────────── */
  .ds-column--drop-target {
    border-color: var(--ds-color-action-primary);
    border-top-color: var(--ds-column-accent);
  }

  /* ── Cabecera ───────────────────────────────────────────── */
  .ds-column__header {
    display: flex;
    align-items: center;
    gap: var(--ds-spacing-2);
    min-height: var(--ds-control-hit-area);
    padding: var(--ds-spacing-2) var(--ds-spacing-3) var(--ds-spacing-2) var(--ds-spacing-4);
    background-color: var(--ds-column-tint);
    color: var(--ds-column-on-tint);
  }

  .ds-column__icon {
    display: inline-flex;
    color: var(--ds-column-accent);
  }

  .ds-column__title {
    flex: 1 1 auto;
    min-width: 0;
    margin: 0;
    font-size: var(--ds-font-label-size);
    font-weight: var(--ds-font-subheading-weight);
    line-height: var(--ds-font-label-line-height);
    letter-spacing: var(--ds-font-label-letter-spacing);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ds-column__count {
    flex: none;
    padding: 0 var(--ds-spacing-2);
    border-radius: var(--ds-radii-full);
    background-color: var(--ds-color-surface-raised);
    color: var(--ds-column-on-tint);
    font-size: var(--ds-font-caption-size);
    font-weight: var(--ds-font-label-weight);
    line-height: var(--ds-font-label-line-height);
    font-variant-numeric: tabular-nums;
  }

  .ds-column__actions {
    display: flex;
    align-items: center;
    gap: var(--ds-spacing-1);
    flex: none;
  }

  /* Texto solo para lectores de pantalla. */
  .ds-column__sr {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }

  /* ── Cuerpo ─────────────────────────────────────────────── */
  /* Sin overflow propio: la columna crece con sus tarjetas. Un cuerpo con
     scroll anida un contenedor desplazable en cada columna, y las librerías
     de arrastre (p. ej. svelte-dnd-action) acumulan bucles de autodesplazamiento
     al recorrerlos, de modo que el tablero se desplaza sin control. */
  .ds-column__body {
    display: flex;
    flex-direction: column;
    gap: var(--ds-spacing-3);
    flex: 1 1 auto;
    min-height: var(--ds-column-body-min-height);
    padding: var(--ds-spacing-3);
  }

  @media (prefers-reduced-motion: reduce) {
    .ds-column {
      transition: none;
    }
  }
</style>
