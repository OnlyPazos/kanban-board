import { afterEach, describe, expect, it, vi } from 'vitest';
import { createIdbRepository } from '../persistence/repository';
import { AppStore } from './app-store.svelte';
import { ArchivedProjectError, createCard, createProject } from '../domain';

const freshName = () => `kanban-board-store-${crypto.randomUUID()}`;

describe('AppStore', () => {
  it('crear un proyecto lo persiste sin acción de guardar y sobrevive a una recarga', async () => {
    const dbName = freshName();
    const store = new AppStore(createIdbRepository(dbName));
    await store.hydrate();

    const created = await store.createProject({ name: '  Mi app ', description: 'Demo' });
    expect(store.projects).toEqual([created]);
    expect(created).toMatchObject({ name: 'Mi app', description: 'Demo', archived: false });
    expect(created.createdAt).toBe(created.updatedAt);

    const reloaded = new AppStore(createIdbRepository(dbName));
    await reloaded.hydrate();
    expect(reloaded.loaded).toBe(true);
    expect(reloaded.projects).toEqual([created]);
  });

  it('si el guardado falla, el proyecto no aparece como creado', async () => {
    const store = new AppStore({
      listProjects: async () => [],
      listTypeFilters: async () => ({}),
      saveTypeFilter: async () => {},
      listCards: async () => [],
      deleteCard: async () => {},
      deleteProject: async () => {},
      saveCard: async () => {},
      saveProject: async () => {
        throw new Error('QuotaExceededError');
      },
    });
    await store.hydrate();
    await expect(store.createProject({ name: 'Mi app' })).rejects.toThrow();
    expect(store.projects).toEqual([]);
  });

  it('editar un proyecto persiste nombre, descripción y updatedAt tras recargar', async () => {
    const dbName = freshName();
    const store = new AppStore(createIdbRepository(dbName));
    await store.hydrate();
    const created = await store.createProject({ name: 'Mi app', description: 'Demo' });

    const updated = await store.updateProject(created.id, { name: ' Mi app 2 ', description: 'Nueva' });
    expect(updated).toMatchObject({ id: created.id, name: 'Mi app 2', description: 'Nueva' });
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt >= created.updatedAt).toBe(true);
    expect(store.projects).toEqual([updated]);

    const reloaded = new AppStore(createIdbRepository(dbName));
    await reloaded.hydrate();
    expect(reloaded.projects).toEqual([updated]);
  });

  it('con dos proyectos del mismo nombre, editar uno no altera el otro', async () => {
    const dbName = freshName();
    const store = new AppStore(createIdbRepository(dbName));
    await store.hydrate();
    const a = await store.createProject({ name: 'Duplicado', description: 'A' });
    const b = await store.createProject({ name: 'Duplicado', description: 'B' });
    expect(a.id).not.toBe(b.id);
    expect(store.projects).toHaveLength(2);

    await store.updateProject(b.id, { name: 'Renombrado', description: 'B2' });

    const reloaded = new AppStore(createIdbRepository(dbName));
    await reloaded.hydrate();
    expect(reloaded.projects.find((p) => p.id === a.id)).toEqual(a);
    expect(reloaded.projects.find((p) => p.id === b.id)).toMatchObject({ name: 'Renombrado', description: 'B2' });
  });

  it('si el guardado de la edición falla, se conservan los valores anteriores', async () => {
    const created = createProject({ name: 'Mi app' });
    const store = new AppStore({
      listProjects: async () => [created],
      listTypeFilters: async () => ({}),
      saveTypeFilter: async () => {},
      listCards: async () => [],
      deleteCard: async () => {},
      deleteProject: async () => {},
      saveCard: async () => {},
      saveProject: async () => {
        throw new Error('QuotaExceededError');
      },
    });
    await store.hydrate();
    await expect(store.updateProject(created.id, { name: 'Otro', description: '' })).rejects.toThrow();
    expect(store.projects).toEqual([created]);
  });

  it('con un nombre no válido no crea ni modifica nada, tampoco en el almacenamiento', async () => {
    const dbName = freshName();
    const store = new AppStore(createIdbRepository(dbName));
    await store.hydrate();
    await expect(store.createProject({ name: '   ' })).rejects.toThrow('El nombre es obligatorio.');
    expect(store.projects).toEqual([]);

    const created = await store.createProject({ name: 'Mi app', description: 'Demo' });
    await expect(store.updateProject(created.id, { name: 'a'.repeat(81), description: 'X' })).rejects.toThrow(
      'El nombre no puede superar 80 caracteres.',
    );
    expect(store.projects).toEqual([created]);

    const reloaded = new AppStore(createIdbRepository(dbName));
    await reloaded.hydrate();
    expect(reloaded.projects).toEqual([created]);
  });

  it('crear una tarjeta la persiste con tipo novedad y sin prioridad, y actualiza el updatedAt del proyecto', async () => {
    const dbName = freshName();
    const store = new AppStore(createIdbRepository(dbName));
    await store.hydrate();
    const project = await store.createProject({ name: 'Mi app' });
    await new Promise((r) => setTimeout(r, 2));

    const card = await store.createCard(project.id, '  Login ', 'en-curso');
    expect(card).toMatchObject({
      projectId: project.id,
      title: 'Login',
      status: 'en-curso',
      type: 'novedad',
      priority: null,
      description: '',
      archived: false,
    });
    expect(store.cards).toEqual([card]);
    expect(store.projects[0].updatedAt).toBe(card.createdAt);
    expect(store.projects[0].updatedAt > project.updatedAt).toBe(true);

    const reloaded = new AppStore(createIdbRepository(dbName));
    await reloaded.hydrate();
    expect(reloaded.cards).toEqual([card]);
    expect(reloaded.projects[0].updatedAt).toBe(card.createdAt);
  });

  it('crear una tarjeta en un proyecto lo pone el primero de la lista', async () => {
    const store = new AppStore(createIdbRepository(freshName()));
    await store.hydrate();
    const a = await store.createProject({ name: 'A' });
    await new Promise((r) => setTimeout(r, 2));
    const b = await store.createProject({ name: 'B' });
    expect(store.projects.map((p) => p.id)).toEqual([b.id, a.id]);
    await new Promise((r) => setTimeout(r, 2));
    await store.createCard(a.id, 'T1', 'sin-empezar');
    expect(store.projects.map((p) => p.id)).toEqual([a.id, b.id]);
  });

  describe('orden por última modificación en vivo (AC-007)', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    /** Reloj fijo (solo `Date`; IndexedDB sigue usando timers reales). */
    function at(iso: string) {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(iso));
    }

    async function storeWithAB() {
      const store = new AppStore(createIdbRepository(freshName()));
      await store.hydrate();
      at('2026-10-10T10:00:00.000Z');
      const a = await store.createProject({ name: 'A' });
      at('2026-10-10T11:00:00.000Z');
      const b = await store.createProject({ name: 'B' });
      expect(store.projects.map((p) => p.name)).toEqual(['B', 'A']);
      return { store, a, b };
    }

    it('crear y editar una tarjeta de un proyecto lo pone el primero sin recargar', async () => {
      const { store, a, b } = await storeWithAB();
      at('2026-10-10T12:00:00.000Z');
      const card = await store.createCard(a.id, 'T1', 'sin-empezar');
      expect(store.projects.map((p) => p.name)).toEqual(['A', 'B']);
      at('2026-10-10T13:00:00.000Z');
      await store.createCard(b.id, 'T2', 'sin-empezar');
      expect(store.projects.map((p) => p.name)).toEqual(['B', 'A']);
      at('2026-10-10T14:00:00.000Z');
      await store.updateCard(card.id, { ...card, title: 'T1 bis' });
      expect(store.projects.map((p) => p.name)).toEqual(['A', 'B']);
    });

    it('editar el proyecto A lo pone el primero sin recargar', async () => {
      const { store, a } = await storeWithAB();
      at('2026-10-10T12:00:00.000Z');
      await store.updateProject(a.id, { name: 'A2', description: '' });
      expect(store.projects.map((p) => p.name)).toEqual(['A2', 'B']);
    });

    it('al hidratar se respeta el mismo orden', async () => {
      const dbName = freshName();
      const store = new AppStore(createIdbRepository(dbName));
      await store.hydrate();
      at('2026-10-10T10:00:00.000Z');
      const a = await store.createProject({ name: 'A' });
      at('2026-10-10T11:00:00.000Z');
      await store.createProject({ name: 'B' });
      at('2026-10-10T12:00:00.000Z');
      await store.createCard(a.id, 'T1', 'en-curso');

      const reloaded = new AppStore(createIdbRepository(dbName));
      await reloaded.hydrate();
      expect(reloaded.projects.map((p) => p.name)).toEqual(['A', 'B']);
    });
  });

  it('con título vacío o si el guardado falla, la tarjeta no se crea', async () => {
    const project = createProject({ name: 'Mi app' });
    const store = new AppStore({
      listProjects: async () => [project],
      saveProject: async () => {},
      listTypeFilters: async () => ({}),
      saveTypeFilter: async () => {},
      listCards: async () => [],
      deleteCard: async () => {},
      deleteProject: async () => {},
      saveCard: async () => {
        throw new Error('QuotaExceededError');
      },
    });
    await store.hydrate();
    await expect(store.createCard(project.id, '   ', 'en-curso')).rejects.toThrow('El título es obligatorio.');
    await expect(store.createCard(project.id, 'Login', 'en-curso')).rejects.toThrow('QuotaExceededError');
    expect(store.cards).toEqual([]);
    expect(store.projects).toEqual([project]);
  });

  it('editar una tarjeta persiste todos sus campos, conserva createdAt y actualiza el updatedAt de tarjeta y proyecto', async () => {
    const dbName = freshName();
    const store = new AppStore(createIdbRepository(dbName));
    await store.hydrate();
    const project = await store.createProject({ name: 'Mi app' });
    const card = await store.createCard(project.id, 'Login', 'sin-empezar');
    await new Promise((r) => setTimeout(r, 2));

    const updated = await store.updateCard(card.id, {
      title: ' Login 2 ',
      type: 'arreglo',
      status: 'en-pausa',
      description: 'línea 1\nlínea 2',
      priority: 'alta',
    });
    expect(updated).toMatchObject({
      id: card.id,
      projectId: project.id,
      title: 'Login 2',
      type: 'arreglo',
      status: 'en-pausa',
      description: 'línea 1\nlínea 2',
      priority: 'alta',
      createdAt: card.createdAt,
    });
    expect(updated.updatedAt > card.updatedAt).toBe(true);
    expect(store.cards).toEqual([updated]);
    expect(store.projects[0].updatedAt).toBe(updated.updatedAt);

    const reloaded = new AppStore(createIdbRepository(dbName));
    await reloaded.hydrate();
    expect(reloaded.cards).toEqual([updated]);
    expect(reloaded.projects[0].updatedAt).toBe(updated.updatedAt);
  });

  it('mover una tarjeta cambia solo su estado, lo persiste y actualiza el updatedAt del proyecto (AC-015)', async () => {
    const dbName = freshName();
    const store = new AppStore(createIdbRepository(dbName));
    await store.hydrate();
    const project = await store.createProject({ name: 'Mi app' });
    const card = await store.createCard(project.id, 'Login', 'sin-empezar');
    await new Promise((r) => setTimeout(r, 2));

    const moved = await store.moveCard(card.id, 'en-pausa');
    expect(moved).toEqual({ ...card, status: 'en-pausa', updatedAt: moved.updatedAt });
    expect(moved.updatedAt > card.updatedAt).toBe(true);
    expect(store.cards).toEqual([moved]);
    expect(store.projects[0].updatedAt).toBe(moved.updatedAt);

    const reloaded = new AppStore(createIdbRepository(dbName));
    await reloaded.hydrate();
    expect(reloaded.cards).toEqual([moved]);
  });

  it('mover una tarjeta a su misma columna no cambia ni guarda nada (AC-016)', async () => {
    const project = createProject({ name: 'Mi app' });
    const card = createCard({ projectId: project.id, title: 'Login', status: 'en-curso' });
    const saveCard = vi.fn(async () => {});
    const store = new AppStore({
      listProjects: async () => [project],
      saveProject: async () => {},
      listTypeFilters: async () => ({}),
      saveTypeFilter: async () => {},
      listCards: async () => [card],
      deleteCard: async () => {},
      deleteProject: async () => {},
      saveCard,
    });
    await store.hydrate();
    await expect(store.moveCard(card.id, 'en-curso')).resolves.toEqual(card);
    expect(saveCard).not.toHaveBeenCalled();
    expect(store.cards).toEqual([card]);
  });

  it('si el guardado del movimiento falla, la tarjeta sigue en su columna', async () => {
    const project = createProject({ name: 'Mi app' });
    const card = createCard({ projectId: project.id, title: 'Login', status: 'sin-empezar' });
    const store = new AppStore({
      listProjects: async () => [project],
      saveProject: async () => {},
      listTypeFilters: async () => ({}),
      saveTypeFilter: async () => {},
      listCards: async () => [card],
      deleteCard: async () => {},
      deleteProject: async () => {},
      saveCard: async () => {
        throw new Error('QuotaExceededError');
      },
    });
    await store.hydrate();
    await expect(store.moveCard(card.id, 'en-pausa')).rejects.toThrow('QuotaExceededError');
    expect(store.cards).toEqual([card]);
    expect(store.projects).toEqual([project]);
  });

  it('si el guardado de la edición de una tarjeta falla, se conservan los valores anteriores', async () => {
    const project = createProject({ name: 'Mi app' });
    const card = createCard({ projectId: project.id, title: 'Login', status: 'sin-empezar' });
    const store = new AppStore({
      listProjects: async () => [project],
      saveProject: async () => {},
      listTypeFilters: async () => ({}),
      saveTypeFilter: async () => {},
      listCards: async () => [card],
      deleteCard: async () => {},
      deleteProject: async () => {},
      saveCard: async () => {
        throw new Error('QuotaExceededError');
      },
    });
    await store.hydrate();
    await expect(store.updateCard(card.id, { ...card, title: 'Otro' })).rejects.toThrow('QuotaExceededError');
    expect(store.cards).toEqual([card]);
    expect(store.projects).toEqual([project]);
  });

  it('archivar, restaurar y borrar definitivamente una tarjeta persiste tras recargar (AC-021, AC-022, AC-023)', async () => {
    const dbName = freshName();
    const store = new AppStore(createIdbRepository(dbName));
    await store.hydrate();
    const project = await store.createProject({ name: 'Mi app' });
    const card = await store.createCard(project.id, 'Login', 'en-curso');
    const edited = await store.updateCard(card.id, {
      title: 'Login',
      type: 'arreglo',
      status: 'en-curso',
      description: 'Una\nDos',
      priority: 'alta',
    });
    const projectBefore = store.projects[0];

    const archived = await store.archiveCard(card.id);
    expect(archived).toEqual({ ...edited, archived: true });
    expect(store.projects[0].updatedAt >= projectBefore.updatedAt).toBe(true);

    let reloaded = new AppStore(createIdbRepository(dbName));
    await reloaded.hydrate();
    expect(reloaded.cards).toEqual([archived]);

    const restored = await reloaded.restoreCard(card.id);
    expect(restored).toEqual(edited);
    reloaded = new AppStore(createIdbRepository(dbName));
    await reloaded.hydrate();
    expect(reloaded.cards).toEqual([edited]);

    // Solo se borran definitivamente tarjetas archivadas.
    await expect(reloaded.deleteCard(card.id)).rejects.toThrow('Solo se pueden borrar tarjetas archivadas');
    expect(reloaded.cards).toEqual([edited]);

    await reloaded.archiveCard(card.id);
    await reloaded.deleteCard(card.id);
    expect(reloaded.cards).toEqual([]);
    const again = new AppStore(createIdbRepository(dbName));
    await again.hydrate();
    expect(again.cards).toEqual([]);
    expect(again.projects.map((p) => p.id)).toEqual([project.id]);
  });

  it('si el borrado definitivo falla, la tarjeta sigue archivada', async () => {
    const project = createProject({ name: 'Mi app' });
    const card = { ...createCard({ projectId: project.id, title: 'Login', status: 'en-curso' }), archived: true };
    const store = new AppStore({
      listProjects: async () => [project],
      saveProject: async () => {},
      listTypeFilters: async () => ({}),
      saveTypeFilter: async () => {},
      listCards: async () => [card],
      saveCard: async () => {},
      deleteCard: async () => {
        throw new Error('QuotaExceededError');
      },
      deleteProject: async () => {},
    });
    await store.hydrate();
    await expect(store.deleteCard(card.id)).rejects.toThrow('QuotaExceededError');
    expect(store.cards).toEqual([card]);
    expect(store.projects).toEqual([project]);
  });

  it('el filtro por tipo se recuerda por proyecto tras recargar (AC-019, AC-039)', async () => {
    const dbName = freshName();
    const store = new AppStore(createIdbRepository(dbName));
    await store.hydrate();
    const a = await store.createProject({ name: 'A' });
    const b = await store.createProject({ name: 'B' });
    expect(store.typeFilterOf(a.id)).toEqual([]);

    await store.setTypeFilter(a.id, ['arreglo', 'tecnico']);
    expect(store.typeFilterOf(a.id)).toEqual(['arreglo', 'tecnico']);

    const reloaded = new AppStore(createIdbRepository(dbName));
    await reloaded.hydrate();
    expect(reloaded.typeFilterOf(a.id)).toEqual(['arreglo', 'tecnico']);
    expect(reloaded.typeFilterOf(b.id)).toEqual([]);

    await reloaded.setTypeFilter(a.id, []);
    const again = new AppStore(createIdbRepository(dbName));
    await again.hydrate();
    expect(again.typeFilterOf(a.id)).toEqual([]);
  });
});

describe('AppStore · archivo de proyectos', () => {
  it('archivar un proyecto lo pasa a archivados sin tocar sus tarjetas, y restaurarlo lo devuelve igual (AC-024, AC-025)', async () => {
    const dbName = freshName();
    const store = new AppStore(createIdbRepository(dbName));
    await store.hydrate();
    const project = await store.createProject({ name: 'Mi app' });
    const other = await store.createProject({ name: 'Otra' });
    await store.createCard(project.id, 'A', 'sin-empezar');
    await store.createCard(project.id, 'B', 'en-curso');
    await store.createCard(project.id, 'C', 'finalizado');
    const d = await store.createCard(project.id, 'D', 'en-pausa');
    await store.archiveCard(d.id);
    const before = store.projects.find((p) => p.id === project.id)!;
    const cardsBefore = [...store.cards];

    const archived = await store.archiveProject(project.id);
    expect(archived).toEqual({ ...before, archived: true });
    expect(store.activeProjects.map((p) => p.id)).toEqual([other.id]);
    expect(store.archivedProjects.map((p) => p.id)).toEqual([project.id]);
    expect(store.cards).toEqual(cardsBefore);

    const reloaded = new AppStore(createIdbRepository(dbName));
    await reloaded.hydrate();
    expect(reloaded.archivedProjects).toEqual([archived]);

    const restored = await reloaded.restoreProject(project.id);
    expect(restored).toEqual(before);
    expect(reloaded.archivedProjects).toEqual([]);
    expect(reloaded.activeProjects.map((p) => p.id).sort()).toEqual([project.id, other.id].sort());
    expect(reloaded.cards.filter((c) => c.projectId === project.id && !c.archived)).toHaveLength(3);
    expect(reloaded.cards.filter((c) => c.projectId === project.id && c.archived)).toHaveLength(1);
  });

  it('borrar definitivamente un proyecto archivado elimina el proyecto y todas sus tarjetas tras recargar (AC-027)', async () => {
    const dbName = freshName();
    const store = new AppStore(createIdbRepository(dbName));
    await store.hydrate();
    const project = await store.createProject({ name: 'Mi app' });
    const other = await store.createProject({ name: 'Otra' });
    await store.createCard(project.id, 'A', 'sin-empezar');
    const b = await store.createCard(project.id, 'B', 'en-curso');
    await store.archiveCard(b.id);
    const kept = await store.createCard(other.id, 'Queda', 'sin-empezar');
    await store.setTypeFilter(project.id, ['arreglo']);

    await expect(store.deleteProject(project.id)).rejects.toThrow('Solo se pueden borrar proyectos archivados');
    expect(store.projects).toHaveLength(2);

    await store.archiveProject(project.id);
    await store.deleteProject(project.id);
    expect(store.projects.map((p) => p.id)).toEqual([other.id]);
    expect(store.cards).toEqual([kept]);
    expect(store.typeFilterOf(project.id)).toEqual([]);

    const reloaded = new AppStore(createIdbRepository(dbName));
    await reloaded.hydrate();
    expect(reloaded.projects.map((p) => p.id)).toEqual([other.id]);
    expect(reloaded.cards).toEqual([kept]);
    expect(reloaded.typeFilters).toEqual({});
  });

  it('si el borrado definitivo del proyecto falla, nada cambia', async () => {
    const project = { ...createProject({ name: 'Mi app' }), archived: true };
    const card = createCard({ projectId: project.id, title: 'Login', status: 'en-curso' });
    const store = new AppStore({
      listProjects: async () => [project],
      saveProject: async () => {},
      listTypeFilters: async () => ({}),
      saveTypeFilter: async () => {},
      listCards: async () => [card],
      saveCard: async () => {},
      deleteCard: async () => {},
      deleteProject: async () => {
        throw new Error('QuotaExceededError');
      },
    });
    await store.hydrate();
    await expect(store.deleteProject(project.id)).rejects.toThrow('QuotaExceededError');
    expect(store.projects).toEqual([project]);
    expect(store.cards).toEqual([card]);
  });
});

describe('AppStore · proyecto archivado de solo lectura (AC-026)', () => {
  it('rechaza crear, editar, mover, archivar, restaurar y borrar tarjetas y editar el proyecto, sin guardar nada', async () => {
    const dbName = freshName();
    const store = new AppStore(createIdbRepository(dbName));
    await store.hydrate();
    const project = await store.createProject({ name: 'Mi app' });
    const a = await store.createCard(project.id, 'A', 'sin-empezar');
    const b = await store.createCard(project.id, 'B', 'en-curso');
    await store.archiveCard(b.id);
    await store.archiveProject(project.id);
    const byId = <T extends { id: string }>(items: T[]) => [...items].sort((x, y) => x.id.localeCompare(y.id));
    const projectsBefore = JSON.parse(JSON.stringify(store.projects));
    const cardsBefore = byId(JSON.parse(JSON.stringify(store.cards)));

    const attempts: (() => Promise<unknown>)[] = [
      () => store.createCard(project.id, 'Nueva', 'sin-empezar'),
      () =>
        store.updateCard(a.id, {
          title: 'Editada',
          type: 'arreglo',
          status: 'en-curso',
          description: 'x',
          priority: 'alta',
        }),
      () => store.moveCard(a.id, 'finalizado'),
      () => store.archiveCard(a.id),
      () => store.restoreCard(b.id),
      () => store.deleteCard(b.id),
      () => store.updateProject(project.id, { name: 'Otro', description: '' }),
    ];
    for (const attempt of attempts) {
      await expect(attempt()).rejects.toThrow(ArchivedProjectError);
    }
    expect(store.projects).toEqual(projectsBefore);
    expect(byId(store.cards)).toEqual(cardsBefore);

    const reloaded = new AppStore(createIdbRepository(dbName));
    await reloaded.hydrate();
    expect(reloaded.projects).toEqual(projectsBefore);
    expect(byId(reloaded.cards)).toEqual(cardsBefore);
  });
});
