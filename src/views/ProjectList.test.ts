import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import ProjectList from './ProjectList.svelte';

describe('ProjectList', () => {
  it('sin proyectos muestra el estado vacío con "Crear proyecto" e "Importar"', () => {
    render(ProjectList);
    expect(screen.getByRole('button', { name: 'Crear proyecto' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Importar' })).toBeVisible();
  });

  it('avisa al pulsar los botones del estado vacío', async () => {
    const oncreate = vi.fn();
    const onimport = vi.fn();
    render(ProjectList, { oncreate, onimport });
    await fireEvent.click(screen.getByRole('button', { name: 'Crear proyecto' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Importar' }));
    expect(oncreate).toHaveBeenCalledOnce();
    expect(onimport).toHaveBeenCalledOnce();
  });
});
