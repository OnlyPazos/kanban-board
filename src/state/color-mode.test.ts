import { describe, expect, it } from 'vitest';
import { applyColorMode, ColorModeStore, isColorMode } from './color-mode.svelte';

describe('color-mode (AC-042, D-017)', () => {
  it('el store empieza en "auto"', () => {
    expect(new ColorModeStore().mode).toBe('auto');
  });

  it('"auto" quita data-theme; "light" y "dark" lo ponen', () => {
    const root = document.createElement('html');
    applyColorMode(root, 'dark');
    expect(root.getAttribute('data-theme')).toBe('dark');
    applyColorMode(root, 'light');
    expect(root.getAttribute('data-theme')).toBe('light');
    applyColorMode(root, 'auto');
    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  it('isColorMode solo acepta auto, light y dark', () => {
    expect(['auto', 'light', 'dark'].every(isColorMode)).toBe(true);
    expect(isColorMode('')).toBe(false);
    expect(isColorMode('system')).toBe(false);
    expect(isColorMode(undefined)).toBe(false);
  });
});
