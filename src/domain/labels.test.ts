import { describe, expect, it } from 'vitest';
import {
  CARD_STATUSES,
  CARD_STATUS_LABELS,
  CARD_TYPES,
  CARD_TYPE_LABELS,
  CARD_TYPE_TONE,
  PRIORITY_TONE,
  priorityLabel,
} from './index';

describe('domain labels', () => {
  it('ordena las columnas: Sin empezar, En curso, En pausa, Finalizado', () => {
    expect(CARD_STATUSES.map((s) => CARD_STATUS_LABELS[s])).toEqual([
      'Sin empezar',
      'En curso',
      'En pausa',
      'Finalizado',
    ]);
  });

  it('tiene etiquetas en español para los tipos', () => {
    expect(CARD_TYPES.map((t) => CARD_TYPE_LABELS[t])).toEqual(['Novedad', 'Mejora', 'Arreglo', 'Técnico']);
  });

  it('etiqueta las prioridades, incluida la ausencia de prioridad', () => {
    expect(priorityLabel('alta')).toBe('Alta');
    expect(priorityLabel('media')).toBe('Media');
    expect(priorityLabel('baja')).toBe('Baja');
    expect(priorityLabel(null)).toBe('Sin prioridad');
  });

  it('asigna los tonos de D-016', () => {
    expect(CARD_TYPE_TONE).toEqual({
      novedad: 'feature',
      mejora: 'improvement',
      arreglo: 'bugfix',
      tecnico: 'technical',
    });
    expect(PRIORITY_TONE).toEqual({ alta: 'danger', media: 'warning', baja: 'neutral' });
  });
});
