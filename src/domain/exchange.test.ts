import { describe, expect, it } from 'vitest';
import {
  archiveCard,
  archiveProject,
  buildExport,
  createCard,
  createProject,
  EXPORT_FORMAT_VERSION,
  exportFileName,
  parseImport,
} from './index';

const now = new Date('2026-10-10T10:00:00.000Z');

function sample() {
  const active = createProject({ name: 'Mi app', description: 'Demo' }, now, 'p-active');
  const archived = archiveProject(createProject({ name: 'Vieja' }, now, 'p-archived'));
  const other = createProject({ name: 'Otra' }, now, 'p-other');
  const cards = [
    createCard({ projectId: active.id, title: 'A', status: 'sin-empezar' }, now, 'c-1'),
    archiveCard(createCard({ projectId: active.id, title: 'B', status: 'en-curso' }, now, 'c-2')),
    createCard({ projectId: archived.id, title: 'C', status: 'finalizado' }, now, 'c-3'),
    archiveCard(createCard({ projectId: archived.id, title: 'D', status: 'en-pausa' }, now, 'c-4')),
    createCard({ projectId: other.id, title: 'E', status: 'en-pausa' }, now, 'c-5'),
  ];
  return { projects: [active, archived, other], cards };
}

describe('buildExport', () => {
  it('completo: versión de formato, kind "full", fecha y todos los proyectos y tarjetas, archivados incluidos (AC-028)', () => {
    const source = sample();
    const file = buildExport(source, { kind: 'full' }, now);
    expect(file).toEqual({
      formatVersion: EXPORT_FORMAT_VERSION,
      kind: 'full',
      exportedAt: '2026-10-10T10:00:00.000Z',
      projects: source.projects,
      cards: source.cards,
    });
    expect(file.formatVersion).toBe(1);
    expect(file.projects.some((p) => p.archived)).toBe(true);
    expect(file.cards.filter((c) => c.archived)).toHaveLength(2);
  });

  it('de proyecto: solo ese proyecto y todas sus tarjetas, activas y archivadas (AC-029)', () => {
    const source = sample();
    const file = buildExport(source, { kind: 'project', projectId: 'p-active' }, now);
    expect(file.formatVersion).toBe(EXPORT_FORMAT_VERSION);
    expect(file.kind).toBe('project');
    expect(file.exportedAt).toBe('2026-10-10T10:00:00.000Z');
    expect(file.projects).toEqual([source.projects[0]]);
    expect(file.cards.map((c) => c.id)).toEqual(['c-1', 'c-2']);
  });

  it('de proyecto archivado: también se exporta con sus tarjetas', () => {
    const file = buildExport(sample(), { kind: 'project', projectId: 'p-archived' }, now);
    expect(file.projects).toHaveLength(1);
    expect(file.projects[0]).toMatchObject({ id: 'p-archived', archived: true });
    expect(file.cards.map((c) => c.id)).toEqual(['c-3', 'c-4']);
  });

  it('de un proyecto inexistente lanza error', () => {
    expect(() => buildExport(sample(), { kind: 'project', projectId: 'nope' }, now)).toThrow(/no encontrado/);
  });

  it('solo copia los campos del modelo: nada ajeno (preferencias, etc.) viaja en el JSON', () => {
    const source = sample();
    const extra = { ...source.projects[0], colorMode: 'dark' } as (typeof source.projects)[number];
    const file = buildExport({ projects: [extra], cards: [] }, { kind: 'full' }, now);
    expect(Object.keys(file).sort()).toEqual(['cards', 'exportedAt', 'formatVersion', 'kind', 'projects']);
    expect(file.projects[0]).not.toHaveProperty('colorMode');
    expect(file.projects[0]).not.toBe(extra);
  });

  it('el resultado es serializable a JSON sin pérdidas', () => {
    const file = buildExport(sample(), { kind: 'full' }, now);
    expect(JSON.parse(JSON.stringify(file))).toEqual(file);
  });
});

describe('exportFileName', () => {
  const date = new Date(2026, 9, 5, 12, 0, 0);

  it('completo: kanban-export-<fecha>.json', () => {
    expect(exportFileName(date)).toBe('kanban-export-2026-10-05.json');
  });

  it('de proyecto: kanban-<nombre>-<fecha>.json, sin caracteres no válidos en archivos', () => {
    expect(exportFileName(date, 'Mi app')).toBe('kanban-Mi-app-2026-10-05.json');
    expect(exportFileName(date, ' a/b:c*? ')).toBe('kanban-a-b-c-2026-10-05.json');
    expect(exportFileName(date, '???')).toBe('kanban-proyecto-2026-10-05.json');
  });
});

describe('parseImport (validación mínima, WI-AC-030)', () => {
  it('un export completo vuelve idéntico: ids, fechas y flags tal cual (round-trip)', () => {
    const file = buildExport(sample(), { kind: 'full' }, now);
    const result = parseImport(JSON.stringify(file));
    expect(result).toEqual({ ok: true, data: file });
  });

  it('distingue el tipo de archivo por `kind`', () => {
    const file = buildExport(sample(), { kind: 'project', projectId: 'p-active' }, now);
    const result = parseImport(JSON.stringify(file));
    expect(result.ok && result.data.kind).toBe('project');
  });

  it('solo copia los campos del modelo', () => {
    const file = buildExport(sample(), { kind: 'full' }, now);
    const tampered = { ...file, extra: 1, projects: file.projects.map((p) => ({ ...p, colorMode: 'dark' })) };
    const result = parseImport(JSON.stringify(tampered));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.data).sort()).toEqual(['cards', 'exportedAt', 'formatVersion', 'kind', 'projects']);
      expect(result.data.projects[0]).not.toHaveProperty('colorMode');
    }
  });

  it('JSON no válido → invalid-json', () => {
    expect(parseImport('{no es json')).toMatchObject({ ok: false, reason: 'invalid-json' });
  });

  it('versión de formato desconocida → unknown-version', () => {
    const file = { ...buildExport(sample(), { kind: 'full' }, now), formatVersion: 99 };
    expect(parseImport(JSON.stringify(file))).toMatchObject({ ok: false, reason: 'unknown-version' });
  });

  it('estructura no válida → invalid-structure', () => {
    const file = buildExport(sample(), { kind: 'full' }, now);
    for (const bad of [[], 'x', { ...file, kind: 'otro' }, { ...file, projects: {} }, { ...file, cards: [1] }]) {
      expect(parseImport(JSON.stringify(bad))).toMatchObject({ ok: false, reason: 'invalid-structure' });
    }
  });
});
