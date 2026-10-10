/**
 * Repositorio de datos. Es la única puerta de la app a IndexedDB: la UI y el
 * store trabajan contra la interfaz `Repository`, nunca contra `idb`.
 */
import type { IDBPDatabase } from 'idb';
import type { Project } from '../domain';
import { openKanbanDB, type KanbanDB } from './db';

export interface Repository {
  listProjects(): Promise<Project[]>;
  saveProject(project: Project): Promise<void>;
}

export function createIdbRepository(dbName?: string): Repository {
  let dbPromise: Promise<IDBPDatabase<KanbanDB>> | undefined;
  const db = () => (dbPromise ??= openKanbanDB(dbName));

  return {
    async listProjects() {
      return (await db()).getAll('projects');
    },
    async saveProject(project) {
      // Copia plana: IndexedDB no puede clonar proxies de $state.
      await (await db()).put('projects', { ...project });
    },
  };
}
