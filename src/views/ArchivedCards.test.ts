import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import ArchivedCards from './ArchivedCards.svelte';
import { createCard, createProject, type Card } from '../domain';

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

const project = createProject({ name: 'Mi app' });
const archivedCard: Card = {
  ...createCard({ projectId: project.id, title: 'Login', status: 'en-curso' }, new Date('2026-10-10T10:00:00.000Z')),
  type: 'arreglo',
  description: 'Primera línea\nSegunda línea',
  priority: 'alta',
  archived: true,
};

describe('ArchivedCards (WI-AC-021)', () => {
  it('muestra solo las tarjetas archivadas del proyecto, con todos sus campos (AC-021)', () => {
    const active = createCard({ projectId: project.id, title: 'Activa', status: 'en-curso' });
    const other = { ...createCard({ projectId: 'otro', title: 'De otro proyecto', status: 'en-curso' }), archived: true };
    render(ArchivedCards, { project, cards: [active, archivedCard, other] });

    expect(screen.getByRole('heading', { level: 1, name: 'Tarjetas archivadas' })).toBeInTheDocument();
    expect(screen.getByText('Mi app')).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(1);
    const item = items[0];
    expect(item).toHaveAccessibleName('Login');
    expect(within(item).getByRole('heading', { level: 3, name: 'Login' })).toBeInTheDocument();
    expect(item).toHaveTextContent('Arreglo');
    expect(item).toHaveTextContent('Alta');
    expect(item).toHaveTextContent('Primera línea');
    expect(within(item).getByTestId('archived-card-status')).toHaveTextContent('En curso');
    expect(item.querySelector(`time[datetime="${archivedCard.createdAt}"]`)).not.toBeNull();
    expect(screen.queryByText('Activa')).not.toBeInTheDocument();
    expect(screen.queryByText('De otro proyecto')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /volver al tablero/i })).toHaveAttribute('href', `#/project/${project.id}`);
  });

  it('sin tarjetas archivadas muestra un aviso vacío', () => {
    render(ArchivedCards, { project, cards: [] });
    expect(screen.getByText('No hay tarjetas archivadas en este proyecto.')).toBeInTheDocument();
  });

  it('"Restaurar" avisa con la tarjeta (AC-022)', async () => {
    const onrestorecard = vi.fn();
    render(ArchivedCards, { project, cards: [archivedCard], onrestorecard });
    await fireEvent.click(screen.getByRole('button', { name: 'Restaurar Login' }));
    expect(onrestorecard).toHaveBeenCalledExactlyOnceWith(archivedCard);
  });

  it('"Borrar definitivamente" pide confirmación; al cancelar no borra (AC-023)', async () => {
    const ondeletecard = vi.fn();
    render(ArchivedCards, { project, cards: [archivedCard], ondeletecard });
    await fireEvent.click(screen.getByRole('button', { name: 'Borrar definitivamente Login' }));

    const dialog = screen.getByRole('dialog', { name: '¿Borrar definitivamente la tarjeta?' });
    expect(dialog).toHaveTextContent('«Login»');
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(ondeletecard).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('al confirmar el borrado definitivo avisa con la tarjeta y cierra el diálogo (AC-023)', async () => {
    const ondeletecard = vi.fn(async () => {});
    render(ArchivedCards, { project, cards: [archivedCard], ondeletecard });
    await fireEvent.click(screen.getByRole('button', { name: 'Borrar definitivamente Login' }));
    const dialog = screen.getByRole('dialog', { name: '¿Borrar definitivamente la tarjeta?' });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Borrar definitivamente' }));
    expect(ondeletecard).toHaveBeenCalledExactlyOnceWith(archivedCard);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
