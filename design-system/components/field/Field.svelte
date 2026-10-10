<!--
  Field — design-system/components/field/Field.svelte

  Envoltorio accesible para un control de formulario: etiqueta, texto de
  ayuda y mensaje de error, con los id y atributos aria ya enlazados.
  Lo usan Input, Textarea y Select; también sirve para controles propios.

  Uso:
    <Field label="Título" error={err}>
      {#snippet control(attrs)}
        <input {...attrs} class="ds-control" />
      {/snippet}
    </Field>

  `attrs` contiene: id, aria-describedby, aria-invalid, required, disabled.
-->
<script lang="ts" module>
  export type FieldControlAttrs = {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': 'true' | undefined;
    required: boolean;
    disabled: boolean;
  };
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import '../shared/control.css';

  type Props = {
    /** Texto de la etiqueta (obligatorio, también si se oculta). */
    label: string;
    /** Texto de ayuda bajo el control. */
    hint?: string;
    /** Mensaje de error. Si existe, el control se marca como inválido. */
    error?: string;
    required?: boolean;
    disabled?: boolean;
    /** Oculta la etiqueta visualmente (sigue disponible para lectores de pantalla). */
    hideLabel?: boolean;
    /** id del control; por defecto se genera uno único. */
    id?: string;
    control: Snippet<[FieldControlAttrs]>;
  };

  let {
    label,
    hint,
    error,
    required = false,
    disabled = false,
    hideLabel = false,
    id,
    control,
  }: Props = $props();

  const uid = $props.id();
  const controlId = $derived(id ?? `${uid}-control`);
  const hintId = `${uid}-hint`;
  const errorId = `${uid}-error`;

  const attrs: FieldControlAttrs = $derived({
    id: controlId,
    'aria-describedby': [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined,
    'aria-invalid': error ? 'true' : undefined,
    required,
    disabled,
  });
</script>

<div class="ds-field" class:ds-field--disabled={disabled}>
  <label for={controlId} class="ds-field__label" class:ds-visually-hidden={hideLabel}>
    {label}{#if required}<span class="ds-field__required" aria-hidden="true"> *</span>{/if}
  </label>

  {@render control(attrs)}

  {#if hint}
    <p id={hintId} class="ds-field__hint">{hint}</p>
  {/if}
  {#if error}
    <p id={errorId} class="ds-field__error">{error}</p>
  {/if}
</div>
