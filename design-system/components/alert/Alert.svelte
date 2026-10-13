<!--
  Alert — design-system/components/alert/Alert.svelte

  Aviso en línea con acento de color, título y acciones opcionales.
  danger y warning se anuncian de inmediato (role="alert"); success e info
  de forma educada (role="status").

  Uso:
    <Alert tone="danger" title="No se pudo guardar">
      Tus últimos cambios no se han guardado.
      {#snippet actions()}
        <Button size="sm" onclick={exportNow}>Exportar ahora</Button>
      {/snippet}
    </Alert>

  Props:
    tone     danger | warning | success | info   (info)
    title    texto del título (opcional)
    actions  snippet con botones (opcional)
  Cada tono lleva su icono (CircleAlert, TriangleAlert, CircleCheck, Info),
  decorativo: el significado va en el título y el texto.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import CircleAlert from '@lucide/svelte/icons/circle-alert';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import Info from '@lucide/svelte/icons/info';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import Icon from '../icon/Icon.svelte';

  type Props = {
    tone?: 'danger' | 'warning' | 'success' | 'info';
    title?: string;
    children?: Snippet;
    actions?: Snippet;
  };

  let { tone = 'info', title, children, actions }: Props = $props();

  const ICONS = { danger: CircleAlert, warning: TriangleAlert, success: CircleCheck, info: Info };

  const role = $derived(tone === 'danger' || tone === 'warning' ? 'alert' : 'status');
</script>

<div class="ds-alert ds-alert--{tone}" {role}>
  <span class="ds-alert__icon"><Icon icon={ICONS[tone]} size="lg" /></span>
  <div class="ds-alert__content">
    {#if title}
      <p class="ds-alert__title">{title}</p>
    {/if}
    {#if children}
      <div class="ds-alert__body">{@render children()}</div>
    {/if}
  </div>
  {#if actions}
    <div class="ds-alert__actions">{@render actions()}</div>
  {/if}
</div>

<style>
  .ds-alert {
    box-sizing: border-box;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--ds-spacing-3) var(--ds-spacing-4);
    padding: var(--ds-spacing-3) var(--ds-spacing-4);

    background-color: var(--ds-color-surface-raised);
    color: var(--ds-color-text-primary);
    border: var(--ds-border-width-default) solid var(--ds-color-border-default);
    border-left-width: var(--ds-border-width-accent);
    border-radius: var(--ds-radii-medium);
    box-shadow: var(--ds-shadow-sm);

    font-family: var(--ds-font-family-sans);
    font-size: var(--ds-font-label-size);
    line-height: var(--ds-font-body-line-height);
  }

  .ds-alert__content {
    display: flex;
    flex-direction: column;
    gap: var(--ds-spacing-1);
    min-width: 0;
    flex: 1 1 auto;
  }

  .ds-alert__title {
    margin: 0;
    font-weight: var(--ds-font-subheading-weight);
  }

  .ds-alert__icon {
    display: inline-flex;
    align-self: flex-start;
  }

  .ds-alert--danger .ds-alert__icon {
    color: var(--ds-color-feedback-danger);
  }

  .ds-alert--warning .ds-alert__icon {
    color: var(--ds-color-feedback-warning);
  }

  .ds-alert--success .ds-alert__icon {
    color: var(--ds-color-feedback-success);
  }

  .ds-alert--info .ds-alert__icon {
    color: var(--ds-color-feedback-info);
  }

  .ds-alert__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ds-spacing-2);
  }

  .ds-alert--danger {
    border-left-color: var(--ds-color-feedback-danger);
  }

  .ds-alert--danger .ds-alert__title {
    color: var(--ds-color-feedback-danger);
  }

  .ds-alert--warning {
    border-left-color: var(--ds-color-feedback-warning);
  }

  .ds-alert--warning .ds-alert__title {
    color: var(--ds-color-feedback-warning);
  }

  .ds-alert--success {
    border-left-color: var(--ds-color-feedback-success);
  }

  .ds-alert--success .ds-alert__title {
    color: var(--ds-color-feedback-success);
  }

  .ds-alert--info {
    border-left-color: var(--ds-color-feedback-info);
  }

  .ds-alert--info .ds-alert__title {
    color: var(--ds-color-feedback-info);
  }
</style>
