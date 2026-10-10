<!--
  Select — design-system/components/select/Select.svelte

  Selector nativo (<select>) con etiqueta, ayuda, error y flecha dibujada
  con CSS (sin imágenes ni colores sueltos).

  Uso:
    <Select label="Tipo" bind:value={type} options={[
      { value: 'novedad', label: 'Novedad' },
      { value: 'mejora', label: 'Mejora' },
    ]} />

  Props: label (obligatoria), options (obligatoria), value (bindable),
  placeholder (opción vacía no seleccionable), hint, error, required,
  disabled, hideLabel, id y cualquier atributo nativo de <select>.
-->
<script lang="ts" module>
  export type SelectOption = { value: string; label: string; disabled?: boolean };
</script>

<script lang="ts">
  import type { HTMLSelectAttributes } from 'svelte/elements';
  import Field from '../field/Field.svelte';

  type Props = Omit<HTMLSelectAttributes, 'value' | 'class' | 'multiple'> & {
    label: string;
    options: SelectOption[];
    value?: string;
    placeholder?: string;
    hint?: string;
    error?: string;
    hideLabel?: boolean;
  };

  let {
    label,
    options,
    value = $bindable(''),
    placeholder,
    hint,
    error,
    hideLabel = false,
    required = false,
    disabled = false,
    id,
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
    <div class="ds-select" class:ds-select--disabled={!!disabled}>
      <select
        {...rest}
        {...attrs}
        class="ds-control ds-select__control"
        class:ds-control--error={!!error}
        bind:value
      >
        {#if placeholder}
          <option value="" disabled>{placeholder}</option>
        {/if}
        {#each options as option (option.value)}
          <option value={option.value} disabled={option.disabled}>{option.label}</option>
        {/each}
      </select>
    </div>
  {/snippet}
</Field>

<style>
  .ds-select {
    position: relative;
    color: var(--ds-color-text-secondary);
  }

  .ds-select--disabled {
    color: var(--ds-color-text-disabled);
  }

  /* Flecha: un cuadrado con dos bordes, girado 45°. */
  .ds-select::after {
    content: '';
    position: absolute;
    top: 50%;
    right: var(--ds-spacing-4);
    box-sizing: border-box;
    width: var(--ds-control-chevron-size);
    height: var(--ds-control-chevron-size);
    border-right: var(--ds-focus-ring-width) solid currentColor;
    border-bottom: var(--ds-focus-ring-width) solid currentColor;
    transform: translateY(-75%) rotate(45deg);
    pointer-events: none;
  }

  :global(.ds-select__control) {
    appearance: none;
    cursor: pointer;
    padding-right: calc(var(--ds-spacing-4) * 2 + var(--ds-control-chevron-size));
  }

  :global(.ds-select__control:disabled) {
    cursor: not-allowed;
  }
</style>
