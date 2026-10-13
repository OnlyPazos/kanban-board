/**
 * Iconos de Lucide para conceptos del dominio (sistema de diseño
 * 2026-10-12). Son componentes de UI, así que viven en la app y no en
 * `domain`. Se importan icono a icono (D-021).
 */
import ArrowDown from '@lucide/svelte/icons/arrow-down';
import ArrowUp from '@lucide/svelte/icons/arrow-up';
import Equal from '@lucide/svelte/icons/equal';
import type { Priority } from '../domain';

/** Icono decorativo de la etiqueta de prioridad (D-026). */
export const PRIORITY_ICON = {
  alta: ArrowUp,
  media: Equal,
  baja: ArrowDown,
} satisfies Record<Exclude<Priority, null>, unknown>;
