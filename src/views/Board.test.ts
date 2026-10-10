import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import Board from './Board.svelte';
import { CARD_STATUSES, createCard, createProject } from '../domain';

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

  it('cada columna tiene "Añadir tarjeta", que avisa con el estado de esa columna', async () => {
    const onaddcard = vi.fn();
    render(Board, { project: createProject({ name: 'Mi app' }), onaddcard });
    const enCurso = screen.getByRole('region', { name: 'En curso' });
    expect(screen.getAllByRole('button', { name: 'Añadir tarjeta' })).toHaveLength(4);
    await fireEvent.click(within(enCurso).getByRole('button', { name: 'Añadir tarjeta' }));
    expect(onaddcard).toHaveBeenCalledExactlyOnceWith('en-curso');
  });

  it('muestra cada tarjeta del proyecto en la columna de su estado', () => {
    const project = createProject({ name: 'Mi app' });
    const login = createCard({ projectId: project.id, title: 'Login', status: 'en-curso' });
    const ajena = createCard({ projectId: 'otro', title: 'Ajena', status: 'en-curso' });
    const archivada = { ...createCard({ projectId: project.id, title: 'Vieja', status: 'en-curso' }), archived: true };
    render(Board, { project, cards: [login, ajena, archivada] });

    const enCurso = screen.getByRole('region', { name: 'En curso' });
    expect(within(enCurso).getAllByRole('listitem')).toHaveLength(1);
    expect(within(enCurso).getByRole('heading', { level: 3, name: 'Login' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Sin empezar' })).queryByRole('listitem')).toBeNull();
    expect(screen.queryByText('Ajena')).not.toBeInTheDocument();
    expect(screen.queryByText('Vieja')).not.toBeInTheDocument();
  });

  it('cada tarjeta muestra su tipo como Badge con un tono distinto por tipo, y la prioridad solo si la tiene', () => {
    const project = createProject({ name: 'Mi app' });
    const base = (title: string) => createCard({ projectId: project.id, title, status: 'sin-empezar' });
    const cards = [
      { ...base('N'), type: 'novedad' as const, priority: 'alta' as const },
      { ...base('M'), type: 'mejora' as const, priority: 'media' as const },
      { ...base('A'), type: 'arreglo' as const, priority: 'baja' as const },
      { ...base('T'), type: 'tecnico' as const, priority: null },
    ];
    render(Board, { project, cards });
    const item = (title: string) =>
      screen.getByRole('heading', { level: 3, name: title }).closest('li') as HTMLElement;
    const badges = (title: string) => [...item(title).querySelectorAll('.ds-badge')];

    const expected = [
      ['N', 'Novedad', 'feature', 'Alta', 'danger'],
      ['M', 'Mejora', 'improvement', 'Media', 'warning'],
      ['A', 'Arreglo', 'bugfix', 'Baja', 'neutral'],
    ] as const;
    for (const [title, typeLabel, typeTone, prioLabel, prioTone] of expected) {
      const [typeBadge, prioBadge] = badges(title);
      expect(typeBadge).toHaveTextContent(typeLabel);
      expect(typeBadge).toHaveClass(`ds-badge--${typeTone}`);
      expect(prioBadge).toHaveTextContent(prioLabel);
      expect(prioBadge).toHaveClass(`ds-badge--${prioTone}`);
    }
    const tecnico = badges('T');
    expect(tecnico).toHaveLength(1);
    expect(tecnico[0]).toHaveTextContent('Técnico');
    expect(tecnico[0]).toHaveClass('ds-badge--technical');
  });

  it('abrir una tarjeta avisa con esa tarjeta', async () => {
    const oneditcard = vi.fn();
    const project = createProject({ name: 'Mi app' });
    const card = createCard({ projectId: project.id, title: 'Login', status: 'en-curso' });
    render(Board, { project, cards: [card], oneditcard });
    await fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(oneditcard).toHaveBeenCalledExactlyOnceWith(card);
  });
});
