<!--
  Dialog — design-system/components/dialog/Dialog.svelte

  Diálogo modal sobre <dialog> nativo: foco atrapado, Escape para cerrar,
  fondo bloqueado y entrada con rebote leve.

  Uso:
    <Dialog bind:open={confirming} title="¿Borrar el proyecto?" size="sm"
            description="Se borrarán el proyecto «Mi app» y sus 12 tarjetas.">
      {#snippet actions()}
        <Button variant="secondary" onclick={() => (confirming = false)}>Cancelar</Button>
        <Button variant="danger" onclick={remove}>Borrar definitivamente</Button>
      {/snippet}
    </Dialog>

  Props:
    open         boolean, bindable                          (false)
    title        título (obligatorio; da nombre accesible)
    description  texto bajo el título (opcional)
    size         sm | md                                    (md)
    dismissible  Escape, clic fuera y botón × cierran       (true)
    closeLabel   etiqueta del botón ×                       ("Cerrar")
    onclose      se llama cada vez que el diálogo se cierra
    children     contenido; actions → pie con botones
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import Button from '../button/Button.svelte';

  type Props = {
    open?: boolean;
    title: string;
    description?: string;
    size?: 'sm' | 'md';
    dismissible?: boolean;
    closeLabel?: string;
    onclose?: () => void;
    children?: Snippet;
    actions?: Snippet;
  };

  let {
    open = $bindable(false),
    title,
    description,
    size = 'md',
    dismissible = true,
    closeLabel = 'Cerrar',
    onclose,
    children,
    actions,
  }: Props = $props();

  let dialog: HTMLDialogElement | undefined = $state();
  const uid = $props.id();

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });

  function handleClose() {
    open = false;
    onclose?.();
  }

  function handleCancel(event: Event) {
    if (!dismissible) event.preventDefault();
  }

  /* El panel ocupa todo el <dialog>: un clic cuyo destino es el propio
     <dialog> solo puede venir del fondo. */
  function handleBackdropClick(event: MouseEvent) {
    if (dismissible && event.target === dialog) dialog?.close();
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
<dialog
  bind:this={dialog}
  class="ds-dialog ds-dialog--{size}"
  aria-labelledby="{uid}-title"
  aria-describedby={description ? `${uid}-description` : undefined}
  onclose={handleClose}
  oncancel={handleCancel}
  onclick={handleBackdropClick}
>
  <div class="ds-dialog__panel">
    <header class="ds-dialog__header">
      <h2 id="{uid}-title" class="ds-dialog__title">{title}</h2>
      {#if dismissible}
        <Button variant="ghost" size="sm" aria-label={closeLabel} onclick={() => dialog?.close()}>
          <span aria-hidden="true">×</span>
        </Button>
      {/if}
    </header>

    {#if description}
      <p id="{uid}-description" class="ds-dialog__description">{description}</p>
    {/if}

    {#if children}
      <div class="ds-dialog__body">{@render children()}</div>
    {/if}

    {#if actions}
      <footer class="ds-dialog__actions">{@render actions()}</footer>
    {/if}
  </div>
</dialog>

<style>
  .ds-dialog {
    box-sizing: border-box;
    width: calc(100% - var(--ds-spacing-4) * 2);
    max-height: calc(100% - var(--ds-spacing-4) * 2);
    margin: auto;
    padding: 0;

    background-color: var(--ds-color-surface-raised);
    color: var(--ds-color-text-primary);
    border: var(--ds-border-width-default) solid var(--ds-color-border-default);
    border-radius: var(--ds-radii-large);
    box-shadow: var(--ds-shadow-lg);

    font-family: var(--ds-font-family-sans);
    font-size: var(--ds-font-body-size);
    line-height: var(--ds-font-body-line-height);
  }

  .ds-dialog--sm {
    max-width: var(--ds-dialog-max-width-sm);
  }

  .ds-dialog--md {
    max-width: var(--ds-dialog-max-width-md);
  }

  .ds-dialog[open] {
    animation: ds-dialog-in var(--ds-duration-slow) var(--ds-easing-emphasized);
  }

  .ds-dialog::backdrop {
    background-color: var(--ds-color-overlay);
  }

  .ds-dialog[open]::backdrop {
    animation: ds-backdrop-in var(--ds-duration-base) var(--ds-easing-standard);
  }

  @keyframes ds-dialog-in {
    from {
      opacity: 0;
      transform: scale(var(--ds-dialog-enter-scale));
    }
  }

  @keyframes ds-backdrop-in {
    from {
      opacity: 0;
    }
  }

  .ds-dialog__panel {
    display: flex;
    flex-direction: column;
    gap: var(--ds-spacing-4);
    padding: var(--ds-spacing-5);
  }

  .ds-dialog__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--ds-spacing-3);
  }

  .ds-dialog__title {
    margin: 0;
    font-size: var(--ds-font-subheading-size);
    font-weight: var(--ds-font-subheading-weight);
    line-height: var(--ds-font-subheading-line-height);
    letter-spacing: var(--ds-font-subheading-letter-spacing);
    overflow-wrap: anywhere;
  }

  .ds-dialog__description {
    margin: 0;
    color: var(--ds-color-text-secondary);
  }

  .ds-dialog__body {
    display: flex;
    flex-direction: column;
    gap: var(--ds-spacing-4);
  }

  .ds-dialog__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--ds-spacing-2);
    padding-top: var(--ds-spacing-2);
  }

  @media (prefers-reduced-motion: reduce) {
    .ds-dialog[open],
    .ds-dialog[open]::backdrop {
      animation: none;
    }
  }
</style>
