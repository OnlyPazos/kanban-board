/**
 * Navegación mínima por hash (sin router externo):
 *   ''  | '#/'              → lista de proyectos
 *   '#/project/<id>'        → tablero del proyecto con ese id
 * Cualquier otro hash se trata como la lista.
 */
export type Route = { name: 'list' } | { name: 'board'; projectId: string };

const BOARD_PATTERN = /^#\/project\/([^/]+)$/;

export function parseRoute(hash: string): Route {
  const match = BOARD_PATTERN.exec(hash);
  if (match) {
    try {
      return { name: 'board', projectId: decodeURIComponent(match[1]) };
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
