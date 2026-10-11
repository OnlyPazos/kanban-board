import { afterEach, describe, expect, it } from 'vitest';
import {
  applyColorMode,
  COLOR_MODE_STORAGE_KEY,
  ColorModeStore,
  isColorMode,
  loadColorMode,
  saveColorMode,
} from './color-mode.svelte';

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

/** `Storage` cuyo acceso lanza siempre, como con el almacenamiento bloqueado. */
function blockedStorage(): Storage {
  const fail = () => {
    throw new DOMException('bloqueado', 'SecurityError');
  };
  return {
    length: 0,
    clear: fail,
    getItem: fail,
    key: fail,
    removeItem: fail,
    setItem: fail,
  };
}

describe('persistencia del modo de color (AC-043, D-017)', () => {
  afterEach(() => localStorage.clear());

  it('usa la clave "kanban-board:color-mode"', () => {
    expect(COLOR_MODE_STORAGE_KEY).toBe('kanban-board:color-mode');
  });

  it('sin preferencia guardada carga "auto"', () => {
    expect(loadColorMode()).toBe('auto');
  });

  it('"light" y "dark" se guardan y se vuelven a cargar', () => {
    saveColorMode('dark');
    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe('dark');
    expect(loadColorMode()).toBe('dark');
    saveColorMode('light');
    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe('light');
    expect(loadColorMode()).toBe('light');
  });

  it('"auto" elimina la clave', () => {
    saveColorMode('dark');
    saveColorMode('auto');
    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBeNull();
    expect(loadColorMode()).toBe('auto');
  });

  it('un valor desconocido se trata como "auto"', () => {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, 'auto');
    expect(loadColorMode()).toBe('auto');
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, 'sepia');
    expect(loadColorMode()).toBe('auto');
  });

  it('con el almacenamiento bloqueado no lanza: carga "auto" y guardar no hace nada', () => {
    const storage = blockedStorage();
    expect(loadColorMode(storage)).toBe('auto');
    expect(() => saveColorMode('dark', storage)).not.toThrow();
    expect(() => saveColorMode('auto', storage)).not.toThrow();
    expect(loadColorMode(undefined)).toBe('auto');
    expect(() => saveColorMode('dark', undefined)).not.toThrow();
  });
});
