import { describe, expect, it } from 'vitest';
import { createIdbRepository } from '../persistence/repository';
import { AppStore } from './app-store.svelte';

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
      saveProject: async () => {
        throw new Error('QuotaExceededError');
      },
    });
    await store.hydrate();
    await expect(store.createProject({ name: 'Mi app' })).rejects.toThrow();
    expect(store.projects).toEqual([]);
  });
});
