import { describe, expect, it, vi } from 'vitest';
import { createCard, createProject } from '../domain';
import { openKanbanDB } from './db';
import {
  createBrowserRepository,
  createIdbRepository,
  createMemoryRepository,
  observeWrites, publishWrites, typeFilterKey,
  WRITE_METHODS,
  type Repository,
} from './repository';
import type { SyncChange, TabSync } from './sync';

let counter = 0;
const freshName = () => `kanban-board-test-${++counter}-${crypto.randomUUID()}`;

describe('createIdbRepository', () => {
  it('crea los object stores projects, cards (índice projectId) y prefs', async () => {
    const db = await openKanbanDB(freshName());
    expect([...db.objectStoreNames].sort()).toEqual(['cards', 'prefs', 'projects']);
    const tx = db.transaction('cards');
    expect([...tx.store.indexNames]).toEqual(['projectId']);
    expect(tx.store.keyPath).toBe('id');
    db.close();
  });

  it('sin datos devuelve una lista vacía', async () => {
    const repo = createIdbRepository(freshName());
    expect(await repo.listProjects()).toEqual([]);
  });

  it('un proyecto guardado se lee desde otra instancia (simula recargar)', async () => {
    const name = freshName();
    const project = createProject({ name: 'Mi app', description: 'Demo' });
    await createIdbRepository(name).saveProject(project);

    const reloaded = await createIdbRepository(name).listProjects();
    expect(reloaded).toEqual([project]);
  });

  it('guardar de nuevo el mismo id sobrescribe en vez de duplicar', async () => {
    const repo = createIdbRepository(freshName());
    const project = createProject({ name: 'Mi app' });
    await repo.saveProject(project);
    await repo.saveProject({ ...project, description: 'Cambiada' });
    expect(await repo.listProjects()).toEqual([{ ...project, description: 'Cambiada' }]);
  });
});

describe('createIdbRepository · tarjetas', () => {
  it('saveCard guarda la tarjeta y el proyecto actualizado; se leen desde otra instancia', async () => {
    const name = freshName();
    const project = createProject({ name: 'Mi app' });
    const repo = createIdbRepository(name);
    await repo.saveProject(project);

    const card = createCard({ projectId: project.id, title: 'Login', status: 'en-curso' });
    const touched = { ...project, updatedAt: '2999-01-01T00:00:00.000Z' };
    await repo.saveCard(card, touched);

    const reloaded = createIdbRepository(name);
    expect(await reloaded.listCards()).toEqual([card]);
    expect(await reloaded.listProjects()).toEqual([touched]);
  });
});

describe('createIdbRepository · borrado definitivo', () => {
  it('deleteCard elimina el registro y guarda el proyecto; no reaparece desde otra instancia', async () => {
    const name = freshName();
    const project = createProject({ name: 'Mi app' });
    const repo = createIdbRepository(name);
    const keep = createCard({ projectId: project.id, title: 'Queda', status: 'en-curso' });
    const gone = { ...createCard({ projectId: project.id, title: 'Se va', status: 'en-curso' }), archived: true };
    await repo.saveCard(keep, project);
    await repo.saveCard(gone, project);

    const touched = { ...project, updatedAt: '2999-01-01T00:00:00.000Z' };
    await repo.deleteCard(gone.id, touched);

    const reloaded = createIdbRepository(name);
    expect(await reloaded.listCards()).toEqual([keep]);
    expect(await reloaded.listProjects()).toEqual([touched]);
  });
});

describe('createIdbRepository · borrado definitivo de proyecto', () => {
  it('deleteProject elimina el proyecto, todas sus tarjetas y su filtro; no toca otros proyectos', async () => {
    const name = freshName();
    const repo = createIdbRepository(name);
    const gone = { ...createProject({ name: 'Se va' }), archived: true };
    const keep = createProject({ name: 'Queda' });
    const goneActive = createCard({ projectId: gone.id, title: 'Activa', status: 'en-curso' });
    const goneArchived = { ...createCard({ projectId: gone.id, title: 'Archivada', status: 'finalizado' }), archived: true };
    const kept = createCard({ projectId: keep.id, title: 'Otra', status: 'sin-empezar' });
    await repo.saveCard(goneActive, gone);
    await repo.saveCard(goneArchived, gone);
    await repo.saveCard(kept, keep);
    await repo.saveTypeFilter(gone.id, ['arreglo']);
    await repo.saveTypeFilter(keep.id, ['tecnico']);

    await repo.deleteProject(gone.id);

    const reloaded = createIdbRepository(name);
    expect(await reloaded.listProjects()).toEqual([keep]);
    expect(await reloaded.listCards()).toEqual([kept]);
    expect(await reloaded.listTypeFilters()).toEqual({ [keep.id]: ['tecnico'] });
  });
});

describe('createIdbRepository · filtro por tipo', () => {
  it('guarda el filtro por proyecto en prefs (clave filter:<projectId>) y se lee desde otra instancia', async () => {
    const name = freshName();
    const repo = createIdbRepository(name);
    expect(await repo.listTypeFilters()).toEqual({});

    await repo.saveTypeFilter('proyecto-a', ['arreglo', 'tecnico']);
    await repo.saveTypeFilter('proyecto-b', []);

    const reloaded = createIdbRepository(name);
    expect(await reloaded.listTypeFilters()).toEqual({ 'proyecto-a': ['arreglo', 'tecnico'], 'proyecto-b': [] });

    const db = await openKanbanDB(name);
    expect(await db.get('prefs', typeFilterKey('proyecto-a'))).toEqual(['arreglo', 'tecnico']);
    expect(typeFilterKey('proyecto-a')).toBe('filter:proyecto-a');
    db.close();
  });

  it('ignora valores guardados no válidos', async () => {
    const name = freshName();
    const db = await openKanbanDB(name);
    await db.put('prefs', ['arreglo', 'desconocido'], 'filter:x');
    await db.put('prefs', 'basura', 'filter:y');
    await db.put('prefs', ['arreglo'], 'otra-pref');
    db.close();
    expect(await createIdbRepository(name).listTypeFilters()).toEqual({ x: ['arreglo'], y: [] });
  });
});

describe('replaceAll (import completo, AC-030)', () => {
  it('vacía proyectos y tarjetas y escribe los nuevos tal cual, sin tocar las preferencias', async () => {
    const name = freshName();
    const repo = createIdbRepository(name);
    const old = createProject({ name: 'Vieja' });
    await repo.saveProject(old);
    await repo.saveCard(createCard({ projectId: old.id, title: 'Vieja tarjeta', status: 'en-curso' }), old);
    await repo.saveTypeFilter(old.id, ['mejora']);

    const imported = { ...createProject({ name: 'Importada' }), archived: true };
    const card = { ...createCard({ projectId: imported.id, title: 'T', status: 'finalizado' }), archived: true };
    await repo.replaceAll([imported], [card]);

    const reloaded = createIdbRepository(name);
    expect(await reloaded.listProjects()).toEqual([imported]);
    expect(await reloaded.listCards()).toEqual([card]);
    expect(await reloaded.listTypeFilters()).toEqual({ [old.id]: ['mejora'] });
  });

  it('si la escritura falla, la transacción se revierte y no cambia nada', async () => {
    const name = freshName();
    const repo = createIdbRepository(name);
    const old = createProject({ name: 'Vieja' });
    await repo.saveProject(old);
    // Un proyecto sin `id` (keyPath) hace fallar el put → se aborta la transacción.
    const broken = { ...createProject({ name: 'Rota' }), id: undefined } as unknown as typeof old;
    await expect(repo.replaceAll([broken], [])).rejects.toThrow();
    expect(await createIdbRepository(name).listProjects()).toEqual([old]);
  });
});

describe('importProject (import de proyecto, AC-031, AC-032)', () => {
  const byId = <T extends { id: string }>(xs: T[]) => [...xs].sort((a, b) => a.id.localeCompare(b.id));

  it('id nuevo: añade el proyecto con sus tarjetas y no toca el resto', async () => {
    const name = freshName();
    const repo = createIdbRepository(name);
    const other = createProject({ name: 'Otra' });
    const otherCard = createCard({ projectId: other.id, title: 'O', status: 'en-curso' });
    await repo.saveProject(other);
    await repo.saveCard(otherCard, other);

    const imported = { ...createProject({ name: 'Importada' }), archived: true };
    const card = { ...createCard({ projectId: imported.id, title: 'T', status: 'finalizado' }), archived: true };
    await repo.importProject(imported, [card]);

    const reloaded = createIdbRepository(name);
    expect(byId(await reloaded.listProjects())).toEqual(byId([other, imported]));
    expect(byId(await reloaded.listCards())).toEqual(byId([otherCard, card]));
  });

  it('id existente: sustituye el proyecto y todas sus tarjetas (también archivadas) por los del archivo', async () => {
    const name = freshName();
    const repo = createIdbRepository(name);
    const existing = { ...createProject({ name: 'Mía' }), archived: true };
    await repo.saveProject(existing);
    await repo.saveCard(createCard({ projectId: existing.id, title: 'Vieja', status: 'en-curso' }), existing);
    await repo.saveCard(
      { ...createCard({ projectId: existing.id, title: 'Vieja archivada', status: 'en-pausa' }), archived: true },
      existing,
    );

    const replacement = { ...existing, name: 'Del archivo', archived: false };
    const card = createCard({ projectId: existing.id, title: 'Nueva', status: 'sin-empezar' });
    await repo.importProject(replacement, [card]);

    const reloaded = createIdbRepository(name);
    expect(await reloaded.listProjects()).toEqual([replacement]);
    expect(await reloaded.listCards()).toEqual([card]);
  });

  it('si la escritura falla, la transacción se revierte y no cambia nada', async () => {
    const name = freshName();
    const repo = createIdbRepository(name);
    const existing = createProject({ name: 'Mía' });
    const oldCard = createCard({ projectId: existing.id, title: 'Vieja', status: 'en-curso' });
    await repo.saveProject(existing);
    await repo.saveCard(oldCard, existing);

    // Una tarjeta sin `id` (keyPath) hace fallar el put → se aborta la transacción.
    const broken = {
      ...createCard({ projectId: existing.id, title: 'Rota', status: 'en-curso' }),
      id: undefined,
    } as unknown as typeof oldCard;
    await expect(repo.importProject({ ...existing, name: 'Otro' }, [broken])).rejects.toThrow();

    const reloaded = createIdbRepository(name);
    expect(await reloaded.listProjects()).toEqual([existing]);
    expect(await reloaded.listCards()).toEqual([oldCard]);
  });
});

describe('observeWrites (AC-035)', () => {
  function failingRepository(error: unknown): Repository {
    const repo = createIdbRepository(freshName());
    return {
      ...repo,
      saveProject: async () => {
        throw error;
      },
    };
  }

  it('avisa del fallo de escritura y propaga el error a quien llamó', async () => {
    const quota = new DOMException('Cuota excedida', 'QuotaExceededError');
    const onWriteError = vi.fn();
    const onWriteSuccess = vi.fn();
    const repo = observeWrites(failingRepository(quota), { onWriteError, onWriteSuccess });

    await expect(repo.saveProject(createProject({ name: 'Mi app' }))).rejects.toBe(quota);
    expect(onWriteError).toHaveBeenCalledWith(quota);
    expect(onWriteSuccess).not.toHaveBeenCalled();
  });

  it('avisa de cada escritura confirmada y no toca las lecturas', async () => {
    const onWriteError = vi.fn();
    const onWriteSuccess = vi.fn();
    const repo = observeWrites(createIdbRepository(freshName()), { onWriteError, onWriteSuccess });
    const project = createProject({ name: 'Mi app' });

    await repo.saveProject(project);
    await repo.saveCard(createCard({ projectId: project.id, title: 'A', status: 'sin-empezar' }), project);
    await repo.saveTypeFilter(project.id, ['arreglo']);
    expect(onWriteSuccess).toHaveBeenCalledTimes(3);

    await repo.listProjects();
    await repo.listCards();
    await repo.listTypeFilters();
    expect(onWriteSuccess).toHaveBeenCalledTimes(3);
    expect(onWriteError).not.toHaveBeenCalled();
  });

  it('un fallo de transacción real (put de un valor no clonable) también se avisa', async () => {
    const onWriteError = vi.fn();
    const repo = observeWrites(createIdbRepository(freshName()), { onWriteError, onWriteSuccess: vi.fn() });
    const project = { ...createProject({ name: 'Mi app' }), description: (() => {}) as unknown as string };

    await expect(repo.saveProject(project)).rejects.toThrow();
    expect(onWriteError).toHaveBeenCalledTimes(1);
  });

  it('envuelve todas las escrituras del repositorio', () => {
    expect([...WRITE_METHODS].sort()).toEqual(
      ['deleteCard', 'deleteProject', 'importProject', 'replaceAll', 'saveCard', 'saveProject', 'saveTypeFilter'].sort(),
    );
  });
});

describe('createMemoryRepository (AC-037)', () => {
  it('guarda y lee proyectos, tarjetas y filtros con la misma interfaz que IndexedDB', async () => {
    const repo = createMemoryRepository();
    const project = createProject({ name: 'Mi app' });
    const other = createProject({ name: 'Otra' });
    const card = createCard({ projectId: project.id, title: 'A', status: 'sin-empezar' });
    await repo.saveProject(project);
    await repo.saveProject(other);
    await repo.saveCard(card, project);
    await repo.saveTypeFilter(project.id, ['arreglo']);
    await repo.saveProject({ ...project, description: 'Cambiada' });

    expect(await repo.listProjects()).toEqual([{ ...project, description: 'Cambiada' }, other]);
    expect(await repo.listCards()).toEqual([card]);
    expect(await repo.listTypeFilters()).toEqual({ [project.id]: ['arreglo'] });

    await repo.deleteCard(card.id, project);
    expect(await repo.listCards()).toEqual([]);

    await repo.saveCard(card, project);
    await repo.deleteProject(project.id);
    expect(await repo.listProjects()).toEqual([other]);
    expect(await repo.listCards()).toEqual([]);
    expect(await repo.listTypeFilters()).toEqual({});
  });

  it('replaceAll e importProject se comportan como en IndexedDB', async () => {
    const repo = createMemoryRepository();
    const old = createProject({ name: 'Vieja' });
    await repo.saveProject(old);
    await repo.saveTypeFilter(old.id, ['tecnico']);
    const project = createProject({ name: 'Mi app' });
    const card = createCard({ projectId: project.id, title: 'A', status: 'en-curso' });
    await repo.replaceAll([project], [card]);
    expect(await repo.listProjects()).toEqual([project]);
    expect(await repo.listCards()).toEqual([card]);
    expect(await repo.listTypeFilters()).toEqual({ [old.id]: ['tecnico'] });

    const replacement = createCard({ projectId: project.id, title: 'B', status: 'finalizado' });
    await repo.importProject({ ...project, name: 'Importada' }, [replacement]);
    expect(await repo.listProjects()).toEqual([{ ...project, name: 'Importada' }]);
    expect(await repo.listCards()).toEqual([replacement]);
  });

  it('devuelve copias: mutar lo leído no cambia lo guardado', async () => {
    const repo = createMemoryRepository();
    const project = createProject({ name: 'Mi app' });
    await repo.saveProject(project);
    const [read] = await repo.listProjects();
    read.name = 'Mutada';
    expect(await repo.listProjects()).toEqual([project]);
  });
});

describe('createBrowserRepository (AC-037)', () => {
  it('con IndexedDB disponible guarda en IndexedDB y no avisa', async () => {
    const name = freshName();
    const onUnavailable = vi.fn();
    const project = createProject({ name: 'Mi app' });
    await createBrowserRepository({ dbName: name, onUnavailable }).saveProject(project);

    expect(await createIdbRepository(name).listProjects()).toEqual([project]);
    expect(onUnavailable).not.toHaveBeenCalled();
  });

  it('sin indexedDB avisa una sola vez y sigue funcionando en memoria', async () => {
    vi.stubGlobal('indexedDB', undefined);
    try {
      const onUnavailable = vi.fn();
      const repo = createBrowserRepository({ dbName: freshName(), onUnavailable });
      const project = createProject({ name: 'Mi app' });
      const card = createCard({ projectId: project.id, title: 'A', status: 'sin-empezar' });

      expect(await repo.listProjects()).toEqual([]);
      await repo.saveProject(project);
      await repo.saveCard(card, project);
      expect(await repo.listProjects()).toEqual([project]);
      expect(await repo.listCards()).toEqual([card]);
      expect(onUnavailable).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('si IndexedDB falla al abrirse, avisa y usa la memoria', async () => {
    const open = vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      throw new DOMException('Acceso denegado', 'SecurityError');
    });
    try {
      const onUnavailable = vi.fn();
      const repo = createBrowserRepository({ dbName: freshName(), onUnavailable });
      const project = createProject({ name: 'Mi app' });
      await repo.saveProject(project);
      expect(await repo.listProjects()).toEqual([project]);
      expect(onUnavailable).toHaveBeenCalledTimes(1);
      expect(onUnavailable.mock.calls[0][0]).toMatchObject({ name: 'SecurityError' });
    } finally {
      open.mockRestore();
    }
  });
});

describe('lecturas por entidad (AC-038)', () => {
  const cases: [string, () => Repository][] = [
    ['IndexedDB', () => createIdbRepository(freshName())],
    ['memoria', () => createMemoryRepository()],
  ];
  it.each(cases)('%s: getProject, getCard, listProjectCards y getTypeFilter releen lo guardado', async (_, make) => {
    const repo = make();
    const project = createProject({ name: 'Mi app' });
    const other = createProject({ name: 'Otra' });
    const card = createCard({ projectId: project.id, title: 'A', status: 'sin-empezar' });
    const otherCard = createCard({ projectId: other.id, title: 'B', status: 'sin-empezar' });
    await repo.saveCard(card, project);
    await repo.saveCard(otherCard, other);
    await repo.saveTypeFilter(project.id, ['arreglo']);

    expect(await repo.getProject(project.id)).toEqual(project);
    expect(await repo.getProject('no-existe')).toBeUndefined();
    expect(await repo.getCard(card.id)).toEqual(card);
    expect(await repo.getCard('no-existe')).toBeUndefined();
    expect(await repo.listProjectCards(project.id)).toEqual([card]);
    expect(await repo.getTypeFilter(project.id)).toEqual(['arreglo']);
    expect(await repo.getTypeFilter(other.id)).toBeUndefined();
  });
});

describe('publishWrites (AC-038)', () => {
  const fakeSync = (): TabSync & { published: SyncChange[] } => {
    const published: SyncChange[] = [];
    return { published, publish: (changes) => published.push(...changes), subscribe: () => () => {}, close: vi.fn() };
  };

  it('publica las entidades cambiadas solo tras una escritura confirmada', async () => {
    const sync = fakeSync();
    const project = createProject({ name: 'Mi app' });
    const card = createCard({ projectId: project.id, title: 'A', status: 'sin-empezar' });
    const repo = publishWrites(createMemoryRepository(), sync);
    await repo.saveCard(card, project);
    expect(sync.published).toEqual([
      { entity: 'card', id: card.id },
      { entity: 'project', id: project.id },
    ]);

    const failing = publishWrites(
      {
        ...createMemoryRepository(),
        saveProject: async () => {
          throw new DOMException('Cuota excedida', 'QuotaExceededError');
        },
      },
      sync,
    );
    await expect(failing.saveProject(project)).rejects.toThrow();
    expect(sync.published).toHaveLength(2);
  });

  it('createBrowserRepository con IndexedDB publica cada escritura', async () => {
    const sync = fakeSync();
    const project = createProject({ name: 'Mi app' });
    const repo = createBrowserRepository({ dbName: freshName(), onUnavailable: vi.fn(), sync });
    await repo.saveProject(project);
    expect(sync.published).toEqual([{ entity: 'project', id: project.id }]);
    expect(sync.close).not.toHaveBeenCalled();
  });

  it('createBrowserRepository sin IndexedDB cierra el canal y no publica (datos solo de esta pestaña)', async () => {
    vi.stubGlobal('indexedDB', undefined);
    try {
      const sync = fakeSync();
      const repo = createBrowserRepository({ dbName: freshName(), onUnavailable: vi.fn(), sync });
      await repo.saveProject(createProject({ name: 'Mi app' }));
      expect(sync.close).toHaveBeenCalledTimes(1);
      expect(sync.published).toEqual([]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
