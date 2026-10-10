import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
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
