import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { trackUnhandledRejections } from './unhandled-rejections';
import EditCardDialog from './EditCardDialog.svelte';
import { chooseOption, getCombobox, optionLabels } from './choose-option';
import { createCard } from '../domain';

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

const makeCard = () => ({
  ...createCard({ projectId: 'p1', title: 'Login', status: 'sin-empezar' }, new Date('2026-10-10T10:00:00.000Z')),
  updatedAt: '2026-10-11T12:30:00.000Z',
  description: 'Demo',
  priority: 'media' as const,
});

describe('EditCardDialog', () => {
  it('parte de los valores actuales de la tarjeta', () => {
    render(EditCardDialog, { card: makeCard(), open: true, onsave: vi.fn() });
    expect((screen.getByLabelText(/^Título/) as HTMLInputElement).value).toBe('Login');
    expect(getCombobox(/^Tipo/)).toHaveTextContent('Novedad');
    expect(getCombobox(/^Estado/)).toHaveTextContent('Sin empezar');
    expect((screen.getByLabelText(/^Descripción/) as HTMLTextAreaElement).value).toBe('Demo');
    expect(getCombobox(/^Prioridad/)).toHaveTextContent('Media');
  });

  it('ofrece los 4 tipos, los 4 estados y las prioridades Alta, Media, Baja y Sin prioridad', async () => {
    render(EditCardDialog, { card: makeCard(), open: true, onsave: vi.fn() });
    expect(await optionLabels(/^Tipo/)).toEqual(['Novedad', 'Mejora', 'Arreglo', 'Técnico']);
    expect(await optionLabels(/^Estado/)).toEqual(['Sin empezar', 'En curso', 'En pausa', 'Finalizado']);
    expect(await optionLabels(/^Prioridad/)).toEqual(['Alta', 'Media', 'Baja', 'Sin prioridad']);
  });

  it('muestra las fechas de creación y modificación en solo lectura (no son campos editables)', () => {
    const card = makeCard();
    render(EditCardDialog, { card, open: true, onsave: vi.fn() });
    expect(screen.getByTestId('card-created-at')).toHaveAttribute('datetime', card.createdAt);
    expect(screen.getByTestId('card-updated-at')).toHaveAttribute('datetime', card.updatedAt);
    expect(screen.getByText('Creada')).toBeInTheDocument();
    expect(screen.getByText('Última modificación')).toBeInTheDocument();
    // Solo hay 5 controles editables: título y descripción, más los combobox tipo, estado y prioridad.
    expect(document.querySelectorAll('form input, form select, form textarea')).toHaveLength(2);
    expect(screen.getAllByRole('combobox')).toHaveLength(3);
  });

  it('guarda todos los campos con el id de la tarjeta; "Sin prioridad" se guarda como null', async () => {
    const card = makeCard();
    const onsave = vi.fn().mockResolvedValue(undefined);
    render(EditCardDialog, { card, open: true, onsave });

    await fireEvent.input(screen.getByLabelText(/^Título/), { target: { value: 'Login 2' } });
    await chooseOption(/^Tipo/, 'Arreglo');
    await chooseOption(/^Estado/, 'En pausa');
    await fireEvent.input(screen.getByLabelText(/^Descripción/), { target: { value: 'línea 1\nlínea 2' } });
    await chooseOption(/^Prioridad/, 'Sin prioridad');
    await fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() =>
      expect(onsave).toHaveBeenCalledExactlyOnceWith(card.id, {
        title: 'Login 2',
        type: 'arreglo',
        status: 'en-pausa',
        description: 'línea 1\nlínea 2',
        priority: null,
      }),
    );
  });

  it('con título vacío muestra el error junto al campo y no guarda', async () => {
    const onsave = vi.fn();
    render(EditCardDialog, { card: makeCard(), open: true, onsave });
    await fireEvent.input(screen.getByLabelText(/^Título/), { target: { value: '   ' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText('El título es obligatorio.')).toBeInTheDocument();
    expect(onsave).not.toHaveBeenCalled();
  });

  it('el campo título no recorta el texto (sin maxlength) para que se valide completo', () => {
    render(EditCardDialog, { card: makeCard(), open: true, onsave: vi.fn() });
    expect(screen.getByLabelText(/^Título/)).not.toHaveAttribute('maxlength');
  });

  it('con más de 120 caracteres muestra el error junto al campo y no guarda', async () => {
    const onsave = vi.fn();
    render(EditCardDialog, { card: makeCard(), open: true, onsave });

    const title = screen.getByLabelText(/^Título/);
    await fireEvent.input(title, { target: { value: 'a'.repeat(121) } });
    await fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    const message = 'El título no puede superar 120 caracteres.';
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title).toHaveAccessibleDescription(message);
    expect(onsave).not.toHaveBeenCalled();
  });
});

describe('EditCardDialog · cambios de otra pestaña (AC-038)', () => {
  it('si la tarjeta cambia mientras el diálogo está abierto, no pisa lo que se está escribiendo', async () => {
    const card = makeCard();
    const onsave = vi.fn();
    const { rerender } = render(EditCardDialog, { card, open: true, onsave });
    const title = screen.getByLabelText(/^Título/) as HTMLInputElement;
    await fireEvent.input(title, { target: { value: 'Título B' } });

    await rerender({ card: { ...card, title: 'Título A', updatedAt: '2026-10-11T13:00:00.000Z' }, open: true, onsave });
    expect(title.value).toBe('Título B');

    await fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(onsave).toHaveBeenCalledWith(card.id, expect.objectContaining({ title: 'Título B' })));
  });
});

describe('EditCardDialog · fallo al guardar (AC-044)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('si onsave rechaza, el diálogo sigue abierto con lo escrito, el botón deja de cargar y no queda ningún rechazo sin capturar', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const unhandled = trackUnhandledRejections();
    const error = new DOMException('Cuota excedida', 'QuotaExceededError');
    const onsave = vi.fn().mockRejectedValue(error);
    render(EditCardDialog, { card: makeCard(), open: true, onsave });

    const field = screen.getByLabelText(/^Título/) as HTMLInputElement;
    await fireEvent.input(field, { target: { value: 'Login 2' } });
    const submit = screen.getByRole('button', { name: 'Guardar cambios' });
    await fireEvent.click(submit);

    await waitFor(() => expect(onsave).toHaveBeenCalledOnce());
    await waitFor(() => expect(submit).not.toHaveAttribute('aria-busy'));
    await unhandled.flush();
    unhandled.stop();

    expect(unhandled.reasons).toEqual([]);
    expect(screen.getByRole('dialog', { name: 'Editar tarjeta' })).toBeInTheDocument();
    expect(field.value).toBe('Login 2');
    expect(consoleError).toHaveBeenCalledWith(expect.any(String), error);
  });
});
