import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import App from './App.svelte';
import { createProject, type Card, type CardType, type Project } from './domain';
import type { Repository } from './persistence/repository';

function memoryRepository(initial: Project[] = []): Repository {
  const projects = new Map(initial.map((p) => [p.id, p]));
  const cards = new Map<string, Card>();
  const typeFilters = new Map<string, CardType[]>();
  return {
    listTypeFilters: async () => Object.fromEntries(typeFilters),
    saveTypeFilter: async (projectId, types) => {
      typeFilters.set(projectId, [...types]);
    },
    listCards: async () => [...cards.values()],
    saveCard: async (card, project) => {
      cards.set(card.id, { ...card });
      projects.set(project.id, { ...project });
    },
    deleteCard: async (cardId, project) => {
      cards.delete(cardId);
      projects.set(project.id, { ...project });
    },
    deleteProject: async (projectId) => {
      projects.delete(projectId);
      for (const card of [...cards.values()]) if (card.projectId === projectId) cards.delete(card.id);
      typeFilters.delete(projectId);
    },
    listProjects: async () => [...projects.values()],
    saveProject: async (project) => {
      projects.set(project.id, { ...project });
    },
  };
}

// jsdom no implementa showModal/close de <dialog>.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
});

afterEach(() => {
  window.location.hash = '';
});

describe('App', () => {
  it('renderiza la cabecera común y la lista de proyectos vacía', () => {
    render(App, { repository: memoryRepository() });
    expect(screen.getByRole('banner')).toHaveTextContent('Kanban de proyectos');
    expect(screen.getByRole('heading', { name: 'Proyectos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear proyecto' })).toBeInTheDocument();
  });

  it('abrir un proyecto muestra su tablero y el enlace vuelve a la lista', async () => {
    const project = createProject({ name: 'Mi app' });
    render(App, { repository: memoryRepository([project]) });
    await fireEvent.click(await screen.findByRole('button', { name: 'Mi app' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Mi app' })).toBeInTheDocument();
    expect(window.location.hash).toBe(`#/project/${project.id}`);
    expect(screen.getAllByRole('region').map((c) => c.getAttribute('aria-label'))).toEqual([
      'Sin empezar',
      'En curso',
      'En pausa',
      'Finalizado',
    ]);

    window.location.hash = '#/';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(await screen.findByRole('heading', { name: 'Proyectos' })).toBeInTheDocument();
  });

  it('editar el proyecto desde el tablero actualiza el nombre de la cabecera', async () => {
    const project = createProject({ name: 'Mi app' });
    window.location.hash = `#/project/${project.id}`;
    render(App, { repository: memoryRepository([project]) });
    await screen.findByRole('heading', { level: 1, name: 'Mi app' });

    await fireEvent.click(screen.getByRole('button', { name: 'Editar proyecto' }));
    const dialog = screen.getByRole('dialog', { name: 'Editar proyecto' });
    const nameInput = within(dialog).getByLabelText(/Nombre/);
    await fireEvent.input(nameInput, { target: { value: 'Renombrada' } });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Renombrada' })).toBeInTheDocument(),
    );
  });

  it('archivar una tarjeta la lleva a "Tarjetas archivadas" y restaurarla la devuelve a su columna (AC-021, AC-022)', async () => {
    const project = createProject({ name: 'Mi app' });
    const repository = memoryRepository([project]);
    window.location.hash = `#/project/${project.id}`;
    render(App, { repository });
    await screen.findByRole('heading', { level: 1, name: 'Mi app' });

    const enCurso = screen.getByRole('region', { name: 'En curso' });
    await fireEvent.click(within(enCurso).getByRole('button', { name: 'Añadir tarjeta' }));
    const dialog = screen.getByRole('dialog', { name: 'Añadir tarjeta' });
    await fireEvent.input(within(dialog).getByLabelText(/Título/), { target: { value: 'Login' } });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Añadir' }));
    await within(enCurso).findByRole('button', { name: 'Archivar' });

    await fireEvent.click(within(enCurso).getByRole('button', { name: 'Archivar' }));
    await waitFor(() => expect(within(enCurso).queryByText('Login')).not.toBeInTheDocument());
    expect((await repository.listCards())[0]).toMatchObject({ title: 'Login', archived: true });

    window.location.hash = `#/project/${project.id}/archived`;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await screen.findByRole('heading', { level: 1, name: 'Tarjetas archivadas' });
    await fireEvent.click(screen.getByRole('button', { name: 'Restaurar Login' }));
    await waitFor(() => expect(screen.queryByRole('listitem', { name: 'Login' })).not.toBeInTheDocument());

    window.location.hash = `#/project/${project.id}`;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    const column = await screen.findByRole('region', { name: 'En curso' });
    expect(within(column).getByText('Login')).toBeInTheDocument();
    expect((await repository.listCards())[0]).toMatchObject({ title: 'Login', archived: false });
  });

  it('archivar un proyecto lo pasa a "Proyectos archivados"; restaurarlo lo devuelve a la lista (AC-024, AC-025)', async () => {
    const project = createProject({ name: 'Mi app' });
    const other = createProject({ name: 'Otra' });
    const repository = memoryRepository([project, other]);
    render(App, { repository });
    await screen.findByRole('button', { name: 'Mi app' });

    await fireEvent.click(screen.getByRole('button', { name: 'Archivar Mi app' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Mi app' })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Otra' })).toBeInTheDocument();
    expect((await repository.listProjects()).find((p) => p.id === project.id)).toEqual({ ...project, archived: true });

    window.location.hash = '#/archived';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await screen.findByRole('heading', { level: 1, name: 'Proyectos archivados' });
    expect(screen.getAllByRole('listitem').map((li) => li.getAttribute('aria-label'))).toEqual(['Mi app']);
    await fireEvent.click(screen.getByRole('button', { name: 'Restaurar Mi app' }));
    await waitFor(() => expect(screen.queryByRole('listitem', { name: 'Mi app' })).not.toBeInTheDocument());
    expect((await repository.listProjects()).find((p) => p.id === project.id)).toEqual(project);

    window.location.hash = '';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(await screen.findByRole('button', { name: 'Mi app' })).toBeInTheDocument();
  });

  it('borrar definitivamente un proyecto archivado lo elimina con sus tarjetas (AC-027)', async () => {
    const project = { ...createProject({ name: 'Mi app' }), archived: true };
    const repository = memoryRepository([project]);
    window.location.hash = '#/archived';
    render(App, { repository });
    await screen.findByRole('listitem', { name: 'Mi app' });

    await fireEvent.click(screen.getByRole('button', { name: 'Borrar definitivamente Mi app' }));
    const dialog = screen.getByRole('dialog', { name: '¿Borrar definitivamente el proyecto?' });
    expect(dialog).toHaveTextContent('«Mi app»');
    expect(dialog).toHaveTextContent('0 tarjetas');
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Borrar definitivamente' }));
    await waitFor(() => expect(screen.queryByRole('listitem', { name: 'Mi app' })).not.toBeInTheDocument());
    expect(await repository.listProjects()).toEqual([]);
  });

  it('un id de proyecto inexistente muestra "Proyecto no encontrado"', async () => {
    window.location.hash = '#/project/no-existe';
    render(App, { repository: memoryRepository() });
    expect(await screen.findByRole('heading', { name: 'Proyecto no encontrado' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /volver a proyectos/i })).toHaveAttribute('href', '#/');
  });

  it('"Añadir tarjeta" en "En curso" crea la tarjeta en esa columna y la conserva al recargar', async () => {
    const project = createProject({ name: 'Mi app' });
    const repository = memoryRepository([project]);
    window.location.hash = `#/project/${project.id}`;
    const { unmount } = render(App, { repository });
    await screen.findByRole('heading', { level: 1, name: 'Mi app' });

    const enCurso = screen.getByRole('region', { name: 'En curso' });
    await fireEvent.click(within(enCurso).getByRole('button', { name: 'Añadir tarjeta' }));
    const dialog = screen.getByRole('dialog', { name: 'Añadir tarjeta' });
    await fireEvent.input(within(dialog).getByLabelText(/Título/), { target: { value: 'Login' } });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Añadir' }));

    await waitFor(() => expect(within(enCurso).getByRole('heading', { name: 'Login' })).toBeInTheDocument());
    unmount();

    render(App, { repository });
    const reloaded = await screen.findByRole('region', { name: 'En curso' });
    await waitFor(() => expect(within(reloaded).getByRole('heading', { name: 'Login' })).toBeInTheDocument());
    const item = within(reloaded).getByRole('listitem');
    expect(item.dataset.type).toBe('novedad');
    expect(item.dataset.priority).toBe('');
  });
});
