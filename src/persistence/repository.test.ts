import { describe, expect, it } from 'vitest';
import { createCard, createProject } from '../domain';
import { openKanbanDB } from './db';
import { createIdbRepository, typeFilterKey } from './repository';

let counter = 0;
const freshName = () => `kanban-board-test-${++counter}-${crypto.randomUUID()}`;

describe('createIdbRepository', () => {
  it('crea los object stores projects, cards (índice projectId) y prefs', async () => {
    const db = await openKanbanDB(freshName());
    expect([...db.objectStoreNames].sort()).toEqual(['cards', 'prefs', 'projects']);
    const tx = db.transaction('cards');
    expect([...tx.store.indexNames]).toEqual(['projectId']);
    expect(tx.store.keyPath).toBe('id');
    db.close();
  });

  it('sin datos devuelve una lista vacía', async () => {
    const repo = createIdbRepository(freshName());
    expect(await repo.listProjects()).toEqual([]);
  });

  it('un proyecto guardado se lee desde otra instancia (simula recargar)', async () => {
    const name = freshName();
    const project = createProject({ name: 'Mi app', description: 'Demo' });
    await createIdbRepository(name).saveProject(project);

    const reloaded = await createIdbRepository(name).listProjects();
    expect(reloaded).toEqual([project]);
  });

  it('guardar de nuevo el mismo id sobrescribe en vez de duplicar', async () => {
    const repo = createIdbRepository(freshName());
    const project = createProject({ name: 'Mi app' });
    await repo.saveProject(project);
    await repo.saveProject({ ...project, description: 'Cambiada' });
    expect(await repo.listProjects()).toEqual([{ ...project, description: 'Cambiada' }]);
  });
});

describe('createIdbRepository · tarjetas', () => {
  it('saveCard guarda la tarjeta y el proyecto actualizado; se leen desde otra instancia', async () => {
    const name = freshName();
    const project = createProject({ name: 'Mi app' });
    const repo = createIdbRepository(name);
    await repo.saveProject(project);

    const card = createCard({ projectId: project.id, title: 'Login', status: 'en-curso' });
    const touched = { ...project, updatedAt: '2999-01-01T00:00:00.000Z' };
    await repo.saveCard(card, touched);

    const reloaded = createIdbRepository(name);
    expect(await reloaded.listCards()).toEqual([card]);
    expect(await reloaded.listProjects()).toEqual([touched]);
  });
});

describe('createIdbRepository · borrado definitivo', () => {
  it('deleteCard elimina el registro y guarda el proyecto; no reaparece desde otra instancia', async () => {
    const name = freshName();
    const project = createProject({ name: 'Mi app' });
    const repo = createIdbRepository(name);
    const keep = createCard({ projectId: project.id, title: 'Queda', status: 'en-curso' });
    const gone = { ...createCard({ projectId: project.id, title: 'Se va', status: 'en-curso' }), archived: true };
    await repo.saveCard(keep, project);
    await repo.saveCard(gone, project);

    const touched = { ...project, updatedAt: '2999-01-01T00:00:00.000Z' };
    await repo.deleteCard(gone.id, touched);

    const reloaded = createIdbRepository(name);
    expect(await reloaded.listCards()).toEqual([keep]);
    expect(await reloaded.listProjects()).toEqual([touched]);
  });
});

describe('createIdbRepository · borrado definitivo de proyecto', () => {
  it('deleteProject elimina el proyecto, todas sus tarjetas y su filtro; no toca otros proyectos', async () => {
    const name = freshName();
    const repo = createIdbRepository(name);
    const gone = { ...createProject({ name: 'Se va' }), archived: true };
    const keep = createProject({ name: 'Queda' });
    const goneActive = createCard({ projectId: gone.id, title: 'Activa', status: 'en-curso' });
    const goneArchived = { ...createCard({ projectId: gone.id, title: 'Archivada', status: 'finalizado' }), archived: true };
    const kept = createCard({ projectId: keep.id, title: 'Otra', status: 'sin-empezar' });
    await repo.saveCard(goneActive, gone);
    await repo.saveCard(goneArchived, gone);
    await repo.saveCard(kept, keep);
    await repo.saveTypeFilter(gone.id, ['arreglo']);
    await repo.saveTypeFilter(keep.id, ['tecnico']);

    await repo.deleteProject(gone.id);

    const reloaded = createIdbRepository(name);
    expect(await reloaded.listProjects()).toEqual([keep]);
    expect(await reloaded.listCards()).toEqual([kept]);
    expect(await reloaded.listTypeFilters()).toEqual({ [keep.id]: ['tecnico'] });
  });
});

describe('createIdbRepository · filtro por tipo', () => {
  it('guarda el filtro por proyecto en prefs (clave filter:<projectId>) y se lee desde otra instancia', async () => {
    const name = freshName();
    const repo = createIdbRepository(name);
    expect(await repo.listTypeFilters()).toEqual({});

    await repo.saveTypeFilter('proyecto-a', ['arreglo', 'tecnico']);
    await repo.saveTypeFilter('proyecto-b', []);

    const reloaded = createIdbRepository(name);
    expect(await reloaded.listTypeFilters()).toEqual({ 'proyecto-a': ['arreglo', 'tecnico'], 'proyecto-b': [] });

    const db = await openKanbanDB(name);
    expect(await db.get('prefs', typeFilterKey('proyecto-a'))).toEqual(['arreglo', 'tecnico']);
    expect(typeFilterKey('proyecto-a')).toBe('filter:proyecto-a');
    db.close();
  });

  it('ignora valores guardados no válidos', async () => {
    const name = freshName();
    const db = await openKanbanDB(name);
    await db.put('prefs', ['arreglo', 'desconocido'], 'filter:x');
    await db.put('prefs', 'basura', 'filter:y');
    await db.put('prefs', ['arreglo'], 'otra-pref');
    db.close();
    expect(await createIdbRepository(name).listTypeFilters()).toEqual({ x: ['arreglo'], y: [] });
  });
});

describe('replaceAll (import completo, AC-030)', () => {
  it('vacía proyectos y tarjetas y escribe los nuevos tal cual, sin tocar las preferencias', async () => {
    const name = freshName();
    const repo = createIdbRepository(name);
    const old = createProject({ name: 'Vieja' });
    await repo.saveProject(old);
    await repo.saveCard(createCard({ projectId: old.id, title: 'Vieja tarjeta', status: 'en-curso' }), old);
    await repo.saveTypeFilter(old.id, ['mejora']);

    const imported = { ...createProject({ name: 'Importada' }), archived: true };
    const card = { ...createCard({ projectId: imported.id, title: 'T', status: 'finalizado' }), archived: true };
    await repo.replaceAll([imported], [card]);

    const reloaded = createIdbRepository(name);
    expect(await reloaded.listProjects()).toEqual([imported]);
    expect(await reloaded.listCards()).toEqual([card]);
    expect(await reloaded.listTypeFilters()).toEqual({ [old.id]: ['mejora'] });
  });

  it('si la escritura falla, la transacción se revierte y no cambia nada', async () => {
    const name = freshName();
    const repo = createIdbRepository(name);
    const old = createProject({ name: 'Vieja' });
    await repo.saveProject(old);
    // Un proyecto sin `id` (keyPath) hace fallar el put → se aborta la transacción.
    const broken = { ...createProject({ name: 'Rota' }), id: undefined } as unknown as typeof old;
    await expect(repo.replaceAll([broken], [])).rejects.toThrow();
    expect(await createIdbRepository(name).listProjects()).toEqual([old]);
  });
});

describe('importProject (import de proyecto, AC-031, AC-032)', () => {
  const byId = <T extends { id: string }>(xs: T[]) => [...xs].sort((a, b) => a.id.localeCompare(b.id));

  it('id nuevo: añade el proyecto con sus tarjetas y no toca el resto', async () => {
    const name = freshName();
    const repo = createIdbRepository(name);
    const other = createProject({ name: 'Otra' });
    const otherCard = createCard({ projectId: other.id, title: 'O', status: 'en-curso' });
    await repo.saveProject(other);
    await repo.saveCard(otherCard, other);

    const imported = { ...createProject({ name: 'Importada' }), archived: true };
    const card = { ...createCard({ projectId: imported.id, title: 'T', status: 'finalizado' }), archived: true };
    await repo.importProject(imported, [card]);

    const reloaded = createIdbRepository(name);
    expect(byId(await reloaded.listProjects())).toEqual(byId([other, imported]));
    expect(byId(await reloaded.listCards())).toEqual(byId([otherCard, card]));
  });

  it('id existente: sustituye el proyecto y todas sus tarjetas (también archivadas) por los del archivo', async () => {
    const name = freshName();
    const repo = createIdbRepository(name);
    const existing = { ...createProject({ name: 'Mía' }), archived: true };
    await repo.saveProject(existing);
    await repo.saveCard(createCard({ projectId: existing.id, title: 'Vieja', status: 'en-curso' }), existing);
    await repo.saveCard(
      { ...createCard({ projectId: existing.id, title: 'Vieja archivada', status: 'en-pausa' }), archived: true },
      existing,
    );

    const replacement = { ...existing, name: 'Del archivo', archived: false };
    const card = createCard({ projectId: existing.id, title: 'Nueva', status: 'sin-empezar' });
    await repo.importProject(replacement, [card]);

    const reloaded = createIdbRepository(name);
    expect(await reloaded.listProjects()).toEqual([replacement]);
    expect(await reloaded.listCards()).toEqual([card]);
  });

  it('si la escritura falla, la transacción se revierte y no cambia nada', async () => {
    const name = freshName();
    const repo = createIdbRepository(name);
    const existing = createProject({ name: 'Mía' });
    const oldCard = createCard({ projectId: existing.id, title: 'Vieja', status: 'en-curso' });
    await repo.saveProject(existing);
    await repo.saveCard(oldCard, existing);

    // Una tarjeta sin `id` (keyPath) hace fallar el put → se aborta la transacción.
    const broken = {
      ...createCard({ projectId: existing.id, title: 'Rota', status: 'en-curso' }),
      id: undefined,
    } as unknown as typeof oldCard;
    await expect(repo.importProject({ ...existing, name: 'Otro' }, [broken])).rejects.toThrow();

    const reloaded = createIdbRepository(name);
    expect(await reloaded.listProjects()).toEqual([existing]);
    expect(await reloaded.listCards()).toEqual([oldCard]);
  });
});
