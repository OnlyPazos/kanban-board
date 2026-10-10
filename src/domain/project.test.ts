import { describe, expect, it } from 'vitest';
import {
  ArchivedProjectError,
  archiveProject,
  assertProjectEditable,
  createProject,
  editProject,
  InvalidProjectNameError,
  PROJECT_NAME_MAX_LENGTH,
  restoreProject,
  sortProjects,
  validateProjectName,
} from './index';

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

describe('validateProjectName', () => {
  it('acepta un nombre normal y uno de exactamente 80 caracteres', () => {
    expect(PROJECT_NAME_MAX_LENGTH).toBe(80);
    expect(validateProjectName('Mi app')).toBeNull();
    expect(validateProjectName('a'.repeat(80))).toBeNull();
  });

  it('rechaza el nombre vacío o formado solo por espacios', () => {
    expect(validateProjectName('')).toBe('El nombre es obligatorio.');
    expect(validateProjectName('   ')).toBe('El nombre es obligatorio.');
    expect(validateProjectName('\t\n ')).toBe('El nombre es obligatorio.');
  });

  it('rechaza más de 80 caracteres', () => {
    expect(validateProjectName('a'.repeat(81))).toBe('El nombre no puede superar 80 caracteres.');
  });

  it('mide la longitud tras recortar los espacios exteriores', () => {
    expect(validateProjectName(`  ${'a'.repeat(80)}  `)).toBeNull();
  });
});

describe('validación al crear y editar', () => {
  it('createProject lanza InvalidProjectNameError con un nombre no válido', () => {
    expect(() => createProject({ name: '  ' })).toThrow(InvalidProjectNameError);
    expect(() => createProject({ name: 'a'.repeat(81) })).toThrow(InvalidProjectNameError);
  });

  it('editProject lanza InvalidProjectNameError y no altera el original', () => {
    const created = createProject({ name: 'Mi app', description: 'Demo' });
    expect(() => editProject(created, { name: '', description: 'X' })).toThrow(InvalidProjectNameError);
    expect(() => editProject(created, { name: 'a'.repeat(81), description: 'X' })).toThrow(
      InvalidProjectNameError,
    );
    expect(created).toMatchObject({ name: 'Mi app', description: 'Demo' });
  });
});

describe('sortProjects', () => {
  it('ordena por updatedAt descendente sin mutar la entrada', () => {
    const a = createProject({ name: 'A' }, new Date('2026-10-10T10:00:00.000Z'));
    const b = createProject({ name: 'B' }, new Date('2026-10-10T11:00:00.000Z'));
    const c = { ...a, id: 'c', name: 'C', updatedAt: '2026-10-10T12:00:00.000Z' };
    const input = [a, b, c];
    expect(sortProjects(input).map((p) => p.name)).toEqual(['C', 'B', 'A']);
    expect(input.map((p) => p.name)).toEqual(['A', 'B', 'C']);
  });
});

describe('archiveProject / restoreProject', () => {
  it('archivar solo cambia archived a true y restaurar lo devuelve exactamente igual (AC-024, AC-025)', () => {
    const project = createProject({ name: 'Mi app', description: 'Demo' }, new Date('2026-01-01T00:00:00Z'));
    const archived = archiveProject(project);
    expect(archived).toEqual({ ...project, archived: true });
    expect(project.archived).toBe(false);
    expect(restoreProject(archived)).toEqual(project);
  });
});

describe('proyecto archivado de solo lectura (AC-026)', () => {
  it('assertProjectEditable lanza ArchivedProjectError solo con proyectos archivados', () => {
    const project = createProject({ name: 'Mi app' });
    expect(() => assertProjectEditable(project)).not.toThrow();
    expect(() => assertProjectEditable(archiveProject(project))).toThrow(ArchivedProjectError);
  });

  it('editProject rechaza editar un proyecto archivado y no altera el original', () => {
    const archived = archiveProject(createProject({ name: 'Mi app' }));
    const copy = { ...archived };
    expect(() => editProject(archived, { name: 'Otro', description: '' })).toThrow(ArchivedProjectError);
    expect(archived).toEqual(copy);
  });

  it('restaurar un proyecto archivado sigue permitido', () => {
    const archived = archiveProject(createProject({ name: 'Mi app' }));
    expect(restoreProject(archived).archived).toBe(false);
  });
});
