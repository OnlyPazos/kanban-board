import { describe, expect, it } from 'vitest';
import { createCard, createProject } from '../domain';
import { changesOf, createTabSync, parseSyncChange, type SyncChange } from './sync';

describe('changesOf (AC-038)', () => {
  const project = createProject({ name: 'Mi app' });
  const card = createCard({ projectId: project.id, title: 'A', status: 'sin-empezar' });

  it('indica qué entidades cambia cada escritura', () => {
    expect(changesOf('saveProject', [project])).toEqual([{ entity: 'project', id: project.id }]);
    expect(changesOf('saveCard', [card, project])).toEqual([
      { entity: 'card', id: card.id },
      { entity: 'project', id: project.id },
    ]);
    expect(changesOf('deleteCard', [card.id, project])).toEqual([
      { entity: 'card', id: card.id },
      { entity: 'project', id: project.id },
    ]);
    expect(changesOf('deleteProject', [project.id])).toEqual([{ entity: 'project', id: project.id }]);
    expect(changesOf('replaceAll', [[project], [card]])).toEqual([{ entity: 'all' }]);
    expect(changesOf('importProject', [project, [card]])).toEqual([
      { entity: 'project', id: project.id },
      { entity: 'projectCards', id: project.id },
    ]);
    expect(changesOf('saveTypeFilter', [project.id, ['arreglo']])).toEqual([{ entity: 'typeFilter', id: project.id }]);
  });
});

describe('parseSyncChange', () => {
  it('acepta solo mensajes { entity, id } válidos', () => {
    expect(parseSyncChange({ entity: 'card', id: 'c1' })).toEqual({ entity: 'card', id: 'c1' });
    expect(parseSyncChange({ entity: 'all' })).toEqual({ entity: 'all' });
    expect(parseSyncChange({ entity: 'card' })).toBeNull();
    expect(parseSyncChange({ entity: 'otra', id: 'x' })).toBeNull();
    expect(parseSyncChange('card')).toBeNull();
    expect(parseSyncChange(null)).toBeNull();
  });
});

describe('createTabSync', () => {
  it('lo publicado en una pestaña llega a las demás del mismo canal, no a sí misma', async () => {
    const name = `kanban-board-sync-${crypto.randomUUID()}`;
    const a = createTabSync(name);
    const b = createTabSync(name);
    const receivedA: SyncChange[] = [];
    const receivedB: SyncChange[] = [];
    a.subscribe((change) => receivedA.push(change));
    const done = new Promise<void>((resolve) => {
      b.subscribe((change) => {
        receivedB.push(change);
        if (receivedB.length === 2) resolve();
      });
    });
    try {
      a.publish([
        { entity: 'card', id: 'c1' },
        { entity: 'project', id: 'p1' },
      ]);
      await done;
      expect(receivedB).toEqual([
        { entity: 'card', id: 'c1' },
        { entity: 'project', id: 'p1' },
      ]);
      expect(receivedA).toEqual([]);
    } finally {
      a.close();
      b.close();
    }
  });

  it('tras cerrar, publicar no hace nada', () => {
    const sync = createTabSync(`kanban-board-sync-${crypto.randomUUID()}`);
    sync.close();
    expect(() => sync.publish([{ entity: 'all' }])).not.toThrow();
  });
});
