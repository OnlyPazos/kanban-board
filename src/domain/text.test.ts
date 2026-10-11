import { describe, expect, it } from 'vitest';
import { truncateToGraphemes } from './index';

/** Surrogate alto sin bajo detrás, o bajo sin alto delante (equivale a `!isWellFormed()`, ES2024). */
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

describe('truncateToGraphemes (D-020, AC-046)', () => {
  it('si cabe, devuelve el texto sin cambios', () => {
    expect(truncateToGraphemes('hola', 4)).toBe('hola');
    expect(truncateToGraphemes('hola', 10)).toBe('hola');
    expect(truncateToGraphemes('😀', 2)).toBe('😀');
  });

  it('texto ASCII: corta en la unidad exacta', () => {
    expect(truncateToGraphemes('abcdef', 3)).toBe('abc');
  });

  it('un grafema que no cabe se descarta entero (par surrogate)', () => {
    const result = truncateToGraphemes('ab😀', 3);
    expect(result).toBe('ab');
    expect(LONE_SURROGATE.test(result)).toBe(false);
  });

  it('una secuencia ZWJ que no cabe se descarta entera', () => {
    const family = '👨‍👩‍👧';
    expect(family).toHaveLength(8);
    for (let max = 1; max < 9; max++) {
      expect(truncateToGraphemes(`x${family}`, max)).toBe('x');
    }
    expect(truncateToGraphemes(`x${family}y`, 9)).toBe(`x${family}`);
  });

  it('un grafema con marcas combinantes que no cabe se descarta entero', () => {
    const g = 'a' + '́'.repeat(3);
    expect(truncateToGraphemes(`${g}b`, 3)).toBe('');
    expect(truncateToGraphemes(`${g}b`, 4)).toBe(g);
  });

  it('maxUnits 0 → cadena vacía', () => {
    expect(truncateToGraphemes('abc', 0)).toBe('');
    expect(truncateToGraphemes('😀', 0)).toBe('');
  });

  it('texto vacío → cadena vacía', () => {
    expect(truncateToGraphemes('', 0)).toBe('');
    expect(truncateToGraphemes('', 5)).toBe('');
  });

  it('el resultado nunca supera maxUnits ni deja surrogates aislados', () => {
    const text = 'e😀👨‍👩‍👧á z🇪🇸';
    for (let max = 0; max <= text.length; max++) {
      const result = truncateToGraphemes(text, max);
      expect(result.length).toBeLessThanOrEqual(max);
      expect(text.startsWith(result)).toBe(true);
      expect(LONE_SURROGATE.test(result)).toBe(false);
    }
  });
});
