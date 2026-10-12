/** Etiquetas en español y correspondencias de tono (D-016). Sin dependencias de UI. */
import type { CardStatus, CardType, Priority } from './types';

export const CARD_TYPES = ['novedad', 'mejora', 'arreglo', 'tecnico'] as const satisfies readonly CardType[];

/** Orden único de las columnas del tablero. */
export const CARD_STATUSES = [
  'sin-empezar',
  'en-curso',
  'en-pausa',
  'finalizado',
] as const satisfies readonly CardStatus[];

export const PRIORITIES = ['alta', 'media', 'baja'] as const satisfies readonly Exclude<Priority, null>[];

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  novedad: 'Novedad',
  mejora: 'Mejora',
  arreglo: 'Arreglo',
  tecnico: 'Técnico',
};

export const CARD_STATUS_LABELS: Record<CardStatus, string> = {
  'sin-empezar': 'Sin empezar',
  'en-curso': 'En curso',
  'en-pausa': 'En pausa',
  finalizado: 'Finalizado',
};

export const PRIORITY_LABELS: Record<Exclude<Priority, null>, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

export const NO_PRIORITY_LABEL = 'Sin prioridad';

export function priorityLabel(priority: Priority): string {
  return priority === null ? NO_PRIORITY_LABEL : PRIORITY_LABELS[priority];
}

/** Tono del Badge del sistema de diseño para cada tipo de tarjeta. */
export const CARD_TYPE_TONE = {
  novedad: 'feature',
  mejora: 'improvement',
  arreglo: 'bugfix',
  tecnico: 'technical',
} as const satisfies Record<CardType, string>;

/** `status` de la `Column` del sistema de diseño (y tokens `status.*`) para cada estado (D-023). */
export const CARD_STATUS_DS = {
  'sin-empezar': 'todo',
  'en-curso': 'doing',
  'en-pausa': 'paused',
  finalizado: 'done',
} as const satisfies Record<CardStatus, string>;

/** Tono del Badge para cada prioridad; `null` → sin Badge. */
export const PRIORITY_TONE = {
  alta: 'danger',
  media: 'warning',
  baja: 'neutral',
} as const satisfies Record<Exclude<Priority, null>, string>;
