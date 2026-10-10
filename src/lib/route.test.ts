import { describe, expect, it } from 'vitest';
import { archivedCardsHref, boardHref, LIST_HREF, parseRoute } from './route';

describe('route', () => {
  it('sin hash o con "#/" es la lista', () => {
    expect(parseRoute('')).toEqual({ name: 'list' });
    expect(parseRoute(LIST_HREF)).toEqual({ name: 'list' });
  });

  it('"#/project/<id>" es el tablero de ese proyecto', () => {
    expect(parseRoute('#/project/abc-123')).toEqual({ name: 'board', projectId: 'abc-123' });
  });

  it('boardHref y parseRoute son inversos', () => {
    const id = crypto.randomUUID();
    expect(parseRoute(boardHref(id))).toEqual({ name: 'board', projectId: id });
  });

  it('"#/project/<id>/archived" es la vista de tarjetas archivadas de ese proyecto (WI-AC-021)', () => {
    expect(parseRoute('#/project/abc-123/archived')).toEqual({ name: 'archived-cards', projectId: 'abc-123' });
    const id = crypto.randomUUID();
    expect(parseRoute(archivedCardsHref(id))).toEqual({ name: 'archived-cards', projectId: id });
    expect(parseRoute('#/project/abc-123/otra')).toEqual({ name: 'list' });
  });

  it('hashes desconocidos o mal formados vuelven a la lista', () => {
    expect(parseRoute('#/otra')).toEqual({ name: 'list' });
    expect(parseRoute('#/project/')).toEqual({ name: 'list' });
    expect(parseRoute('#/project/%E0%A4%A')).toEqual({ name: 'list' });
  });
});
