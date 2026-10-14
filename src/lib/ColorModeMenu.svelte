<!--
  Menú "Modo de color" de la cabecera (AC-058, D-035; sustituye al selector
  de AC-042/AC-045). `MenuButton` del sistema de diseño: botón de solo
  icono con nombre accesible "Modo de color" cuyo icono refleja la
  preferencia actual, y un menú con Auto / Claro / Oscuro.
-->
<script lang="ts">
  import { MenuButton } from 'design-system';
  import { COLOR_MODE_ICON } from './icons';
  import { COLOR_MODE_LABELS, COLOR_MODES, isColorMode, type ColorMode } from '../state/color-mode.svelte';

  let { mode = $bindable('auto') }: { mode?: ColorMode } = $props();

  const items = COLOR_MODES.map((value) => ({ value, label: COLOR_MODE_LABELS[value], icon: COLOR_MODE_ICON[value] }));
</script>

<MenuButton
  label="Modo de color"
  {items}
  icon={COLOR_MODE_ICON[mode]}
  align="end"
  bind:value={
    () => mode,
    (value) => {
      if (isColorMode(value)) mode = value;
    }
  }
/>
