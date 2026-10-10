import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import Board from './Board.svelte';
import { CARD_STATUSES, createProject } from '../domain';

describe('Board', () => {
  it('muestra exactamente 4 columnas en orden: Sin empezar, En curso, En pausa, Finalizado', () => {
    render(Board, { project: createProject({ name: 'Mi app' }) });
    const columns = screen.getAllByRole('region');
    expect(columns.map((c) => c.getAttribute('aria-label'))).toEqual([
      'Sin empezar',
      'En curso',
      'En pausa',
      'Finalizado',
    ]);
    expect(columns.map((c) => c.dataset.status)).toEqual([...CARD_STATUSES]);
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual(['Sin empezar', 'En curso', 'En pausa', 'Finalizado']);
  });

  it('la cabecera muestra el nombre del proyecto y un enlace para volver a la lista', () => {
    render(Board, { project: createProject({ name: 'Mi app' }) });
    expect(screen.getByRole('heading', { level: 1, name: 'Mi app' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /volver a proyectos/i })).toHaveAttribute('href', '#/');
  });

  it('refleja el nombre actualizado del proyecto', async () => {
    const project = createProject({ name: 'Mi app' });
    const { rerender } = render(Board, { project });
    await rerender({ project: { ...project, name: 'Renombrada' } });
    expect(screen.getByRole('heading', { level: 1, name: 'Renombrada' })).toBeInTheDocument();
    expect(screen.queryByText('Mi app')).not.toBeInTheDocument();
  });

  it('"Editar proyecto" avisa con el proyecto', async () => {
    const onedit = vi.fn();
    const project = createProject({ name: 'Mi app' });
    render(Board, { project, onedit });
    const header = screen.getByRole('heading', { level: 1 }).parentElement!;
    await fireEvent.click(within(header).getByRole('button', { name: 'Editar proyecto' }));
    expect(onedit).toHaveBeenCalledExactlyOnceWith(project);
  });
});
