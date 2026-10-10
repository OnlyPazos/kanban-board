import { describe, expect, it } from 'vitest';
import { createIdbRepository } from '../persistence/repository';
import { AppStore } from './app-store.svelte';
import { createProject } from '../domain';

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
});
