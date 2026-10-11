/**
 * Sincronización entre pestañas (AC-038, D-011). Tras cada escritura
 * confirmada en IndexedDB se publica qué entidad ha cambiado (`{ entity, id }`)
 * por un `BroadcastChannel`. Las demás pestañas releen esa entidad de
 * IndexedDB y actualizan su store. Política "último cambio gana": cada
 * escritura sobrescribe el registro completo y lo que se relee es siempre lo
 * último confirmado; no hay fusión de campos.
 */
import type { Repository, WRITE_METHODS } from './repository';

export const SYNC_CHANNEL = 'kanban-board';

export type SyncChange =
  /** Un proyecto (si ya no existe, se borró junto con sus tarjetas y su filtro). */
  | { entity: 'project'; id: string }
  /** Una tarjeta (si ya no existe, se borró). */
  | { entity: 'card'; id: string }
  /** Todas las tarjetas del proyecto `id` (import de proyecto). */
  | { entity: 'projectCards'; id: string }
  /** El filtro por tipo guardado del proyecto `id`. */
  | { entity: 'typeFilter'; id: string }
  /** Todos los proyectos y tarjetas (import completo). */
  | { entity: 'all' };

type WriteMethod = (typeof WRITE_METHODS)[number];

/** Entidades que cambia cada escritura del repositorio, en el orden en que se deben releer. */
export function changesOf<M extends WriteMethod>(method: M, args: Parameters<Repository[M]>): SyncChange[] {
  switch (method) {
    case 'saveProject': {
      const [project] = args as Parameters<Repository['saveProject']>;
      return [{ entity: 'project', id: project.id }];
    }
    case 'saveCard': {
      const [card, project] = args as Parameters<Repository['saveCard']>;
      return [
        { entity: 'card', id: card.id },
        { entity: 'project', id: project.id },
      ];
    }
    case 'deleteCard': {
      const [cardId, project] = args as Parameters<Repository['deleteCard']>;
      return [
        { entity: 'card', id: cardId },
        { entity: 'project', id: project.id },
      ];
    }
    case 'deleteProject': {
      const [projectId] = args as Parameters<Repository['deleteProject']>;
      return [{ entity: 'project', id: projectId }];
    }
    case 'replaceAll':
      return [{ entity: 'all' }];
    case 'importProject': {
      const [project] = args as Parameters<Repository['importProject']>;
      return [
        { entity: 'project', id: project.id },
        { entity: 'projectCards', id: project.id },
      ];
    }
    case 'saveTypeFilter': {
      const [projectId] = args as Parameters<Repository['saveTypeFilter']>;
      return [{ entity: 'typeFilter', id: projectId }];
    }
    default:
      return [];
  }
}

const ENTITIES = new Set(['project', 'card', 'projectCards', 'typeFilter']);

/** Valida un mensaje recibido por el canal; ignora cualquier otra cosa. */
export function parseSyncChange(data: unknown): SyncChange | null {
  if (typeof data !== 'object' || data === null) return null;
  const { entity, id } = data as { entity?: unknown; id?: unknown };
  if (entity === 'all') return { entity: 'all' };
  if (typeof entity === 'string' && ENTITIES.has(entity) && typeof id === 'string') {
    return { entity, id } as SyncChange;
  }
  return null;
}

export interface TabSync {
  /** Publica los cambios a las demás pestañas (la propia no los recibe). */
  publish(changes: readonly SyncChange[]): void;
  /** Escucha los cambios de las demás pestañas. Devuelve la función para dejar de escuchar. */
  subscribe(listener: (change: SyncChange) => void): () => void;
  /** Cierra el canal: deja de publicar y de recibir. */
  close(): void;
}

/**
 * Canal entre pestañas de la app. Si el navegador no tiene `BroadcastChannel`,
 * no hace nada (cada pestaña sigue funcionando por su cuenta).
 */
export function createTabSync(name: string = SYNC_CHANNEL): TabSync {
  let channel: BroadcastChannel | null =
    typeof BroadcastChannel === 'function' ? new BroadcastChannel(name) : null;
  const listeners = new Set<(change: SyncChange) => void>();
  if (channel) {
    channel.onmessage = (event: MessageEvent) => {
      const change = parseSyncChange(event.data);
      if (change) for (const listener of listeners) listener(change);
    };
  }

  return {
    publish(changes) {
      if (!channel) return;
      for (const change of changes) {
        try {
          channel.postMessage({ ...change });
        } catch (error) {
          console.warn('No se pudo avisar del cambio a las demás pestañas', error);
        }
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close() {
      listeners.clear();
      channel?.close();
      channel = null;
    },
  };
}

