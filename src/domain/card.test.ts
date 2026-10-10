import { describe, expect, it } from 'vitest';
import { createCard, InvalidCardTitleError, touchProject, validateNewCardTitle } from './card';
import { createProject } from './project';

describe('createCard', () => {
  it('crea la tarjeta con el estado de la columna, tipo novedad y sin prioridad', () => {
    const now = new Date('2026-10-10T10:00:00.000Z');
    const card = createCard({ projectId: 'p1', title: '  Login  ', status: 'en-curso' }, now, 'c1');
    expect(card).toEqual({
      id: 'c1',
      projectId: 'p1',
      title: 'Login',
      type: 'novedad',
      status: 'en-curso',
      description: '',
      priority: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      archived: false,
    });
  });

  it.each(['', '   '])('rechaza el título %j', (title) => {
    expect(validateNewCardTitle(title)).toBe('El título es obligatorio.');
    expect(() => createCard({ projectId: 'p1', title, status: 'sin-empezar' })).toThrow(InvalidCardTitleError);
  });
});

describe('touchProject', () => {
  it('actualiza solo updatedAt', () => {
    const project = createProject({ name: 'Mi app' }, new Date('2026-01-01T00:00:00.000Z'));
    const now = new Date('2026-10-10T10:00:00.000Z');
    expect(touchProject(project, now)).toEqual({ ...project, updatedAt: now.toISOString() });
  });
});
