import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
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

  it('el campo título no admite más de 120 caracteres', () => {
    render(CreateCardDialog, { open: true, status: 'sin-empezar', oncreate: vi.fn() });
    expect(screen.getByLabelText(/^Título/)).toHaveAttribute('maxlength', '120');
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
