<!--
  Input — design-system/components/input/Input.svelte

  Campo de texto de una línea con etiqueta, ayuda y error.

  Uso:
    <Input label="Nombre del proyecto" bind:value={name} required maxlength={80}
           error={nameError} hint="Máximo 80 caracteres" />

  Props: label (obligatoria), value (bindable), hint, error, required,
  disabled, hideLabel, id y cualquier atributo nativo de <input>.
-->
<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import Field from '../field/Field.svelte';

  type Props = Omit<HTMLInputAttributes, 'value' | 'class'> & {
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
    type = 'text',
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
    <input
      {...rest}
      {...attrs}
      {type}
      class="ds-control"
      class:ds-control--error={!!error}
      bind:value
    />
  {/snippet}
</Field>
