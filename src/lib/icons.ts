/**
 * Iconos de Lucide para conceptos del dominio (sistema de diseño
 * 2026-10-12). Son componentes de UI, así que viven en la app y no en
 * `domain`. Se importan icono a icono (D-021).
 */
import ArrowDown from '@lucide/svelte/icons/arrow-down';
import ArrowUp from '@lucide/svelte/icons/arrow-up';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import CircleDashed from '@lucide/svelte/icons/circle-dashed';
import CircleDot from '@lucide/svelte/icons/circle-dot';
import CirclePause from '@lucide/svelte/icons/circle-pause';
import Equal from '@lucide/svelte/icons/equal';
import type { CardStatus, Priority } from '../domain';

/** Icono decorativo de la etiqueta de prioridad (D-026). */
export const PRIORITY_ICON = {
  alta: ArrowUp,
  media: Equal,
  baja: ArrowDown,
} satisfies Record<Exclude<Priority, null>, unknown>;

/** Icono decorativo de cada estado: los mismos que usa `Column` por dentro (D-023, D-029). */
export const STATUS_ICON = {
  'sin-empezar': CircleDashed,
  'en-curso': CircleDot,
  'en-pausa': CirclePause,
  finalizado: CircleCheck,
} satisfies Record<CardStatus, unknown>;
