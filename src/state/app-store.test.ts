import { afterEach, describe, expect, it, vi } from 'vitest';
import { createIdbRepository } from '../persistence/repository';
import { AppStore } from './app-store.svelte';
import { createCard, createProject } from '../domain';

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
      listCards: async () => [],
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
      listCards: async () => [],
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
      listCards: async () => [],
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

  it('si el guardado de la edición de una tarjeta falla, se conservan los valores anteriores', async () => {
    const project = createProject({ name: 'Mi app' });
    const card = createCard({ projectId: project.id, title: 'Login', status: 'sin-empezar' });
    const store = new AppStore({
      listProjects: async () => [project],
      saveProject: async () => {},
      listCards: async () => [card],
      saveCard: async () => {
        throw new Error('QuotaExceededError');
      },
    });
    await store.hydrate();
    await expect(store.updateCard(card.id, { ...card, title: 'Otro' })).rejects.toThrow('QuotaExceededError');
    expect(store.cards).toEqual([card]);
    expect(store.projects).toEqual([project]);
  });
});
