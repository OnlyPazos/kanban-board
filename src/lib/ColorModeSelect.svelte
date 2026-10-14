<!--
  Selector "Modo de color" de la cabecera (AC-042, D-017). Select del
  sistema de diseño (combobox con lista propia, D-034): se maneja solo con
  el teclado. La etiqueta "Modo de color" es visible y va encima del
  selector, que es la disposición de serie de `Field` (AC-045, D-019). Es
  la <label for> del combobox, así que también le da su nombre accesible.
-->
<script lang="ts">
  import { Select } from 'design-system';
  import { COLOR_MODE_LABELS, COLOR_MODES, isColorMode, type ColorMode } from '../state/color-mode.svelte';

  let { mode = $bindable('auto') }: { mode?: ColorMode } = $props();

  const options = COLOR_MODES.map((value) => ({ value, label: COLOR_MODE_LABELS[value] }));
</script>

<Select
  label="Modo de color"
  {options}
  bind:value={
    () => mode,
    (value) => {
      if (isColorMode(value)) mode = value;
    }
  }
/>
