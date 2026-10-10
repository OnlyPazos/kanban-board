<!--
  Card — design-system/components/card/Card.svelte

  Tarjeta de trabajo (p. ej. la tarjeta del kanban): etiquetas arriba,
  título, descripción recortada a card.description-lines líneas y pie con
  metadatos. Se eleva al pasar el ratón y tiene estado "arrastrando".

  Uso:
    <Card title={card.title} description={card.description} onopen={() => edit(card)}>
      {#snippet tags()}<Badge tone="bugfix">Arreglo</Badge>{/snippet}
      {#snippet footer()}Creada el 9 oct{/snippet}
    </Card>

  Props:
    title        texto del título (obligatorio)
    description  texto opcional, recortado visualmente
    onopen       si se pasa, el título es un botón y un clic en cualquier
                 zona de la tarjeta (fuera de otros controles) lo dispara
    dragging     estado visual mientras se arrastra (sombra lg, giro leve)
    readonly     sin hover ni apertura (p. ej. proyecto archivado)
    tags, footer snippets opcionales
  La tarjeta no implementa el arrastre: lo aporta la app (p. ej.
  svelte-dnd-action) sobre el contenedor.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    title: string;
    description?: string;
    onopen?: () => void;
    dragging?: boolean;
    readonly?: boolean;
    tags?: Snippet;
    footer?: Snippet;
  };

  let { title, description, onopen, dragging = false, readonly = false, tags, footer }: Props = $props();

  const interactive = $derived(!!onopen && !readonly);

  const INTERACTIVE = 'a, button, input, select, textarea, [role="button"]';

  /* Un clic en la tarjeta abre, salvo que venga de otro control interno. */
  function handleClick(event: MouseEvent) {
    if (!interactive) return;
    const target = event.target as HTMLElement;
    const control = target.closest(INTERACTIVE);
    if (control && !control.classList.contains('ds-card__open')) return;
    onopen?.();
  }
</script>

<!-- El teclado y los lectores de pantalla usan el botón del título; el clic en
     la tarjeta es solo un atajo de ratón/táctil. -->
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
<article
  class="ds-card"
  class:ds-card--interactive={interactive}
  class:ds-card--dragging={dragging}
  onclick={handleClick}
>
  {#if tags}
    <div class="ds-card__tags">{@render tags()}</div>
  {/if}

  <h3 class="ds-card__title">
    {#if interactive}
      <button type="button" class="ds-card__open">{title}</button>
    {:else}
      {title}
    {/if}
  </h3>

  {#if description}
    <p class="ds-card__description">{description}</p>
  {/if}

  {#if footer}
    <div class="ds-card__footer">{@render footer()}</div>
  {/if}
</article>

<style>
  .ds-card {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: var(--ds-spacing-2);
    padding: var(--ds-spacing-4);

    background-color: var(--ds-color-surface-raised);
    color: var(--ds-color-text-primary);
    border: var(--ds-border-width-default) solid var(--ds-color-border-default);
    border-radius: var(--ds-radii-large);
    box-shadow: var(--ds-shadow-sm);

    font-family: var(--ds-font-family-sans);
    transition: box-shadow var(--ds-duration-base) var(--ds-easing-standard),
                transform var(--ds-duration-base) var(--ds-easing-emphasized);
  }

  .ds-card--interactive {
    cursor: pointer;
  }

  .ds-card--interactive:hover {
    box-shadow: var(--ds-shadow-md);
    transform: translateY(calc(var(--ds-card-lift) * -1));
  }

  .ds-card--dragging,
  .ds-card--dragging:hover {
    box-shadow: var(--ds-shadow-lg);
    transform: rotate(var(--ds-card-drag-rotate));
    cursor: grabbing;
  }

  .ds-card__tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ds-spacing-1);
  }

  .ds-card__title {
    margin: 0;
    font-size: var(--ds-font-body-size);
    font-weight: var(--ds-font-subheading-weight);
    line-height: var(--ds-font-label-line-height);
    overflow-wrap: anywhere;
  }

  /* Botón del título: hereda el aspecto del texto, con foco visible. */
  .ds-card__open {
    display: inline;
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    border-radius: var(--ds-radii-small);
    outline: none;
  }

  .ds-card__open:focus-visible {
    outline: var(--ds-focus-ring-width) solid var(--ds-color-focus);
    outline-offset: var(--ds-focus-ring-offset);
  }

  .ds-card__description {
    margin: 0;
    color: var(--ds-color-text-secondary);
    font-size: var(--ds-font-label-size);
    line-height: var(--ds-font-body-line-height);
    white-space: pre-line;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: var(--ds-card-description-lines);
    line-clamp: var(--ds-card-description-lines);
    overflow: hidden;
  }

  .ds-card__footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ds-spacing-2);
    color: var(--ds-color-text-secondary);
    font-size: var(--ds-font-caption-size);
    line-height: var(--ds-font-caption-line-height);
    letter-spacing: var(--ds-font-caption-letter-spacing);
  }

  @media (prefers-reduced-motion: reduce) {
    .ds-card {
      transition: none;
    }

    .ds-card--interactive:hover,
    .ds-card--dragging,
    .ds-card--dragging:hover {
      transform: none;
    }
  }
</style>
