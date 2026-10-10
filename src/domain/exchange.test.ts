import { describe, expect, it } from 'vitest';
import {
  archiveCard,
  archiveProject,
  buildExport,
  copyImportedProject,
  createCard,
  createProject,
  EXPORT_FORMAT_VERSION,
  exportFileName,
  importFailureMessage,
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

describe('copyImportedProject ("Importar como copia", AC-032)', () => {
  it('ids nuevos para el proyecto y todas sus tarjetas, projectId remapeado y nombre "<original> (copia)"', () => {
    const { projects, cards } = sample();
    const project = projects[0]!;
    const own = cards.filter((c) => c.projectId === project.id);
    let n = 0;
    const result = copyImportedProject(project, own, () => `nuevo-${++n}`);

    expect(result.project).toEqual({ ...project, id: 'nuevo-1', name: 'Mi app (copia)' });
    expect(result.cards).toEqual(own.map((c, i) => ({ ...c, id: `nuevo-${i + 2}`, projectId: 'nuevo-1' })));
  });

  it('conserva el estado de archivado y no modifica los originales', () => {
    const archived = archiveProject(createProject({ name: 'Vieja' }, now, 'p-1'));
    const card = archiveCard(createCard({ projectId: 'p-1', title: 'T', status: 'en-pausa' }, now, 'c-1'));
    const before = structuredClone({ archived, card });
    const result = copyImportedProject(archived, [card]);

    expect(result.project.archived).toBe(true);
    expect(result.cards[0]!.archived).toBe(true);
    expect(result.project.id).not.toBe('p-1');
    expect(result.cards[0]!.id).not.toBe('c-1');
    expect(result.cards[0]!.projectId).toBe(result.project.id);
    expect({ archived, card }).toEqual(before);
  });
});

describe('parseImport: validación completa (WI-AC-033, AC-033)', () => {
  const full = () => buildExport(sample(), { kind: 'full' }, now);
  type Tamper = (file: ReturnType<typeof full>) => unknown;
  const withCard =
    (patch: Record<string, unknown>): Tamper =>
    (f) => ({ ...f, cards: f.cards.map((c, i) => (i === 1 ? { ...c, ...patch } : c)) });
  const withProject =
    (patch: Record<string, unknown>): Tamper =>
    (f) => ({ ...f, projects: f.projects.map((p, i) => (i === 0 ? { ...p, ...patch } : p)) });
  // JSON.stringify omite las claves con valor undefined: equivale a no tener el campo.
  const without = (key: string): Record<string, unknown> => ({ [key]: undefined });

  const invalid: [string, Tamper, string][] = [
    ['tarjeta sin título', withCard(without('title')), 'la tarjeta 2 no tiene título'],
    ['tarjeta con título vacío', withCard({ title: '   ' }), 'la tarjeta 2 no tiene título'],
    ['tarjeta con título > 120', withCard({ title: 'x'.repeat(121) }), 'la tarjeta 2 tiene un título de más de 120 caracteres'],
    ['tarjeta con estado inexistente', withCard({ status: 'bloqueada' }), 'la tarjeta 2 tiene un estado inexistente'],
    ['tarjeta con tipo inexistente', withCard({ type: 'epic' }), 'la tarjeta 2 tiene un tipo inexistente'],
    ['tarjeta con prioridad inexistente', withCard({ priority: 'urgente' }), 'la tarjeta 2 tiene una prioridad inexistente'],
    ['tarjeta sin el campo prioridad', withCard(without('priority')), 'la tarjeta 2 tiene una prioridad inexistente'],
    [
      'tarjeta de un proyecto que no está',
      withCard({ projectId: 'p-desconocido' }),
      'la tarjeta 2 pertenece a un proyecto que no está en el archivo',
    ],
    ['tarjeta sin id', withCard({ id: '' }), 'la tarjeta 2 sin identificador'],
    ['tarjeta con fecha no válida', withCard({ createdAt: 'ayer' }), 'la tarjeta 2 con una fecha de creación no válida'],
    ['tarjeta con archived no booleano', withCard({ archived: 'no' }), 'la tarjeta 2 con un estado de archivado no válido'],
    ['tarjeta sin descripción', withCard(without('description')), 'la tarjeta 2 con una descripción no válida'],
    ['proyecto sin nombre', withProject(without('name')), 'el proyecto 1 no tiene nombre'],
    ['proyecto con nombre solo espacios', withProject({ name: '  ' }), 'el proyecto 1 no tiene nombre'],
    ['proyecto con nombre > 80', withProject({ name: 'x'.repeat(81) }), 'el proyecto 1 tiene un nombre de más de 80 caracteres'],
    ['proyecto con fecha no válida', withProject({ updatedAt: 5 }), 'el proyecto 1 con una fecha de modificación no válida'],
    [
      'ids de proyecto repetidos',
      (f) => ({ ...f, projects: [...f.projects, f.projects[0]] }),
      'hay proyectos con el mismo identificador',
    ],
    ['ids de tarjeta repetidos', (f) => ({ ...f, cards: [...f.cards, f.cards[0]] }), 'hay tarjetas con el mismo identificador'],
  ];

  it.each(invalid)('%s → invalid-structure con detalle', (_, tamper, detail) => {
    expect(parseImport(JSON.stringify(tamper(full())))).toEqual({ ok: false, reason: 'invalid-structure', detail });
  });

  it('export de proyecto con 0 o 2 proyectos → invalid-structure', () => {
    const file = buildExport(sample(), { kind: 'project', projectId: 'p-active' }, now);
    const detail = 'un export de proyecto debe contener exactamente un proyecto';
    for (const projects of [[], [...file.projects, createProject({ name: 'Otra' }, now, 'p-x')]]) {
      expect(parseImport(JSON.stringify({ ...file, projects }))).toEqual({ ok: false, reason: 'invalid-structure', detail });
    }
  });

  it('acepta los valores límite válidos: 80 y 120 caracteres, todas las prioridades y null', () => {
    const file = full();
    const priorities = ['alta', 'media', 'baja', null] as const;
    const tampered = {
      ...file,
      projects: file.projects.map((p, i) => (i === 0 ? { ...p, name: 'n'.repeat(80) } : p)),
      cards: file.cards.map((c, i) => ({ ...c, title: 't'.repeat(120), priority: priorities[i % 4]! })),
    };
    expect(parseImport(JSON.stringify(tampered))).toEqual({ ok: true, data: tampered });
  });

  it('acepta un export completo vacío (sin proyectos ni tarjetas)', () => {
    const file = buildExport({ projects: [], cards: [] }, { kind: 'full' }, now);
    expect(parseImport(JSON.stringify(file))).toEqual({ ok: true, data: file });
  });
});

describe('importFailureMessage (AC-033)', () => {
  it('indica en español cuál de los motivos aplica', () => {
    expect(importFailureMessage('invalid-json')).toBe('El archivo no es un JSON válido.');
    expect(importFailureMessage('unknown-version')).toBe('El archivo tiene una versión de formato desconocida.');
    expect(importFailureMessage('invalid-structure', 'la tarjeta 2 no tiene título')).toBe(
      'La estructura del archivo no es válida: la tarjeta 2 no tiene título.',
    );
    expect(importFailureMessage('invalid-structure')).toBe('La estructura del archivo no es válida.');
  });
});
