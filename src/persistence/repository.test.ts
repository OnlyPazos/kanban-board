import { describe, expect, it } from 'vitest';
import { createProject } from '../domain';
import { openKanbanDB } from './db';
import { createIdbRepository } from './repository';

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
