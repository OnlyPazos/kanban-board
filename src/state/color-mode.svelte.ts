/**
 * Modo de color de la interfaz (AC-042, AC-043, D-017). Es una preferencia del
 * dispositivo, no un dato de proyecto: vive fuera de `AppStore`, no va en
 * IndexedDB ni en ningún export, y ninguna importación la lee ni la cambia.
 *
 * - `auto`: sin atributo `data-theme`; los tokens siguen `prefers-color-scheme`.
 * - `light` / `dark`: `data-theme="light"` o `"dark"` en `<html>`.
 *
 * Persistencia (WI-AC-043): `localStorage`, clave `COLOR_MODE_STORAGE_KEY`,
 * valor `light` o `dark`; con `auto` se elimina la clave. El script inline de
 * `index.html` lee la misma clave antes de montar la app (sin destello). Si
 * `localStorage` falla, el modo vive solo en memoria y no se muestra error.
 */
export type ColorMode = 'auto' | 'light' | 'dark';

export const COLOR_MODES: readonly ColorMode[] = ['auto', 'light', 'dark'];

export const COLOR_MODE_LABELS: Record<ColorMode, string> = {
  auto: 'Auto',
  light: 'Claro',
  dark: 'Oscuro',
};

/** Clave de `localStorage` (debe coincidir con el script inline de `index.html`). */
export const COLOR_MODE_STORAGE_KEY = 'kanban-board:color-mode';

export function isColorMode(value: unknown): value is ColorMode {
  return typeof value === 'string' && (COLOR_MODES as readonly string[]).includes(value);
}

/** Aplica el modo al elemento raíz (normalmente `<html>`). */
export function applyColorMode(root: HTMLElement, mode: ColorMode): void {
  if (mode === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
}

/** `localStorage` del navegador, o `undefined` si acceder a él lanza. */
function defaultStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/** Lee la preferencia guardada. Sin clave, valor desconocido o error → `auto`. */
export function loadColorMode(storage: Storage | undefined = defaultStorage()): ColorMode {
  try {
    const value = storage?.getItem(COLOR_MODE_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'auto';
  } catch {
    return 'auto';
  }
}

/** Guarda la preferencia (`auto` elimina la clave). Los errores se ignoran en silencio. */
export function saveColorMode(mode: ColorMode, storage: Storage | undefined = defaultStorage()): void {
  try {
    if (mode === 'auto') storage?.removeItem(COLOR_MODE_STORAGE_KEY);
    else storage?.setItem(COLOR_MODE_STORAGE_KEY, mode);
  } catch {
    // Almacenamiento bloqueado o lleno: el modo sigue en memoria esta sesión.
  }
}

export class ColorModeStore {
  mode = $state<ColorMode>('auto');

  constructor(initial: ColorMode = 'auto') {
    this.mode = initial;
  }
}
