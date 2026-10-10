import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import EditProjectDialog from './EditProjectDialog.svelte';
import { createProject } from '../domain';

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

describe('EditProjectDialog', () => {
  it('parte de los valores actuales y guarda los nuevos con el id del proyecto', async () => {
    const project = createProject({ name: 'Mi app', description: 'Demo' });
    const onsave = vi.fn().mockResolvedValue(undefined);
    render(EditProjectDialog, { project, open: true, onsave });

    const name = screen.getByLabelText(/^Nombre/) as HTMLInputElement;
    const description = screen.getByLabelText(/^Descripción/) as HTMLTextAreaElement;
    expect(name.value).toBe('Mi app');
    expect(description.value).toBe('Demo');

    await fireEvent.input(name, { target: { value: 'Mi app 2' } });
    await fireEvent.input(description, { target: { value: 'Nueva' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() =>
      expect(onsave).toHaveBeenCalledExactlyOnceWith(project.id, { name: 'Mi app 2', description: 'Nueva' }),
    );
  });
});
