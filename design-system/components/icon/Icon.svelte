<!--
  Icon — design-system/components/icon/Icon.svelte

  Envoltorio para iconos de Lucide (@lucide/svelte): aplica el tamaño y el
  grosor de trazo de los tokens y hereda el color del texto (currentColor).

  Uso:
    <script>import { Calendar } from '@lucide/svelte';</script>
    <Icon icon={Calendar} />                      decorativo (aria-hidden)
    <Icon icon={Calendar} label="Fecha" />        con significado (role="img")

  Props:
    icon   componente de @lucide/svelte (obligatorio)
    size   sm | md | lg | xl  → icon.size.*                       (md)
    label  texto accesible; sin él el icono se oculta a los lectores de
           pantalla y el significado debe ir en el texto que lo acompaña
-->
<script lang="ts" module>
  import type { Component } from 'svelte';

  /* Cualquier icono de @lucide/svelte (o un componente SVG equivalente). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type IconComponent = Component<any>;
  export type IconSize = 'sm' | 'md' | 'lg' | 'xl';
</script>

<script lang="ts">
  type Props = {
    icon: IconComponent;
    size?: IconSize;
    label?: string;
  };

  let { icon: IconSvg, size = 'md', label }: Props = $props();
</script>

<span
  class="ds-icon ds-icon--{size}"
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
>
  <IconSvg aria-hidden="true" focusable="false" />
</span>

<style>
  .ds-icon {
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    color: inherit;
    line-height: 0;
  }

  .ds-icon--sm {
    width: var(--ds-icon-size-sm);
    height: var(--ds-icon-size-sm);
  }

  .ds-icon--md {
    width: var(--ds-icon-size-md);
    height: var(--ds-icon-size-md);
  }

  .ds-icon--lg {
    width: var(--ds-icon-size-lg);
    height: var(--ds-icon-size-lg);
  }

  .ds-icon--xl {
    width: var(--ds-icon-size-xl);
    height: var(--ds-icon-size-xl);
  }

  /* El SVG de Lucide trae width/height/stroke-width como atributos: el CSS
     los sustituye por los tokens. */
  .ds-icon :global(svg) {
    width: 100%;
    height: 100%;
    stroke-width: var(--ds-icon-stroke-width);
  }
</style>
