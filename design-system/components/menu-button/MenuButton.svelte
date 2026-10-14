<!--
  MenuButton — design-system/components/menu-button/MenuButton.svelte

  Botón (normalmente de solo icono) que abre un menú de opciones
  excluyentes (role="menu" con role="menuitemradio"), con el mismo aspecto
  de lista que Select. Pensado para ajustes rápidos, p. ej. el tema.

  Uso:
    <MenuButton label="Tema" icon={Sun} bind:value={mode} items={[
      { value: 'auto', label: 'Automático', icon: Monitor },
      { value: 'light', label: 'Claro', icon: Sun },
      { value: 'dark', label: 'Oscuro', icon: Moon },
    ]} />

  Props:
    label     nombre accesible del botón (obligatorio; también del menú)
    items     { value, label, icon? }[] (obligatorio)
    value     opción elegida, bindable
    icon      icono del botón; sin él, el botón muestra `label` como texto
    variant   variante de Button                                  (ghost)
    size      tamaño de Button                                    (md)
    align     start | end — lado del botón al que se alinea el menú (end)
    onchange  (value) => void

  Teclado: Intro, Espacio o ↓ abren el menú en la opción elegida, ↑ en la
  última; dentro, ↓ ↑ (dan la vuelta) Inicio Fin mueven el foco, Intro o
  Espacio eligen y cierran, Escape cierra; al cerrar, el foco vuelve al
  botón. Tab cierra sin elegir.
-->
<script lang="ts" module>
  import type { IconComponent } from '../icon/Icon.svelte';

  export type MenuButtonItem = { value: string; label: string; icon?: IconComponent };
</script>

<script lang="ts">
  import { tick } from 'svelte';
  import Check from '@lucide/svelte/icons/check';
  import Button from '../button/Button.svelte';
  import Icon from '../icon/Icon.svelte';
  import { popup } from '../shared/popup.js';
  import '../shared/popup.css';

  type Props = {
    label: string;
    items: MenuButtonItem[];
    value?: string;
    icon?: IconComponent;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    align?: 'start' | 'end';
    onchange?: (value: string) => void;
  };

  let {
    label,
    items,
    value = $bindable(''),
    icon,
    variant = 'ghost',
    size = 'md',
    align = 'end',
    onchange,
  }: Props = $props();

  const uid = $props.id();
  const menuId = `${uid}-menu`;
  const triggerId = `${uid}-trigger`;

  let open = $state(false);
  let anchor: HTMLElement | undefined = $state();
  let menu: HTMLElement | undefined = $state();

  const itemEls = () => [...(menu?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])];
  const trigger = () => anchor?.querySelector<HTMLElement>('button');

  async function show(at: 'selected' | 'first' | 'last') {
    open = true;
    await tick();
    const els = itemEls();
    const selectedIndex = items.findIndex((item) => item.value === value);
    const index = at === 'last' ? els.length - 1 : at === 'first' || selectedIndex < 0 ? 0 : selectedIndex;
    els[index]?.focus();
  }

  function hide(returnFocus = true) {
    if (!open) return;
    open = false;
    if (returnFocus) trigger()?.focus();
  }

  function choose(next: string) {
    hide();
    if (next !== value) {
      value = next;
      onchange?.(next);
    }
  }

  function handleTriggerKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      void show(event.key === 'ArrowUp' ? 'last' : 'selected');
    }
  }

  function handleMenuKeydown(event: KeyboardEvent) {
    const els = itemEls();
    const index = els.indexOf(document.activeElement as HTMLElement);
    const focusAt = (i: number) => els[(i + els.length) % els.length]?.focus();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusAt(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusAt(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusAt(0);
        break;
      case 'End':
        event.preventDefault();
        focusAt(els.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        hide();
        break;
      case 'Tab':
        hide(false);
        break;
    }
  }

  function handleWindowPointer(event: PointerEvent) {
    if (!open) return;
    const target = event.target as Node;
    if (anchor?.contains(target) || menu?.contains(target)) return;
    hide(false);
  }
</script>

<svelte:window onpointerdown={handleWindowPointer} />

<span class="ds-menu-button" bind:this={anchor}>
  {#if icon}
    <Button
      {variant}
      {size}
      {icon}
      id={triggerId}
      aria-label={label}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      onclick={() => (open ? hide() : show('selected'))}
      onkeydown={handleTriggerKeydown}
    />
  {:else}
    <Button
      {variant}
      {size}
      id={triggerId}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      onclick={() => (open ? hide() : show('selected'))}
      onkeydown={handleTriggerKeydown}
    >
      {label}
    </Button>
  {/if}

  {#if open}
    <ul
      bind:this={menu}
      id={menuId}
      class="ds-popup"
      role="menu"
      aria-labelledby={triggerId}
      tabindex="-1"
      onkeydown={handleMenuKeydown}
      use:popup={{ anchor, align }}
    >
      {#each items as item (item.value)}
        <li role="none">
          <button
            type="button"
            role="menuitemradio"
            class="ds-popup__item"
            class:ds-popup__item--selected={item.value === value}
            aria-checked={item.value === value}
            tabindex="-1"
            onclick={() => choose(item.value)}
          >
            {#if item.icon}<Icon icon={item.icon} />{/if}
            <span class="ds-popup__label">{item.label}</span>
            <span class="ds-popup__mark"><Icon icon={Check} size="sm" /></span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</span>

<style>
  .ds-menu-button {
    position: relative;
    display: inline-flex;
  }
</style>
