import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import App from './App.svelte';
import { chooseOption, getCombobox, optionLabels } from './views/choose-option';
import { buildExport, createCard, createProject, type Card, type CardType, type Project } from './domain';
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
    replaceAll: async (newProjects, newCards) => {
      projects.clear();
      cards.clear();
      for (const p of newProjects) projects.set(p.id, { ...p });
      for (const c of newCards) cards.set(c.id, { ...c });
    },
    importProject: async (project, newCards) => {
      for (const card of [...cards.values()]) if (card.projectId === project.id) cards.delete(card.id);
      projects.set(project.id, { ...project });
      for (const c of newCards) cards.set(c.id, { ...c });
    },
    listProjects: async () => [...projects.values()],
    saveProject: async (project) => {
      projects.set(project.id, { ...project });
    },
    getProject: async (id) => projects.get(id),
    getCard: async (id) => cards.get(id),
    listProjectCards: async (projectId) => [...cards.values()].filter((c) => c.projectId === projectId),
    getTypeFilter: async (projectId) => typeFilters.get(projectId),
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

  it('AC-042: la cabecera tiene el selector "Modo de color" que aplica data-theme a <html>', async () => {
    render(App, { repository: memoryRepository() });
    const banner = screen.getByRole('banner');
    expect(getCombobox('Modo de color', banner)).toHaveTextContent('Auto');
    expect(await optionLabels('Modo de color', banner)).toEqual(['Auto', 'Claro', 'Oscuro']);
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);

    await chooseOption('Modo de color', 'Oscuro', banner);
    await waitFor(() => expect(document.documentElement.getAttribute('data-theme')).toBe('dark'));
    await chooseOption('Modo de color', 'Claro', banner);
    await waitFor(() => expect(document.documentElement.getAttribute('data-theme')).toBe('light'));
    await chooseOption('Modo de color', 'Auto', banner);
    await waitFor(() => expect(document.documentElement.hasAttribute('data-theme')).toBe(false));
  });

  it('AC-045: la etiqueta "Modo de color" es una <label for> visible, antes del selector', () => {
    render(App, { repository: memoryRepository() });
    const banner = screen.getByRole('banner');
    const select = within(banner).getByRole('combobox', { name: 'Modo de color' });
    const label = within(banner).getByText('Modo de color', { selector: 'label' });
    expect(label).toHaveAttribute('for', select.id);
    expect(label).not.toHaveClass('ds-visually-hidden');
    expect(select).not.toHaveAttribute('aria-label');
    // La etiqueta va antes del selector en el documento (encima, en `.ds-field` en columna).
    expect(label.compareDocumentPosition(select) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('AC-043: el modo se recuerda en localStorage y se recupera al montar la app', async () => {
    localStorage.setItem('kanban-board:color-mode', 'dark');
    try {
      const { unmount } = render(App, { repository: memoryRepository() });
      const banner = screen.getByRole('banner');
      expect(getCombobox('Modo de color', banner)).toHaveTextContent('Oscuro');
      await waitFor(() => expect(document.documentElement.getAttribute('data-theme')).toBe('dark'));

      await chooseOption('Modo de color', 'Claro', banner);
      await waitFor(() => expect(localStorage.getItem('kanban-board:color-mode')).toBe('light'));
      await chooseOption('Modo de color', 'Auto', banner);
      await waitFor(() => expect(localStorage.getItem('kanban-board:color-mode')).toBeNull());
      expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
      unmount();
    } finally {
      localStorage.clear();
      document.documentElement.removeAttribute('data-theme');
    }
  });

  it('abrir un proyecto muestra su tablero y el enlace vuelve a la lista', async () => {
    const project = createProject({ name: 'Mi app' });
    render(App, { repository: memoryRepository([project]) });
    await fireEvent.click(await screen.findByRole('button', { name: 'Mi app' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Mi app' })).toBeInTheDocument();
    expect(window.location.hash).toBe(`#/project/${project.id}`);
    // Columnas `Column` del sistema de diseño: regiones etiquetadas por su encabezado.
    const regionName = (c: HTMLElement) =>
      document.getElementById(c.getAttribute('aria-labelledby') ?? '')?.textContent?.trim();
    expect(screen.getAllByRole('region').map(regionName)).toEqual([
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
    await fireEvent.click(within(enCurso).getByRole('button', { name: 'Añadir tarjeta en En curso' }));
    const dialog = screen.getByRole('dialog', { name: 'Añadir tarjeta' });
    await fireEvent.input(within(dialog).getByLabelText(/Título/), { target: { value: 'Login' } });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Añadir' }));
    await within(enCurso).findByRole('button', { name: 'Archivar Login' });

    await fireEvent.click(within(enCurso).getByRole('button', { name: 'Archivar Login' }));
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
    await fireEvent.click(within(enCurso).getByRole('button', { name: 'Añadir tarjeta en En curso' }));
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

describe('App: "Importar" del estado vacío (AC-034)', () => {
  const miApp = { ...createProject({ name: 'Mi app' }), archived: false };
  const vieja = { ...createProject({ name: 'Vieja' }), archived: true };
  const otra = createProject({ name: 'Otra' });
  const source = {
    projects: [miApp, vieja, otra],
    cards: [
      createCard({ projectId: miApp.id, title: 'A', status: 'en-curso' }),
      createCard({ projectId: vieja.id, title: 'B', status: 'finalizado' }),
    ],
  };

  /** Pulsa "Importar" del estado vacío y elige `content` en el selector. */
  async function importFromEmptyState(content: string) {
    const emptyState = await screen.findByText('Todavía no tienes proyectos');
    const actions = emptyState.parentElement!;
    const input = screen.getByLabelText<HTMLInputElement>('Archivo para importar');
    const click = vi.spyOn(input, 'click').mockImplementation(() => {});
    await fireEvent.click(within(actions).getByRole('button', { name: 'Importar' }));
    expect(click).toHaveBeenCalledOnce();
    const file = new File([content], 'export.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    await fireEvent.change(input);
  }

  it('acepta un export completo y muestra en la lista los proyectos importados', async () => {
    const repository = memoryRepository();
    render(App, { repository });
    await importFromEmptyState(JSON.stringify(buildExport(source, { kind: 'full' })));

    // Con 0 proyectos no se pide confirmación (AC-041, D-014).
    const list = screen.getByRole('region', { name: 'Proyectos' });
    expect(await within(list).findByRole('button', { name: 'Mi app' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(within(list).getByRole('button', { name: 'Otra' })).toBeInTheDocument();
    // El archivado se importa archivado: no aparece en la lista activa.
    expect(within(list).queryByRole('button', { name: 'Vieja' })).toBeNull();
    expect(screen.queryByText('Todavía no tienes proyectos')).toBeNull();
    expect(await repository.listProjects()).toHaveLength(3);
    expect(await repository.listCards()).toHaveLength(2);
  });

  it('acepta un export de proyecto y muestra en la lista el proyecto importado', async () => {
    const repository = memoryRepository();
    render(App, { repository });
    await importFromEmptyState(JSON.stringify(buildExport(source, { kind: 'project', projectId: miApp.id })));

    const list = screen.getByRole('region', { name: 'Proyectos' });
    expect(await within(list).findByRole('button', { name: 'Mi app' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Este proyecto ya existe' })).toBeNull();
    expect(screen.queryByText('Todavía no tienes proyectos')).toBeNull();
    expect(await repository.listProjects()).toEqual([miApp]);
    expect(await repository.listCards()).toEqual([source.cards[0]]);
  });

  describe('error de guardado (AC-035)', () => {
    it('muestra el aviso con "Exportar ahora", que descarga el export completo con el estado en memoria', async () => {
      const existing = createProject({ name: 'Mi app' });
      const quota = new DOMException('Cuota excedida', 'QuotaExceededError');
      const base = memoryRepository([existing]);
      const repository: Repository = {
        ...base,
        saveProject: async () => {
          throw quota;
        },
      };
      render(App, { repository });
      const list = screen.getByRole('region', { name: 'Proyectos' });
      await within(list).findByRole('button', { name: 'Mi app' });
      expect(screen.queryByText('No se pudieron guardar los cambios')).toBeNull();

      // Archivar falla al guardar: el proyecto sigue en la lista activa (no se indica que se guardó).
      await fireEvent.click(screen.getByRole('button', { name: 'Archivar Mi app' }));
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('No se pudieron guardar los cambios');
      expect(within(list).getByRole('button', { name: 'Mi app' })).toBeInTheDocument();

      let downloaded: Blob | undefined;
      const createObjectURL = vi.fn((blob: Blob) => {
        downloaded = blob;
        return 'blob:export';
      });
      const revokeObjectURL = vi.fn();
      const original = { createObjectURL: URL.createObjectURL, revokeObjectURL: URL.revokeObjectURL };
      Object.assign(URL, { createObjectURL, revokeObjectURL });
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      try {
        await fireEvent.click(within(alert).getByRole('button', { name: 'Exportar ahora' }));
        expect(click).toHaveBeenCalledOnce();
        const anchor = click.mock.contexts[0] as HTMLAnchorElement;
        expect(anchor.download).toMatch(/^kanban-export-.*\.json$/);
        const data = JSON.parse(await (downloaded as Blob).text());
        expect(data).toMatchObject({ kind: 'full', projects: [{ id: existing.id, name: 'Mi app', archived: false }], cards: [] });
      } finally {
        click.mockRestore();
        Object.assign(URL, original);
      }
    });

    it('sin fallos de guardado no hay aviso', async () => {
      render(App, { repository: memoryRepository() });
      await fireEvent.click(screen.getByRole('button', { name: 'Crear proyecto' }));
      const dialog = screen.getByRole('dialog', { name: 'Crear proyecto' });
      await fireEvent.input(within(dialog).getByLabelText(/^Nombre/), { target: { value: 'Mi app' } });
      await fireEvent.click(within(dialog).getByRole('button', { name: 'Crear' }));
      expect(await screen.findByRole('button', { name: 'Mi app' })).toBeInTheDocument();
      expect(screen.queryByText('No se pudieron guardar los cambios')).toBeNull();
    });
  });

  describe('sin IndexedDB (AC-037)', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('muestra un aviso permanente y permite crear proyectos en memoria', async () => {
      vi.stubGlobal('indexedDB', undefined);
      render(App);
      const warning = await screen.findByRole('alert');
      expect(warning).toHaveTextContent('Tus datos no se conservarán al cerrar');

      await fireEvent.click(screen.getByRole('button', { name: 'Crear proyecto' }));
      const dialog = screen.getByRole('dialog', { name: 'Crear proyecto' });
      await fireEvent.input(within(dialog).getByLabelText(/^Nombre/), { target: { value: 'Mi app' } });
      await fireEvent.click(within(dialog).getByRole('button', { name: 'Crear' }));
      expect(await screen.findByRole('button', { name: 'Mi app' })).toBeInTheDocument();

      // El aviso sigue visible y no hay error de guardado.
      expect(screen.getByText('Tus datos no se conservarán al cerrar')).toBeInTheDocument();
      expect(screen.queryByText('No se pudieron guardar los cambios')).toBeNull();
    });

    it('con IndexedDB disponible no hay aviso', async () => {
      render(App);
      expect(await screen.findByRole('button', { name: 'Crear proyecto' })).toBeInTheDocument();
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(screen.queryByText('Tus datos no se conservarán al cerrar')).toBeNull();
    });
  });
});
