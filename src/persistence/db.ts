/** Esquema de IndexedDB (a través de `idb`). Solo lo usa la capa de persistencia. */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Card, Project } from '../domain';

export const DB_NAME = 'kanban-board';
export const DB_VERSION = 1;

export interface KanbanDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
  };
  cards: {
    key: string;
    value: Card;
    indexes: { projectId: string };
  };
  /** Preferencias de la app (p. ej. filtro por tipo de WI-AC-018). */
  prefs: {
    key: string;
    value: unknown;
  };
}

export function openKanbanDB(name: string = DB_NAME): Promise<IDBPDatabase<KanbanDB>> {
  return openDB<KanbanDB>(name, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cards')) {
        const cards = db.createObjectStore('cards', { keyPath: 'id' });
        cards.createIndex('projectId', 'projectId');
      }
      if (!db.objectStoreNames.contains('prefs')) {
        db.createObjectStore('prefs');
      }
    },
  });
}
