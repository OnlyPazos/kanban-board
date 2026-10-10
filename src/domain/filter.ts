/**
 * Filtro por tipo del tablero (AC-018, AC-019, AC-039; D-012): selección
 * múltiple. Un conjunto vacío equivale a no filtrar. Sin dependencias de UI.
 */
import { CARD_TYPES } from './labels';
import type { Card, CardType } from './types';

/**
 * Normaliza un valor leído (p. ej. de las preferencias guardadas) a una
 * selección válida: solo tipos conocidos, sin repetir y en el orden de
 * `CARD_TYPES`. Cualquier otra cosa equivale a no filtrar (`[]`).
 */
export function normalizeTypeFilter(value: unknown): CardType[] {
  if (!Array.isArray(value)) return [];
  return CARD_TYPES.filter((type) => value.includes(type));
}

/** Añade o quita `type` de la selección, conservando el orden de `CARD_TYPES`. */
export function toggleTypeFilter(selection: readonly CardType[], type: CardType, selected: boolean): CardType[] {
  return CARD_TYPES.filter((t) => (t === type ? selected : selection.includes(t)));
}

/** ¿Se ve la tarjeta con esta selección? Selección vacía → se ven todas. */
export function matchesTypeFilter(card: Pick<Card, 'type'>, selection: readonly CardType[]): boolean {
  return selection.length === 0 || selection.includes(card.type);
}
