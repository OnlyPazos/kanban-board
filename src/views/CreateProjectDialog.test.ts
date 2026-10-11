import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { trackUnhandledRejections } from './unhandled-rejections';
import CreateProjectDialog from './CreateProjectDialog.svelte';

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

describe('CreateProjectDialog', () => {
  it.each([
    ['vacío', '', 'El nombre es obligatorio.'],
    ['solo espacios', '   ', 'El nombre es obligatorio.'],
    ['de 81 caracteres', 'a'.repeat(81), 'El nombre no puede superar 80 caracteres.'],
  ])('con nombre %s muestra el error junto al campo y no crea', async (_caso, value, message) => {
    const oncreate = vi.fn().mockResolvedValue(undefined);
    render(CreateProjectDialog, { open: true, oncreate });

    const name = screen.getByLabelText(/^Nombre/) as HTMLInputElement;
    await fireEvent.input(name, { target: { value } });
    await fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription(message);
    expect(oncreate).not.toHaveBeenCalled();
  });

  it('el campo nombre no admite más de 80 caracteres', () => {
    render(CreateProjectDialog, { open: true, oncreate: vi.fn() });
    expect(screen.getByLabelText(/^Nombre/)).toHaveAttribute('maxlength', '80');
  });

  it('tras corregir el nombre, crea el proyecto', async () => {
    const oncreate = vi.fn().mockResolvedValue(undefined);
    render(CreateProjectDialog, { open: true, oncreate });

    const name = screen.getByLabelText(/^Nombre/) as HTMLInputElement;
    await fireEvent.click(screen.getByRole('button', { name: 'Crear' }));
    expect(await screen.findByText('El nombre es obligatorio.')).toBeInTheDocument();

    await fireEvent.input(name, { target: { value: 'Mi app' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Crear' }));
    await waitFor(() => expect(oncreate).toHaveBeenCalledExactlyOnceWith({ name: 'Mi app', description: '' }));
  });
});

describe('CreateProjectDialog · fallo al guardar (AC-044)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('si oncreate rechaza, el diálogo sigue abierto con lo escrito, el botón deja de cargar y no queda ningún rechazo sin capturar', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const unhandled = trackUnhandledRejections();
    const error = new DOMException('Cuota excedida', 'QuotaExceededError');
    const oncreate = vi.fn().mockRejectedValue(error);
    render(CreateProjectDialog, { open: true, oncreate });

    const field = screen.getByLabelText(/^Nombre/) as HTMLInputElement;
    await fireEvent.input(field, { target: { value: 'Nuevo' } });
    const submit = screen.getByRole('button', { name: 'Crear' });
    await fireEvent.click(submit);

    await waitFor(() => expect(oncreate).toHaveBeenCalledOnce());
    await waitFor(() => expect(submit).not.toHaveAttribute('aria-busy'));
    await unhandled.flush();
    unhandled.stop();

    expect(unhandled.reasons).toEqual([]);
    expect(screen.getByRole('dialog', { name: 'Crear proyecto' })).toBeInTheDocument();
    expect(field.value).toBe('Nuevo');
    expect(consoleError).toHaveBeenCalledWith(expect.any(String), error);
  });
});
