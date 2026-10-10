import { describe, expect, it } from 'vitest';
import {
  CARD_TITLE_MAX_LENGTH,
  createCard,
  editCard,
  InvalidCardTitleError,
  sortCards,
  touchProject,
  validateCardTitle,
} from './card';
import { createProject } from './project';
import type { Card, Priority } from './types';

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

  it.each(['', '   ', 'a'.repeat(121)])('rechaza el título %j', (title) => {
    expect(() => createCard({ projectId: 'p1', title, status: 'sin-empezar' })).toThrow(InvalidCardTitleError);
  });
});

describe('validateCardTitle', () => {
  it('acepta un título normal y uno de exactamente 120 caracteres', () => {
    expect(CARD_TITLE_MAX_LENGTH).toBe(120);
    expect(validateCardTitle('Login')).toBeNull();
    expect(validateCardTitle('a'.repeat(120))).toBeNull();
  });

  it('rechaza el título vacío o formado solo por espacios', () => {
    expect(validateCardTitle('')).toBe('El título es obligatorio.');
    expect(validateCardTitle('   ')).toBe('El título es obligatorio.');
    expect(validateCardTitle('\t\n ')).toBe('El título es obligatorio.');
  });

  it('rechaza más de 120 caracteres', () => {
    expect(validateCardTitle('a'.repeat(121))).toBe('El título no puede superar 120 caracteres.');
  });

  it('mide la longitud tras recortar los espacios exteriores', () => {
    expect(validateCardTitle(`  ${'a'.repeat(120)}  `)).toBeNull();
  });
});

describe('touchProject', () => {
  it('actualiza solo updatedAt', () => {
    const project = createProject({ name: 'Mi app' }, new Date('2026-01-01T00:00:00.000Z'));
    const now = new Date('2026-10-10T10:00:00.000Z');
    expect(touchProject(project, now)).toEqual({ ...project, updatedAt: now.toISOString() });
  });
});

describe('editCard', () => {
  const created = new Date('2026-10-10T10:00:00.000Z');
  const later = new Date('2026-10-11T12:30:00.000Z');
  const base = () => createCard({ projectId: 'p1', title: 'Login', status: 'sin-empezar' }, created, 'c1');

  it('aplica todos los campos editables, actualiza updatedAt y conserva createdAt, id, proyecto y archivado', () => {
    const edited = editCard(
      base(),
      { title: '  Login 2 ', type: 'arreglo', status: 'en-pausa', description: 'línea 1\nlínea 2', priority: 'alta' },
      later,
    );
    expect(edited).toEqual({
      id: 'c1',
      projectId: 'p1',
      title: 'Login 2',
      type: 'arreglo',
      status: 'en-pausa',
      description: 'línea 1\nlínea 2',
      priority: 'alta',
      createdAt: created.toISOString(),
      updatedAt: later.toISOString(),
      archived: false,
    });
  });

  it('permite quitar la prioridad', () => {
    const card = { ...base(), priority: 'media' as const };
    expect(editCard(card, { ...card, priority: null }, later).priority).toBeNull();
  });

  it('no modifica la tarjeta original', () => {
    const card = base();
    editCard(card, { ...card, title: 'Otro' }, later);
    expect(card.title).toBe('Login');
    expect(card.updatedAt).toBe(created.toISOString());
  });

  it.each(['', '   ', 'a'.repeat(121)])('rechaza el título %j y no altera el original', (title) => {
    const card = base();
    expect(() => editCard(card, { ...card, title }, later)).toThrow(InvalidCardTitleError);
    expect(card).toEqual(base());
  });
});

describe('sortCards', () => {
  const at = (minute: number) => new Date(Date.UTC(2026, 9, 10, 10, minute));
  const make = (title: string, priority: Priority, minute: number): Card => ({
    ...createCard({ projectId: 'p1', title, status: 'sin-empezar' }, at(minute), title),
    priority,
  });

  it('AC-014: T1 (Baja), T2 (sin prioridad), T3 (Alta), T4 (Alta) → T3, T4, T1, T2', () => {
    const cards = [make('T1', 'baja', 1), make('T2', null, 2), make('T3', 'alta', 3), make('T4', 'alta', 4)];
    expect(sortCards(cards).map((c) => c.title)).toEqual(['T3', 'T4', 'T1', 'T2']);
  });

  it('ordena alta, media, baja, sin prioridad y desempata por createdAt ascendente', () => {
    const cards = [
      make('sin-b', null, 6),
      make('baja', 'baja', 1),
      make('media-b', 'media', 5),
      make('sin-a', null, 0),
      make('alta', 'alta', 9),
      make('media-a', 'media', 2),
    ];
    expect(sortCards(cards).map((c) => c.title)).toEqual(['alta', 'media-a', 'media-b', 'baja', 'sin-a', 'sin-b']);
  });

  it('no depende del orden de entrada ni modifica el array recibido', () => {
    const cards = [make('T4', 'alta', 4), make('T2', null, 2), make('T3', 'alta', 3), make('T1', 'baja', 1)];
    const copy = [...cards];
    expect(sortCards(cards).map((c) => c.title)).toEqual(['T3', 'T4', 'T1', 'T2']);
    expect(cards).toEqual(copy);
  });
});
