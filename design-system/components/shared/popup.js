/*
 * Listas desplegables (Select, MenuButton) — design-system/components/shared/popup.js
 *
 * La lista se abre en la top layer (atributo popover="manual") para que no
 * la recorte ningún contenedor con overflow, tampoco un Dialog modal. Se
 * coloca con position: fixed bajo el control, o encima si abajo no cabe.
 * En entornos sin Popover API (p. ej. jsdom) se queda en su sitio del DOM.
 */

/** Separación entre el control y la lista, en píxeles (= --ds-spacing-1). */
function gapOf(popup) {
  const value = getComputedStyle(popup).getPropertyValue('--ds-spacing-1');
  return Number.parseFloat(value) || 0;
}

/**
 * Coloca `popup` junto a `anchor`.
 * @param {HTMLElement} anchor
 * @param {HTMLElement} popup
 * @param {{ align?: 'start' | 'end', matchWidth?: boolean }} [options]
 */
export function placePopup(anchor, popup, { align = 'start', matchWidth = false } = {}) {
  const rect = anchor.getBoundingClientRect();
  const gap = gapOf(popup);
  if (matchWidth) popup.style.minWidth = `${rect.width}px`;
  const height = popup.offsetHeight;
  const width = popup.offsetWidth;
  const below = window.innerHeight - rect.bottom - gap;
  const top = below >= height || rect.top < height ? rect.bottom + gap : rect.top - gap - height;
  const left = align === 'end' ? rect.right - width : rect.left;
  popup.style.top = `${Math.max(0, top)}px`;
  popup.style.left = `${Math.max(0, Math.min(left, window.innerWidth - width))}px`;
}

/**
 * Acción de Svelte para la lista: la abre en la top layer, la coloca y la
 * recoloca al desplazar o redimensionar mientras está abierta.
 * @param {HTMLElement} popup
 * @param {{ anchor: HTMLElement | undefined, align?: 'start' | 'end', matchWidth?: boolean }} params
 */
export function popup(popup, params) {
  let current = params;
  const supported = typeof popup.showPopover === 'function';
  const place = () => {
    if (supported && current.anchor) placePopup(current.anchor, popup, current);
  };
  if (supported) {
    popup.setAttribute('popover', 'manual');
    popup.showPopover();
  }
  place();
  window.addEventListener('scroll', place, true);
  window.addEventListener('resize', place);
  return {
    update(next) {
      current = next;
      place();
    },
    destroy() {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    },
  };
}
