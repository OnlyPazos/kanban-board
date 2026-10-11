import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { trackUnhandledRejections } from './unhandled-rejections';
import CreateCardDialog from './CreateCardDialog.svelte';

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

describe('CreateCardDialog', () => {
  it('indica la columna y crea con el título y el estado de esa columna', async () => {
    const oncreate = vi.fn().mockResolvedValue(undefined);
    render(CreateCardDialog, { open: true, status: 'en-curso', oncreate });

    expect(screen.getByRole('dialog', { name: 'Añadir tarjeta' })).toHaveTextContent('Columna: En curso');
    await fireEvent.input(screen.getByLabelText(/^Título/), { target: { value: 'Login' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Añadir' }));
    await waitFor(() => expect(oncreate).toHaveBeenCalledExactlyOnceWith('Login', 'en-curso'));
  });

  it('con título vacío muestra el error junto al campo y no crea', async () => {
    const oncreate = vi.fn();
    render(CreateCardDialog, { open: true, status: 'sin-empezar', oncreate });

    await fireEvent.input(screen.getByLabelText(/^Título/), { target: { value: '   ' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Añadir' }));
    expect(await screen.findByText('El título es obligatorio.')).toBeInTheDocument();
    expect(oncreate).not.toHaveBeenCalled();
  });

  it('el campo título no recorta el texto (sin maxlength) para que se valide completo', () => {
    render(CreateCardDialog, { open: true, status: 'sin-empezar', oncreate: vi.fn() });
    expect(screen.getByLabelText(/^Título/)).not.toHaveAttribute('maxlength');
  });

  it('con más de 120 caracteres muestra el error junto al campo y no crea', async () => {
    const oncreate = vi.fn();
    render(CreateCardDialog, { open: true, status: 'sin-empezar', oncreate });

    const title = screen.getByLabelText(/^Título/);
    await fireEvent.input(title, { target: { value: 'a'.repeat(121) } });
    await fireEvent.click(screen.getByRole('button', { name: 'Añadir' }));
    const message = 'El título no puede superar 120 caracteres.';
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title).toHaveAccessibleDescription(message);
    expect(oncreate).not.toHaveBeenCalled();
  });
});

describe('CreateCardDialog · fallo al guardar (AC-044)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('si oncreate rechaza, el diálogo sigue abierto con lo escrito, el botón deja de cargar y no queda ningún rechazo sin capturar', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const unhandled = trackUnhandledRejections();
    const error = new DOMException('Cuota excedida', 'QuotaExceededError');
    const oncreate = vi.fn().mockRejectedValue(error);
    render(CreateCardDialog, { open: true, status: 'sin-empezar', oncreate });

    const field = screen.getByLabelText(/^Título/) as HTMLInputElement;
    await fireEvent.input(field, { target: { value: 'Login' } });
    const submit = screen.getByRole('button', { name: 'Añadir' });
    await fireEvent.click(submit);

    await waitFor(() => expect(oncreate).toHaveBeenCalledOnce());
    await waitFor(() => expect(submit).not.toHaveAttribute('aria-busy'));
    await unhandled.flush();
    unhandled.stop();

    expect(unhandled.reasons).toEqual([]);
    expect(screen.getByRole('dialog', { name: 'Añadir tarjeta' })).toBeInTheDocument();
    expect(field.value).toBe('Login');
    expect(consoleError).toHaveBeenCalledWith(expect.any(String), error);
  });
});
