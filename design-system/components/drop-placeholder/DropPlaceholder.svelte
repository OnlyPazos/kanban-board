<!--
  DropPlaceholder — design-system/components/drop-placeholder/DropPlaceholder.svelte

  Hueco punteado que marca dónde caerá una tarjeta al soltarla, o el estado
  vacío de una columna. No es interactivo.

  Uso:
    <DropPlaceholder label="Sin tarjetas" />
    <DropPlaceholder active label="Suelta aquí" />

  Props:
    active  la tarjeta arrastrada está encima: borde action.primary y relleno
            action.tint                                             (false)
    label   texto opcional centrado; sin texto el hueco es decorativo y se
            oculta a los lectores de pantalla
  Icono decorativo: Inbox en reposo, ArrowDownToLine cuando está activo.
-->
<script lang="ts">
  import ArrowDownToLine from '@lucide/svelte/icons/arrow-down-to-line';
  import Inbox from '@lucide/svelte/icons/inbox';
  import Icon from '../icon/Icon.svelte';

  type Props = {
    active?: boolean;
    label?: string;
  };

  let { active = false, label }: Props = $props();
</script>

<div
  class="ds-drop-placeholder"
  class:ds-drop-placeholder--active={active}
  aria-hidden={label ? undefined : 'true'}
>
  <Icon icon={active ? ArrowDownToLine : Inbox} size="xl" />
  {#if label}<span>{label}</span>{/if}
</div>

<style>
  .ds-drop-placeholder {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--ds-spacing-2);
    min-height: var(--ds-column-body-min-height);
    padding: var(--ds-spacing-4);

    border: var(--ds-border-width-dashed) dashed var(--ds-color-border-strong);
    border-radius: var(--ds-radii-large);
    background-color: transparent;
    color: var(--ds-color-text-secondary);

    font-family: var(--ds-font-family-sans);
    font-size: var(--ds-font-label-size);
    font-weight: var(--ds-font-label-weight);
    line-height: var(--ds-font-label-line-height);
    text-align: center;

    transition: border-color var(--ds-duration-fast) var(--ds-easing-standard),
                background-color var(--ds-duration-fast) var(--ds-easing-standard),
                color var(--ds-duration-fast) var(--ds-easing-standard);
  }

  .ds-drop-placeholder--active {
    border-color: var(--ds-color-action-primary);
    background-color: var(--ds-color-action-tint);
    color: var(--ds-color-action-on-tint);
  }

  @media (prefers-reduced-motion: reduce) {
    .ds-drop-placeholder {
      transition: none;
    }
  }
</style>
