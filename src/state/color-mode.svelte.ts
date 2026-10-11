/**
 * Modo de color de la interfaz (AC-042, D-017). Es una preferencia del
 * dispositivo, no un dato de proyecto: vive fuera de `AppStore`.
 *
 * - `auto`: sin atributo `data-theme`; los tokens siguen `prefers-color-scheme`.
 * - `light` / `dark`: `data-theme="light"` o `"dark"` en `<html>`.
 *
 * En este item no se persiste (eso es WI-AC-043).
 */
export type ColorMode = 'auto' | 'light' | 'dark';

export const COLOR_MODES: readonly ColorMode[] = ['auto', 'light', 'dark'];

export const COLOR_MODE_LABELS: Record<ColorMode, string> = {
  auto: 'Auto',
  light: 'Claro',
  dark: 'Oscuro',
};

export function isColorMode(value: unknown): value is ColorMode {
  return typeof value === 'string' && (COLOR_MODES as readonly string[]).includes(value);
}

/** Aplica el modo al elemento raíz (normalmente `<html>`). */
export function applyColorMode(root: HTMLElement, mode: ColorMode): void {
  if (mode === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
}

export class ColorModeStore {
  mode = $state<ColorMode>('auto');

  constructor(initial: ColorMode = 'auto') {
    this.mode = initial;
  }
}
