/**
 * Repositorio de datos. Es la única puerta de la app a IndexedDB: la UI y el
 * store trabajan contra la interfaz `Repository`, nunca contra `idb`.
 */
import type { IDBPDatabase } from 'idb';
import { normalizeTypeFilter, type Card, type CardType, type Project } from '../domain';
import { openKanbanDB, type KanbanDB } from './db';
import { changesOf, type TabSync } from './sync';

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
  /** Lecturas por entidad, para releer lo que ha cambiado otra pestaña (AC-038). */
  getProject(id: string): Promise<Project | undefined>;
  getCard(id: string): Promise<Card | undefined>;
  /** Todas las tarjetas (activas y archivadas) del proyecto. */
  listProjectCards(projectId: string): Promise<Card[]>;
  /** Filtro por tipo guardado del proyecto, o `undefined` si no tiene. */
  getTypeFilter(projectId: string): Promise<CardType[] | undefined>;
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

/**
 * Envuelve `repository` para que, tras cada escritura confirmada, publique
 * en `sync` las entidades cambiadas (AC-038). Una escritura fallida no
 * publica nada; las lecturas no se tocan.
 */
export function publishWrites(repository: Repository, sync: TabSync): Repository {
  const published: Repository = { ...repository };
  for (const method of WRITE_METHODS) {
    const write = repository[method] as (...args: unknown[]) => Promise<void>;
    (published[method] as (...args: unknown[]) => Promise<void>) = async (...args) => {
      await write.apply(repository, args);
      sync.publish(changesOf(method, args as never));
    };
  }
  return published;
}

const TYPE_FILTER_PREFIX = 'filter:';

/** Clave en el store `prefs` del filtro por tipo de un proyecto. */
export function typeFilterKey(projectId: string): string {
  return `${TYPE_FILTER_PREFIX}${projectId}`;
}

export function createIdbRepository(dbName?: string): Repository {
  let dbPromise: Promise<IDBPDatabase<KanbanDB>> | undefined;
  return idbRepository(() => (dbPromise ??= openKanbanDB(dbName)));
}

function idbRepository(db: () => Promise<IDBPDatabase<KanbanDB>>): Repository {
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
    async getProject(id) {
      return (await db()).get('projects', id);
    },
    async getCard(id) {
      return (await db()).get('cards', id);
    },
    async listProjectCards(projectId) {
      return (await db()).getAllFromIndex('cards', 'projectId', projectId);
    },
    async getTypeFilter(projectId) {
      const value = await (await db()).get('prefs', typeFilterKey(projectId));
      return value === undefined ? undefined : normalizeTypeFilter(value);
    },
  };
}

/**
 * Repositorio en memoria con la misma interfaz que el de IndexedDB (AC-037).
 * Se usa cuando IndexedDB no está disponible: los datos se pierden al cerrar.
 * Guarda y devuelve copias, igual que IndexedDB (que clona los valores).
 */
export function createMemoryRepository(): Repository {
  const projects = new Map<string, Project>();
  const cards = new Map<string, Card>();
  const typeFilters = new Map<string, CardType[]>();
  const deleteCardsOf = (projectId: string) => {
    for (const card of [...cards.values()]) if (card.projectId === projectId) cards.delete(card.id);
  };

  return {
    async listProjects() {
      return [...projects.values()].map((p) => ({ ...p }));
    },
    async saveProject(project) {
      projects.set(project.id, { ...project });
    },
    async listCards() {
      return [...cards.values()].map((c) => ({ ...c }));
    },
    async saveCard(card, project) {
      cards.set(card.id, { ...card });
      projects.set(project.id, { ...project });
    },
    async deleteCard(cardId, project) {
      cards.delete(cardId);
      projects.set(project.id, { ...project });
    },
    async deleteProject(projectId) {
      projects.delete(projectId);
      deleteCardsOf(projectId);
      typeFilters.delete(projectId);
    },
    async replaceAll(newProjects, newCards) {
      projects.clear();
      cards.clear();
      for (const p of newProjects) projects.set(p.id, { ...p });
      for (const c of newCards) cards.set(c.id, { ...c });
    },
    async importProject(project, newCards) {
      deleteCardsOf(project.id);
      projects.set(project.id, { ...project });
      for (const c of newCards) cards.set(c.id, { ...c });
    },
    async listTypeFilters() {
      return Object.fromEntries([...typeFilters].map(([id, types]) => [id, [...types]]));
    },
    async saveTypeFilter(projectId, types) {
      typeFilters.set(projectId, [...types]);
    },
    async getProject(id) {
      const project = projects.get(id);
      return project && { ...project };
    },
    async getCard(id) {
      const card = cards.get(id);
      return card && { ...card };
    },
    async listProjectCards(projectId) {
      return [...cards.values()].filter((c) => c.projectId === projectId).map((c) => ({ ...c }));
    },
    async getTypeFilter(projectId) {
      const types = typeFilters.get(projectId);
      return types && [...types];
    },
  };
}

/**
 * Repositorio de la app en el navegador (AC-037). Al primer uso intenta abrir
 * IndexedDB; si `indexedDB` no existe o la base de datos no se puede abrir,
 * avisa con `onUnavailable` (una sola vez) y trabaja con un repositorio en
 * memoria, con la misma interfaz, durante el resto de la sesión.
 */
export function createBrowserRepository(options: {
  dbName?: string;
  onUnavailable: (error: unknown) => void;
  /**
   * Canal entre pestañas (AC-038). Con IndexedDB, cada escritura confirmada
   * se publica en él. Sin IndexedDB se cierra: los datos en memoria son de
   * esta pestaña y no hay nada guardado que compartir ni que releer.
   */
  sync?: TabSync;
}): Repository {
  let ready: Promise<Repository> | undefined;
  const open = async (): Promise<Repository> => {
    try {
      if (typeof indexedDB === 'undefined' || indexedDB === null) {
        throw new Error('IndexedDB no está disponible en este navegador');
      }
      const db = await openKanbanDB(options.dbName);
      const repository = idbRepository(async () => db);
      return options.sync ? publishWrites(repository, options.sync) : repository;
    } catch (error) {
      options.sync?.close();
      options.onUnavailable(error);
      return createMemoryRepository();
    }
  };
  const repository = () => (ready ??= open());

  return {
    listProjects: async () => (await repository()).listProjects(),
    saveProject: async (project) => (await repository()).saveProject(project),
    listCards: async () => (await repository()).listCards(),
    saveCard: async (card, project) => (await repository()).saveCard(card, project),
    deleteCard: async (cardId, project) => (await repository()).deleteCard(cardId, project),
    deleteProject: async (projectId) => (await repository()).deleteProject(projectId),
    replaceAll: async (projects, cards) => (await repository()).replaceAll(projects, cards),
    importProject: async (project, cards) => (await repository()).importProject(project, cards),
    listTypeFilters: async () => (await repository()).listTypeFilters(),
    saveTypeFilter: async (projectId, types) => (await repository()).saveTypeFilter(projectId, types),
    getProject: async (id) => (await repository()).getProject(id),
    getCard: async (id) => (await repository()).getCard(id),
    listProjectCards: async (projectId) => (await repository()).listProjectCards(projectId),
    getTypeFilter: async (projectId) => (await repository()).getTypeFilter(projectId),
  };
}
