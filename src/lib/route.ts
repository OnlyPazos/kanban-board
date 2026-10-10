/**
 * Navegación mínima por hash (sin router externo):
 *   ''  | '#/'                      → lista de proyectos
 *   '#/project/<id>'                → tablero del proyecto con ese id
 *   '#/project/<id>/archived'       → tarjetas archivadas de ese proyecto
 * Cualquier otro hash se trata como la lista.
 */
export type Route =
  | { name: 'list' }
  | { name: 'board'; projectId: string }
  | { name: 'archived-cards'; projectId: string };

const PROJECT_PATTERN = /^#\/project\/([^/]+)(\/archived)?$/;

export function parseRoute(hash: string): Route {
  const match = PROJECT_PATTERN.exec(hash);
  if (match) {
    try {
      const projectId = decodeURIComponent(match[1]);
      return match[2] ? { name: 'archived-cards', projectId } : { name: 'board', projectId };
    } catch {
      return { name: 'list' };
    }
  }
  return { name: 'list' };
}

export const LIST_HREF = '#/';

export function boardHref(projectId: string): string {
  return `#/project/${encodeURIComponent(projectId)}`;
}

export function archivedCardsHref(projectId: string): string {
  return `${boardHref(projectId)}/archived`;
}
