/**
 * Repositorio de datos. Es la única puerta de la app a IndexedDB: la UI y el
 * store trabajan contra la interfaz `Repository`, nunca contra `idb`.
 */
import type { IDBPDatabase } from 'idb';
import { normalizeTypeFilter, type Card, type CardType, type Project } from '../domain';
import { openKanbanDB, type KanbanDB } from './db';

export interface Repository {
  listProjects(): Promise<Project[]>;
  saveProject(project: Project): Promise<void>;
  listCards(): Promise<Card[]>;
  /** Guarda la tarjeta y su proyecto (con `updatedAt` ya actualizado) en una sola transacción. */
  saveCard(card: Card, project: Project): Promise<void>;
  /** Borra definitivamente la tarjeta y guarda su proyecto (con `updatedAt` ya actualizado) en una sola transacción. */
  deleteCard(cardId: string, project: Project): Promise<void>;
  /** Filtros por tipo guardados, por `projectId` (store `prefs`, clave `filter:<projectId>`). */
  listTypeFilters(): Promise<Record<string, CardType[]>>;
  saveTypeFilter(projectId: string, types: CardType[]): Promise<void>;
}

const TYPE_FILTER_PREFIX = 'filter:';

/** Clave en el store `prefs` del filtro por tipo de un proyecto. */
export function typeFilterKey(projectId: string): string {
  return `${TYPE_FILTER_PREFIX}${projectId}`;
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
    async deleteCard(cardId, project) {
      const tx = (await db()).transaction(['cards', 'projects'], 'readwrite');
      await Promise.all([
        tx.objectStore('cards').delete(cardId),
        tx.objectStore('projects').put({ ...project }),
        tx.done,
      ]);
    },
    async listTypeFilters() {
      const tx = (await db()).transaction('prefs');
      const filters: Record<string, CardType[]> = {};
      for await (const cursor of tx.store) {
        const key = String(cursor.key);
        if (key.startsWith(TYPE_FILTER_PREFIX)) {
          filters[key.slice(TYPE_FILTER_PREFIX.length)] = normalizeTypeFilter(cursor.value);
        }
      }
      return filters;
    },
    async saveTypeFilter(projectId, types) {
      await (await db()).put('prefs', [...types], typeFilterKey(projectId));
    },
  };
}
