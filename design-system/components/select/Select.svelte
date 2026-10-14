<!--
  Select — design-system/components/select/Select.svelte

  Selector con lista propia (patrón ARIA "select-only combobox"): un botón
  con role="combobox" que muestra la opción elegida y abre una lista
  (role="listbox") con el mismo aspecto que MenuButton. Sustituye al
  <select> nativo para que la lista siga los tokens en claro y oscuro.

  Uso:
    <Select label="Tipo" bind:value={type} options={[
      { value: 'novedad', label: 'Novedad' },
      { value: 'mejora', label: 'Mejora' },
    ]} />

  Props: label (obligatoria), options (obligatoria), value (bindable),
  placeholder (texto cuando no hay valor), hint, error, required, disabled,
  hideLabel, id, name (envía el valor en un <input type="hidden">) y
  onchange (value) => void.

  Teclado (cerrado): ↓ ↑ Intro Espacio abren la lista en la opción elegida;
  Inicio/Fin abren en la primera/última; teclear letras salta a la opción
  que empieza así. Abierto: ↓ ↑ Inicio Fin mueven, Intro/Espacio eligen y
  cierran, Tab elige y sigue, Escape cierra sin cambiar.
-->
<script lang="ts" module>
  export type SelectOption = { value: string; label: string; disabled?: boolean };
</script>

<script lang="ts">
  import { tick } from 'svelte';
  import Check from '@lucide/svelte/icons/check';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Field from '../field/Field.svelte';
  import Icon from '../icon/Icon.svelte';
  import { popup } from '../shared/popup.js';
  import '../shared/popup.css';

  type Props = {
    label: string;
    options: SelectOption[];
    value?: string;
    placeholder?: string;
    hint?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    hideLabel?: boolean;
    id?: string;
    name?: string;
    onchange?: (value: string) => void;
  };

  let {
    label,
    options,
    value = $bindable(''),
    placeholder,
    hint,
    error,
    required = false,
    disabled = false,
    hideLabel = false,
    id,
    name,
    onchange,
  }: Props = $props();

  const uid = $props.id();
  const listId = `${uid}-listbox`;
  const optionId = (index: number) => `${uid}-option-${index}`;

  let open = $state(false);
  let active = $state(-1);
  let trigger: HTMLButtonElement | undefined = $state();
  let list: HTMLElement | undefined = $state();

  const selectedIndex = $derived(options.findIndex((o) => o.value === value));
  const selected = $derived(selectedIndex >= 0 ? options[selectedIndex] : undefined);

  const enabled = (index: number) => index >= 0 && index < options.length && !options[index].disabled;

  /** Siguiente opción habilitada desde `from` en la dirección `step` (sin dar la vuelta). */
  function nextEnabled(from: number, step: 1 | -1): number {
    for (let i = from + step; i >= 0 && i < options.length; i += step) if (enabled(i)) return i;
    return enabled(from) ? from : -1;
  }

  const first = () => nextEnabled(-1, 1);
  const last = () => nextEnabled(options.length, -1);

  async function show(at: number) {
    if (disabled) return;
    open = true;
    active = enabled(at) ? at : first();
    await tick();
    list?.querySelector(`#${CSS.escape(optionId(active))}`)?.scrollIntoView({ block: 'nearest' });
  }

  function hide() {
    open = false;
    active = -1;
  }

  function choose(index: number) {
    if (!enabled(index)) return;
    const next = options[index].value;
    hide();
    if (next !== value) {
      value = next;
      onchange?.(next);
    }
  }

  async function move(to: number) {
    if (to < 0) return;
    active = to;
    await tick();
    list?.querySelector(`#${CSS.escape(optionId(to))}`)?.scrollIntoView({ block: 'nearest' });
  }

  /* Búsqueda al teclear: acumula letras durante un instante. */
  let typed = '';
  let typedTimer: ReturnType<typeof setTimeout> | undefined;
  function typeahead(key: string): number {
    clearTimeout(typedTimer);
    typed += key.toLocaleLowerCase();
    typedTimer = setTimeout(() => (typed = ''), 500);
    const start = open ? active : selectedIndex;
    const order = [...options.keys()].map((i) => (start + 1 + i) % options.length);
    const repeated = typed.split('').every((c) => c === typed[0]);
    const match = (i: number) =>
      enabled(i) && options[i].label.toLocaleLowerCase().startsWith(repeated ? typed[0] : typed);
    return order.find(match) ?? -1;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (disabled) return;
    const { key } = event;
    if (!open) {
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
        event.preventDefault();
        void show(selectedIndex >= 0 ? selectedIndex : first());
      } else if (key === 'Home' || key === 'End') {
        event.preventDefault();
        void show(key === 'Home' ? first() : last());
      } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const found = typeahead(key);
        if (found >= 0) void show(found);
      }
      return;
    }
    switch (key) {
      case 'ArrowDown':
        event.preventDefault();
        void move(nextEnabled(active, 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        void move(nextEnabled(active, -1));
        break;
      case 'Home':
        event.preventDefault();
        void move(first());
        break;
      case 'End':
        event.preventDefault();
        void move(last());
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        choose(active);
        break;
      case 'Escape':
        event.preventDefault();
        // Que el Escape no cierre también el Dialog que contiene al Select.
        event.stopPropagation();
        hide();
        break;
      case 'Tab':
        choose(active);
        break;
      default:
        if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const found = typeahead(key);
          if (found >= 0) void move(found);
        }
    }
  }

  function handleClick() {
    if (open) hide();
    else void show(selectedIndex >= 0 ? selectedIndex : first());
  }

  /* Cerrar al pulsar fuera del control y de la lista. */
  function handleWindowPointer(event: PointerEvent) {
    if (!open) return;
    const target = event.target as Node;
    if (trigger?.contains(target) || list?.contains(target)) return;
    hide();
  }
</script>

<svelte:window onpointerdown={handleWindowPointer} />

<Field {label} {hint} {error} {hideLabel} {required} {disabled} id={id ?? undefined}>
  {#snippet control(attrs)}
    <div class="ds-select">
      <button
        bind:this={trigger}
        type="button"
        role="combobox"
        id={attrs.id}
        class="ds-control ds-select__control"
        class:ds-control--error={!!error}
        class:ds-select__control--open={open}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        aria-describedby={attrs['aria-describedby']}
        aria-invalid={attrs['aria-invalid']}
        aria-required={required ? 'true' : undefined}
        {disabled}
        onclick={handleClick}
        onkeydown={handleKeydown}
        onblur={() => open && hide()}
      >
        <span class="ds-select__value" class:ds-select__value--placeholder={!selected}>
          {selected?.label ?? placeholder ?? ''}
        </span>
        <span class="ds-select__chevron"><Icon icon={ChevronDown} /></span>
      </button>
      {#if name}<input type="hidden" {name} {value} />{/if}

      {#if open}
        <ul
          bind:this={list}
          id={listId}
          class="ds-popup"
          role="listbox"
          aria-label={label}
          use:popup={{ anchor: trigger, matchWidth: true }}
        >
          {#each options as option, index (option.value)}
            <!-- El foco se queda en el combobox (aria-activedescendant); el ratón elige con clic. -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <li
              id={optionId(index)}
              role="option"
              class="ds-popup__item"
              class:ds-popup__item--active={index === active}
              class:ds-popup__item--selected={index === selectedIndex}
              aria-selected={index === selectedIndex}
              aria-disabled={option.disabled ? 'true' : undefined}
              onpointerdown={(event) => event.preventDefault()}
              onpointerenter={() => enabled(index) && (active = index)}
              onclick={() => {
                choose(index);
                trigger?.focus();
              }}
            >
              <span class="ds-popup__label">{option.label}</span>
              <span class="ds-popup__mark"><Icon icon={Check} size="sm" /></span>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/snippet}
</Field>

<style>
  .ds-select {
    position: relative;
  }

  .ds-select__control {
    display: flex;
    align-items: center;
    gap: var(--ds-spacing-2);
    cursor: pointer;
    text-align: left;
  }

  .ds-select__control:disabled {
    cursor: not-allowed;
  }

  .ds-select__control--open {
    border-color: var(--ds-color-focus);
  }

  .ds-select__value {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ds-select__value--placeholder {
    color: var(--ds-color-text-secondary);
  }

  .ds-select__chevron {
    display: inline-flex;
    flex: none;
    color: var(--ds-color-text-secondary);
    transition: transform var(--ds-duration-fast) var(--ds-easing-standard);
  }

  .ds-select__control--open .ds-select__chevron {
    transform: rotate(180deg);
  }

  .ds-select__control:disabled .ds-select__chevron,
  .ds-select__control:disabled .ds-select__value--placeholder {
    color: var(--ds-color-text-disabled);
  }

  @media (prefers-reduced-motion: reduce) {
    .ds-select__chevron {
      transition: none;
    }
  }
</style>
