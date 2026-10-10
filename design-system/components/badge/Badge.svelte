<!--
  Badge — design-system/components/badge/Badge.svelte

  Etiqueta no interactiva para categorías, prioridades o estados.
  El significado siempre va en el texto; el color solo lo refuerza.

  Uso:
    <Badge tone="feature">Novedad</Badge>
    <Badge tone="danger">Alta</Badge>

  Props:
    tone  neutral | feature | improvement | bugfix | technical |
          danger | warning | success | info                (neutral)
    Las tonalidades feature/improvement/bugfix/technical usan tag.* (relleno).
    Las de feedback usan contorno sobre la superficie que las contiene; están
    validadas sobre surface.raised (tarjetas y diálogos).
-->
<script lang="ts" module>
  export type BadgeTone =
    | 'neutral'
    | 'feature'
    | 'improvement'
    | 'bugfix'
    | 'technical'
    | 'danger'
    | 'warning'
    | 'success'
    | 'info';
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    tone?: BadgeTone;
    children: Snippet;
  };

  let { tone = 'neutral', children }: Props = $props();
</script>

<span class="ds-badge ds-badge--{tone}">{@render children()}</span>

<style>
  .ds-badge {
    display: inline-flex;
    align-items: center;
    box-sizing: border-box;
    padding: 0 var(--ds-spacing-2);
    border: var(--ds-border-width-default) solid transparent;
    border-radius: var(--ds-radii-full);

    font-family: var(--ds-font-family-sans);
    font-size: var(--ds-font-caption-size);
    font-weight: var(--ds-font-label-weight);
    line-height: var(--ds-font-label-line-height);
    letter-spacing: var(--ds-font-caption-letter-spacing);
    white-space: nowrap;
  }

  /* ── Neutral ────────────────────────────────────────────── */
  .ds-badge--neutral {
    background-color: var(--ds-color-surface-base);
    color: var(--ds-color-text-secondary);
  }

  /* ── Categorías (relleno tag.*) ─────────────────────────── */
  .ds-badge--feature {
    background-color: var(--ds-color-tag-feature-bg);
    color: var(--ds-color-tag-feature-fg);
  }

  .ds-badge--improvement {
    background-color: var(--ds-color-tag-improvement-bg);
    color: var(--ds-color-tag-improvement-fg);
  }

  .ds-badge--bugfix {
    background-color: var(--ds-color-tag-bugfix-bg);
    color: var(--ds-color-tag-bugfix-fg);
  }

  .ds-badge--technical {
    background-color: var(--ds-color-tag-technical-bg);
    color: var(--ds-color-tag-technical-fg);
  }

  /* ── Feedback (contorno sobre la superficie) ────────────── */
  .ds-badge--danger {
    border-color: var(--ds-color-feedback-danger);
    color: var(--ds-color-feedback-danger);
  }

  .ds-badge--warning {
    border-color: var(--ds-color-feedback-warning);
    color: var(--ds-color-feedback-warning);
  }

  .ds-badge--success {
    border-color: var(--ds-color-feedback-success);
    color: var(--ds-color-feedback-success);
  }

  .ds-badge--info {
    border-color: var(--ds-color-feedback-info);
    color: var(--ds-color-feedback-info);
  }
</style>
