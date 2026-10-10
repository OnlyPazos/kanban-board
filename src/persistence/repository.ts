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
  /**
   * Borra definitivamente el proyecto, todas sus tarjetas (activas y
   * archivadas) y su filtro por tipo guardado, en una única transacción.
   */
  deleteProject(projectId: string): Promise<void>;
  /**
   * Import completo (AC-030): vacía `projects` y `cards` y escribe los
   * proyectos y tarjetas dados tal cual (ids, fechas y flags), en una única
   * transacción. Las preferencias (`prefs`) no se tocan.
   */
  replaceAll(projects: readonly Project[], cards: readonly Card[]): Promise<void>;
  /**
   * Import de proyecto (AC-031, AC-032): borra el proyecto con el `id` de
   * `project` y todas sus tarjetas (si existía) y escribe el proyecto y las
   * tarjetas dados tal cual (ids, fechas y flags), en una única transacción.
   * El resto de proyectos y tarjetas, y las preferencias (`prefs`), no se tocan.
   */
  importProject(project: Project, cards: readonly Card[]): Promise<void>;
  /** Filtros por tipo guardados, por `projectId` (store `prefs`, clave `filter:<projectId>`). */
  listTypeFilters(): Promise<Record<string, CardType[]>>;
  saveTypeFilter(projectId: string, types: CardType[]): Promise<void>;
}

/** Métodos de `Repository` que escriben en el almacenamiento. */
export const WRITE_METHODS = [
  'saveProject',
  'saveCard',
  'deleteCard',
  'deleteProject',
  'replaceAll',
  'importProject',
  'saveTypeFilter',
] as const satisfies readonly (keyof Repository)[];

export interface WriteObserver {
  /** Una escritura ha fallado (`QuotaExceededError`, transacción abortada…). */
  onWriteError(error: unknown): void;
  /** Una escritura se ha confirmado. */
  onWriteSuccess(): void;
}

/**
 * Envuelve `repository` para que cada escritura avise a `observer` de su
 * resultado (AC-035). El error se sigue propagando a quien llamó, para que
 * nunca se trate como guardado; las lecturas no se tocan.
 */
export function observeWrites(repository: Repository, observer: WriteObserver): Repository {
  const observed: Repository = { ...repository };
  for (const method of WRITE_METHODS) {
    const write = repository[method] as (...args: unknown[]) => Promise<void>;
    (observed[method] as (...args: unknown[]) => Promise<void>) = async (...args) => {
      try {
        await write.apply(repository, args);
      } catch (error) {
        observer.onWriteError(error);
        throw error;
      }
      observer.onWriteSuccess();
    };
  }
  return observed;
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
    async deleteProject(projectId) {
      const tx = (await db()).transaction(['projects', 'cards', 'prefs'], 'readwrite');
      const cards = tx.objectStore('cards');
      const deleteCards = async () => {
        const ids = await cards.index('projectId').getAllKeys(projectId);
        await Promise.all(ids.map((id) => cards.delete(id)));
      };
      await Promise.all([
        tx.objectStore('projects').delete(projectId),
        deleteCards(),
        tx.objectStore('prefs').delete(typeFilterKey(projectId)),
        tx.done,
      ]);
    },
    async replaceAll(projects, cards) {
      const tx = (await db()).transaction(['projects', 'cards'], 'readwrite');
      const projectStore = tx.objectStore('projects');
      const cardStore = tx.objectStore('cards');
      const write = async () => {
        try {
          await Promise.all([projectStore.clear(), cardStore.clear()]);
          await Promise.all([
            ...projects.map((p) => projectStore.put({ ...p })),
            ...cards.map((c) => cardStore.put({ ...c })),
          ]);
        } catch (error) {
          // Un fallo síncrono de `put` no aborta la transacción por sí solo:
          // se aborta para no dejar los datos a medias (todo o nada).
          try {
            tx.abort();
          } catch {
            // Ya abortada (p. ej. por un error de petición).
          }
          throw error;
        }
      };
      await Promise.all([write(), tx.done]);
    },
    async importProject(project, cards) {
      const tx = (await db()).transaction(['projects', 'cards'], 'readwrite');
      const projectStore = tx.objectStore('projects');
      const cardStore = tx.objectStore('cards');
      const write = async () => {
        // Peticiones ya lanzadas: si una falla, el resto se rechaza al abortar.
        const requests: Promise<unknown>[] = [];
        try {
          const oldIds = await cardStore.index('projectId').getAllKeys(project.id);
          await Promise.all(oldIds.map((id) => cardStore.delete(id)));
          requests.push(projectStore.put({ ...project }));
          for (const card of cards) requests.push(cardStore.put({ ...card }));
          await Promise.all(requests);
        } catch (error) {
          for (const request of requests) request.catch(() => {});
          // Igual que en `replaceAll`: todo o nada.
          try {
            tx.abort();
          } catch {
            // Ya abortada.
          }
          throw error;
        }
      };
      await Promise.all([write(), tx.done]);
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
