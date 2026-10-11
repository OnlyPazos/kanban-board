import { describe, expect, it } from 'vitest';
import { matchesTypeFilter, normalizeTypeFilter, toggleTypeFilter } from './filter';
import type { CardType } from './types';

describe('normalizeTypeFilter', () => {
  it('conserva solo tipos válidos, sin repetir y en el orden canónico', () => {
    expect(normalizeTypeFilter(['tecnico', 'arreglo', 'arreglo', 'otro', 3])).toEqual(['arreglo', 'tecnico']);
  });

  it('cualquier valor que no sea una lista equivale a no filtrar', () => {
    expect(normalizeTypeFilter(undefined)).toEqual([]);
    expect(normalizeTypeFilter('arreglo')).toEqual([]);
    expect(normalizeTypeFilter({ arreglo: true })).toEqual([]);
  });
});

describe('toggleTypeFilter', () => {
  it('añade y quita tipos manteniendo el orden canónico', () => {
    let selection: CardType[] = [];
    selection = toggleTypeFilter(selection, 'tecnico', true);
    selection = toggleTypeFilter(selection, 'arreglo', true);
    expect(selection).toEqual(['arreglo', 'tecnico']);
    selection = toggleTypeFilter(selection, 'tecnico', false);
    expect(selection).toEqual(['arreglo']);
    selection = toggleTypeFilter(selection, 'arreglo', false);
    expect(selection).toEqual([]);
  });
});

describe('matchesTypeFilter', () => {
  it('selección vacía → se ven todas las tarjetas (D-012)', () => {
    for (const type of ['novedad', 'mejora', 'arreglo', 'tecnico'] as const) {
      expect(matchesTypeFilter({ type }, [])).toBe(true);
    }
  });

  it('selección múltiple → solo los tipos seleccionados', () => {
    const selection: CardType[] = ['arreglo', 'tecnico'];
    expect(matchesTypeFilter({ type: 'arreglo' }, selection)).toBe(true);
    expect(matchesTypeFilter({ type: 'tecnico' }, selection)).toBe(true);
    expect(matchesTypeFilter({ type: 'novedad' }, selection)).toBe(false);
    expect(matchesTypeFilter({ type: 'mejora' }, selection)).toBe(false);
  });
});
