<!--
  Button — design-system/components/button/Button.svelte

  Botón con variantes, tamaños y estados. Sustituye al antiguo Web
  Component <ds-button>.

  Uso:
    <Button onclick={save}>Guardar</Button>
    <Button variant="secondary" size="sm">Cancelar</Button>
    <Button variant="danger" loading={deleting}>Borrar definitivamente</Button>
    <Button variant="ghost" aria-label="Cerrar">×</Button>

  Props:
    variant  primary | secondary | outline | ghost | danger   (primary)
    size     sm | md | lg                                      (md)
    type     button | submit | reset                           (button)
    loading  muestra el spinner y anula los clics SIN quitar el foco
             (usa aria-disabled en lugar de disabled)
    disabled deshabilitado nativo
    block    ocupa todo el ancho
    icon     icono de @lucide/svelte delante del texto (decorativo). Sin
             texto, el botón es cuadrado (solo icono).
    + cualquier atributo nativo de <button> (onclick, aria-label…).
  aria-label es obligatorio si el botón no tiene texto (solo icono):
    <Button variant="ghost" size="sm" icon={X} aria-label="Cerrar" />
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import Icon, { type IconComponent } from '../icon/Icon.svelte';

  type Props = Omit<HTMLButtonAttributes, 'class'> & {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    block?: boolean;
    icon?: IconComponent;
    children?: Snippet;
  };

  let {
    variant = 'primary',
    size = 'md',
    type = 'button',
    loading = false,
    block = false,
    disabled = false,
    icon,
    onclick,
    children,
    ...rest
  }: Props = $props();

  /* Mientras carga, el botón conserva el foco pero no actúa (ni envía el form). */
  const handleClick: HTMLButtonAttributes['onclick'] = (event) => {
    if (loading) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    onclick?.(event);
  };
</script>

<button
  {...rest}
  {type}
  {disabled}
  class="ds-btn ds-btn--{variant} ds-btn--{size}"
  class:ds-btn--block={block}
  class:ds-btn--icon-only={!!icon && !children}
  aria-disabled={loading ? 'true' : undefined}
  aria-busy={loading ? 'true' : undefined}
  onclick={handleClick}
>
  <span class="ds-btn__spinner" aria-hidden="true"></span>
  <span class="ds-btn__label">
    {#if icon}<Icon {icon} size={size === 'lg' ? 'lg' : 'md'} />{/if}
    {@render children?.()}
  </span>
</button>

<style>
  /* ── Base ───────────────────────────────────────────────── */
  .ds-btn {
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--ds-spacing-2);
    margin: 0;

    font-family: var(--ds-font-family-sans);
    font-size: var(--ds-font-label-size);
    font-weight: var(--ds-font-label-weight);
    line-height: var(--ds-font-label-line-height);
    letter-spacing: var(--ds-font-label-letter-spacing);

    min-height: var(--ds-control-min-height-md);
    min-width: var(--ds-control-hit-area);
    padding: var(--ds-spacing-2) var(--ds-spacing-4);

    border: var(--ds-border-width-default) solid transparent;
    border-radius: var(--ds-radii-medium);

    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    outline: none;
    transition: background-color var(--ds-duration-fast) var(--ds-easing-standard),
                border-color var(--ds-duration-fast) var(--ds-easing-standard),
                color var(--ds-duration-fast) var(--ds-easing-standard),
                transform var(--ds-duration-base) var(--ds-easing-emphasized);
  }

  .ds-btn__label {
    display: inline-flex;
    align-items: center;
    gap: var(--ds-spacing-2);
  }

  /* ── Foco visible ───────────────────────────────────────── */
  .ds-btn:focus-visible {
    outline: var(--ds-focus-ring-width) solid var(--ds-color-focus);
    outline-offset: var(--ds-focus-ring-offset);
  }

  /* ── Pulsación con rebote ───────────────────────────────── */
  .ds-btn:active:not(:disabled):not([aria-busy='true']) {
    transform: scale(var(--ds-control-press-scale));
  }

  /* ── Variant: Primary ───────────────────────────────────── */
  .ds-btn--primary {
    background-color: var(--ds-color-action-primary);
    border-color: var(--ds-color-action-primary);
    color: var(--ds-color-action-on-primary);
  }

  .ds-btn--primary:hover:not(:disabled) {
    background-color: var(--ds-color-action-primary-hover);
    border-color: var(--ds-color-action-primary-hover);
  }

  .ds-btn--primary:active:not(:disabled) {
    background-color: var(--ds-color-action-primary-active);
    border-color: var(--ds-color-action-primary-active);
  }

  /* ── Variant: Secondary ─────────────────────────────────── */
  .ds-btn--secondary {
    background-color: var(--ds-color-surface-raised);
    border-color: var(--ds-color-border-strong);
    color: var(--ds-color-text-primary);
  }

  .ds-btn--secondary:hover:not(:disabled) {
    background-color: var(--ds-color-surface-hover);
  }

  .ds-btn--secondary:active:not(:disabled) {
    background-color: var(--ds-color-surface-active);
  }

  /* ── Variant: Outline ───────────────────────────────────── */
  .ds-btn--outline {
    background-color: transparent;
    border-color: var(--ds-color-action-primary);
    color: var(--ds-color-action-primary);
  }

  .ds-btn--outline:hover:not(:disabled) {
    background-color: var(--ds-color-action-tint);
    color: var(--ds-color-action-on-tint);
  }

  .ds-btn--outline:active:not(:disabled) {
    background-color: var(--ds-color-action-tint-active);
    color: var(--ds-color-action-on-tint);
  }

  /* ── Variant: Ghost ─────────────────────────────────────── */
  .ds-btn--ghost {
    background-color: transparent;
    border-color: transparent;
    color: var(--ds-color-text-primary);
  }

  .ds-btn--ghost:hover:not(:disabled) {
    background-color: var(--ds-color-surface-hover);
  }

  .ds-btn--ghost:active:not(:disabled) {
    background-color: var(--ds-color-surface-active);
  }

  /* ── Variant: Danger (acciones destructivas) ────────────── */
  .ds-btn--danger {
    background-color: var(--ds-color-feedback-danger);
    border-color: var(--ds-color-feedback-danger);
    color: var(--ds-color-feedback-on-danger);
  }

  .ds-btn--danger:hover:not(:disabled),
  .ds-btn--danger:active:not(:disabled) {
    background-color: var(--ds-color-feedback-danger-hover);
    border-color: var(--ds-color-feedback-danger-hover);
  }

  /* ── Disabled (exento de contraste por WCAG; va tras las variantes) ── */
  .ds-btn:disabled {
    cursor: not-allowed;
    background-color: var(--ds-color-surface-base);
    border-color: var(--ds-color-border-default);
    color: var(--ds-color-text-disabled);
  }

  /* ── Loading ────────────────────────────────────────────── */
  .ds-btn[aria-busy='true'] {
    cursor: wait;
  }

  /* La etiqueta se oculta visualmente pero sigue en el árbol de accesibilidad. */
  .ds-btn[aria-busy='true'] .ds-btn__label {
    visibility: hidden;
  }

  .ds-btn__spinner {
    display: none;
    position: absolute;
    inset: 0;
    margin: auto;
    box-sizing: border-box;
    width: var(--ds-spinner-size);
    height: var(--ds-spinner-size);
    border: var(--ds-focus-ring-width) solid currentColor;
    border-top-color: transparent;
    border-radius: var(--ds-radii-full);
    animation: ds-spin var(--ds-duration-spinner) var(--ds-easing-linear) infinite;
  }

  .ds-btn[aria-busy='true'] .ds-btn__spinner {
    display: block;
  }

  @keyframes ds-spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ── Tamaños ────────────────────────────────────────────── */
  .ds-btn--sm {
    min-height: var(--ds-control-min-height-sm);
    padding: var(--ds-spacing-1) var(--ds-spacing-3);
  }

  /* sm es visualmente más bajo, pero su zona clicable/táctil se amplía al
     mínimo de control.hit-area sin alterar el layout. */
  .ds-btn--sm::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    min-width: var(--ds-control-hit-area);
    min-height: var(--ds-control-hit-area);
    transform: translate(-50%, -50%);
  }

  /* Solo icono: cuadrado con la altura del tamaño elegido. */
  .ds-btn.ds-btn--icon-only {
    padding-left: 0;
    padding-right: 0;
  }

  .ds-btn--icon-only.ds-btn--sm {
    min-width: var(--ds-control-min-height-sm);
  }

  .ds-btn--icon-only.ds-btn--lg {
    min-width: var(--ds-control-min-height-lg);
  }

  .ds-btn--lg {
    min-height: var(--ds-control-min-height-lg);
    padding: var(--ds-spacing-3) var(--ds-spacing-5);
    font-size: var(--ds-font-body-size);
  }

  /* ── Ancho completo ─────────────────────────────────────── */
  .ds-btn--block {
    display: flex;
    width: 100%;
  }

  /* ── Movimiento reducido ────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .ds-btn {
      transition: none;
    }

    .ds-btn:active:not(:disabled):not([aria-busy='true']) {
      transform: none;
    }

    .ds-btn__spinner {
      animation-duration: var(--ds-duration-spinner-reduced);
    }
  }
</style>
