import { describe, expect, it } from 'vitest';
import {
  CARD_STATUSES,
  CARD_STATUS_DS,
  CARD_STATUS_LABELS,
  CARD_TYPES,
  CARD_TYPE_LABELS,
  CARD_TYPE_TONE,
  PRIORITY_DS,
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

  it('asigna a cada estado el status de Column de D-023', () => {
    expect(CARD_STATUS_DS).toEqual({
      'sin-empezar': 'todo',
      'en-curso': 'doing',
      'en-pausa': 'paused',
      finalizado: 'done',
    });
  });

  it('asigna a cada prioridad la franja de Card de D-026', () => {
    expect(PRIORITY_DS).toEqual({ alta: 'high', media: 'medium', baja: 'low' });
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
