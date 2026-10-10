/**
 * Repositorio de datos. Es la única puerta de la app a IndexedDB: la UI y el
 * store trabajan contra la interfaz `Repository`, nunca contra `idb`.
 */
import type { IDBPDatabase } from 'idb';
import type { Card, Project } from '../domain';
import { openKanbanDB, type KanbanDB } from './db';

export interface Repository {
  listProjects(): Promise<Project[]>;
  saveProject(project: Project): Promise<void>;
  listCards(): Promise<Card[]>;
  /** Guarda la tarjeta y su proyecto (con `updatedAt` ya actualizado) en una sola transacción. */
  saveCard(card: Card, project: Project): Promise<void>;
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
    async listCards() {
      return (await db()).getAll('cards');
    },
    async saveCard(card, project) {
      const tx = (await db()).transaction(['cards', 'projects'], 'readwrite');
      await Promise.all([
        tx.objectStore('cards').put({ ...card }),
        tx.objectStore('projects').put({ ...project }),
        tx.done,
      ]);
    },
  };
}
