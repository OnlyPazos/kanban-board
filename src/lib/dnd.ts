/**
 * Textos en español para los avisos de lector de pantalla de
 * `svelte-dnd-action` (arrastre con teclado, AC-017). La configuración es
 * global al documento, así que se aplica una sola vez.
 */
import { setAriaStrings } from 'svelte-dnd-action';

const INSTRUCTIONS = {
  space: 'Tabula hasta una tarjeta y pulsa Espacio para cogerla',
  enter: 'Tabula hasta una tarjeta y pulsa Intro para cogerla',
  space_or_enter: 'Tabula hasta una tarjeta y pulsa Espacio o Intro para cogerla',
} as const;

let applied = false;

export function applyDndAriaStrings(): void {
  if (applied) return;
  applied = true;
  setAriaStrings({
    dragStarted: ({ itemLabel, zoneLabel, canMoveBetweenZones }) =>
      `Has cogido la tarjeta ${itemLabel} de la columna ${zoneLabel}` +
      (canMoveBetweenZones ? '. Pulsa Tab para llevarla a otra columna y Escape para soltarla' : ''),
    movedToPosition: ({ itemLabel, zoneLabel, position }) =>
      `Tarjeta ${itemLabel} en la posición ${position} de la columna ${zoneLabel}`,
    movedToZoneEnd: ({ itemLabel, zoneLabel }) => `Tarjeta ${itemLabel} movida a la columna ${zoneLabel}`,
    movedToZoneStart: ({ itemLabel, zoneLabel }) => `Tarjeta ${itemLabel} movida a la columna ${zoneLabel}`,
    dropped: ({ itemLabel, zoneLabel }) => `Tarjeta ${itemLabel} soltada en la columna ${zoneLabel}`,
    zoneActiveInstruction: ({ keyboardDragTrigger }) => INSTRUCTIONS[keyboardDragTrigger],
    zoneDragDisabledInstruction: 'Esta columna no permite arrastrar tarjetas',
  });
}
