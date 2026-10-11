<!--
  Selector "Modo de color" de la cabecera (AC-042, D-017). Select nativo
  del sistema de diseño: se maneja solo con el teclado.
-->
<script lang="ts">
  import { Select } from 'design-system';
  import { COLOR_MODE_LABELS, COLOR_MODES, isColorMode, type ColorMode } from '../state/color-mode.svelte';

  let { mode = $bindable('auto') }: { mode?: ColorMode } = $props();

  const options = COLOR_MODES.map((value) => ({ value, label: COLOR_MODE_LABELS[value] }));
</script>

<Select
  label="Modo de color"
  hideLabel
  {options}
  bind:value={
    () => mode,
    (value) => {
      if (isColorMode(value)) mode = value;
    }
  }
/>
