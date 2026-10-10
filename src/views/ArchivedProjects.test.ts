import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import ArchivedProjects from './ArchivedProjects.svelte';
import { createCard, createProject, type Project } from '../domain';

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

const archived: Project = { ...createProject({ name: 'Mi app', description: 'Demo' }), archived: true };
const active = createProject({ name: 'Activo' });
const cards = [
  createCard({ projectId: archived.id, title: 'A', status: 'sin-empezar' }),
  createCard({ projectId: archived.id, title: 'B', status: 'en-curso' }),
  createCard({ projectId: archived.id, title: 'C', status: 'finalizado' }),
  { ...createCard({ projectId: archived.id, title: 'D', status: 'en-pausa' }), archived: true },
  createCard({ projectId: active.id, title: 'Otra', status: 'en-curso' }),
];

describe('ArchivedProjects (WI-AC-024)', () => {
  it('muestra solo los proyectos archivados con su total de tarjetas (activas y archivadas)', () => {
    render(ArchivedProjects, { projects: [active, archived], cards });
    expect(screen.getByRole('heading', { level: 1, name: 'Proyectos archivados' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /volver a proyectos/i })).toHaveAttribute('href', '#/');
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveAccessibleName('Mi app');
    expect(items[0]).toHaveTextContent('Demo');
    expect(within(items[0]).getByTestId('archived-project-total')).toHaveTextContent('4 tarjetas');
  });

  it('sin proyectos archivados muestra un mensaje vacío', () => {
    render(ArchivedProjects, { projects: [active], cards });
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByText('No hay proyectos archivados.')).toBeInTheDocument();
  });

  it('"Restaurar" avisa con ese proyecto (AC-025)', async () => {
    const onrestore = vi.fn();
    render(ArchivedProjects, { projects: [archived], cards, onrestore });
    await fireEvent.click(screen.getByRole('button', { name: 'Restaurar Mi app' }));
    expect(onrestore).toHaveBeenCalledExactlyOnceWith(archived);
  });

  it('"Borrar definitivamente" pide confirmación con nombre y total; cancelar no avisa, confirmar sí (AC-027)', async () => {
    const ondelete = vi.fn();
    render(ArchivedProjects, { projects: [archived], cards, ondelete });

    await fireEvent.click(screen.getByRole('button', { name: 'Borrar definitivamente Mi app' }));
    const dialog = screen.getByRole('dialog', { name: '¿Borrar definitivamente el proyecto?' });
    expect(dialog).toHaveTextContent('«Mi app»');
    expect(dialog).toHaveTextContent('4 tarjetas');
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(ondelete).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByRole('button', { name: 'Borrar definitivamente Mi app' }));
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Borrar definitivamente' }));
    await waitFor(() => expect(ondelete).toHaveBeenCalledExactlyOnceWith(archived));
  });
});
