import { describe, expect, it } from 'vitest';
import { formatCreatedDate } from './dates';

describe('formatCreatedDate', () => {
  it('formatea el 9 de octubre de 2026 como "Creada el 9 oct 2026"', () => {
    expect(formatCreatedDate(new Date(2026, 9, 9, 10, 30).toISOString())).toBe('Creada el 9 oct 2026');
  });

  it('usa la hora local: las 23:30 del 9 de octubre siguen siendo el día 9', () => {
    expect(formatCreatedDate(new Date(2026, 9, 9, 23, 30).toISOString())).toBe('Creada el 9 oct 2026');
  });

  it('otros meses salen del mismo formateador de Intl (la abreviatura depende de ICU)', () => {
    const date = new Date(2026, 8, 3);
    const expected = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
    expect(formatCreatedDate(date.toISOString())).toBe(`Creada el ${expected}`);
  });
});
