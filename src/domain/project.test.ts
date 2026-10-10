import { describe, expect, it } from 'vitest';
import { createProject, editProject } from './index';

describe('createProject', () => {
  it('recorta nombre y descripción y fija fechas, id y archived', () => {
    const now = new Date('2026-10-10T10:00:00.000Z');
    expect(createProject({ name: ' Mi app ', description: ' Demo ' }, now, 'id-1')).toEqual({
      id: 'id-1',
      name: 'Mi app',
      description: 'Demo',
      createdAt: '2026-10-10T10:00:00.000Z',
      updatedAt: '2026-10-10T10:00:00.000Z',
      archived: false,
    });
  });

  it('sin descripción usa cadena vacía y genera un id único', () => {
    const a = createProject({ name: 'A' });
    const b = createProject({ name: 'A' });
    expect(a.description).toBe('');
    expect(a.id).not.toBe(b.id);
  });
});

describe('editProject', () => {
  it('recorta los nuevos valores, actualiza updatedAt y conserva id, createdAt y archived', () => {
    const created = createProject({ name: 'Mi app', description: 'Demo' }, new Date('2026-10-10T10:00:00.000Z'), 'id-1');
    const edited = editProject(
      created,
      { name: ' Mi app 2 ', description: ' Nueva ' },
      new Date('2026-10-10T11:00:00.000Z'),
    );
    expect(edited).toEqual({
      id: 'id-1',
      name: 'Mi app 2',
      description: 'Nueva',
      createdAt: '2026-10-10T10:00:00.000Z',
      updatedAt: '2026-10-10T11:00:00.000Z',
      archived: false,
    });
    expect(created.name).toBe('Mi app');
  });
});
