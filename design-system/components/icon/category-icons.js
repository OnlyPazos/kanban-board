/*
 * Iconos por defecto de las categorías de tarjeta (tag.*) — compartidos por
 * Badge y Chip para que una categoría tenga siempre el mismo icono.
 *   feature = Novedad, improvement = Mejora, bugfix = Arreglo, technical = Técnico
 * Se importan icono a icono para no cargar toda la librería en desarrollo.
 */
import Bug from '@lucide/svelte/icons/bug';
import Sparkles from '@lucide/svelte/icons/sparkles';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import Wrench from '@lucide/svelte/icons/wrench';

export const CATEGORY_ICONS = {
  feature: Sparkles,
  improvement: TrendingUp,
  bugfix: Bug,
  technical: Wrench,
};
