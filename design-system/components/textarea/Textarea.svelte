<!--
  Textarea — design-system/components/textarea/Textarea.svelte

  Campo de texto multilínea con etiqueta, ayuda y error. Redimensionable
  solo en vertical.

  Uso:
    <Textarea label="Descripción" bind:value={description} rows={5} />

  Props: label (obligatoria), value (bindable), rows (por defecto 4), hint,
  error, required, disabled, hideLabel, id y cualquier atributo nativo de
  <textarea>.
-->
<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';
  import Field from '../field/Field.svelte';

  type Props = Omit<HTMLTextareaAttributes, 'value' | 'class'> & {
    label: string;
    value?: string;
    hint?: string;
    error?: string;
    hideLabel?: boolean;
  };

  let {
    label,
    value = $bindable(''),
    hint,
    error,
    hideLabel = false,
    required = false,
    disabled = false,
    id,
    rows = 4,
    ...rest
  }: Props = $props();
</script>

<Field
  {label}
  {hint}
  {error}
  {hideLabel}
  required={!!required}
  disabled={!!disabled}
  id={id ?? undefined}
>
  {#snippet control(attrs)}
    <textarea
      {...rest}
      {...attrs}
      {rows}
      class="ds-control ds-textarea"
      class:ds-control--error={!!error}
      bind:value
    ></textarea>
  {/snippet}
</Field>

<style>
  :global(.ds-textarea) {
    resize: vertical;
  }
</style>
