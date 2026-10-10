import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import Board from './Board.svelte';
import { CARD_STATUSES, createCard, createProject, type Card as CardData, type CardStatus, type Priority } from '../domain';

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
  it('AC-014: cada columna muestra sus tarjetas en el orden automático (prioridad y luego createdAt)', () => {
    const project = createProject({ name: 'Mi app' });
    const make = (title: string, priority: 'alta' | 'baja' | null, minute: number, status: 'sin-empezar' | 'en-curso' = 'sin-empezar') => ({
      ...createCard({ projectId: project.id, title, status }, new Date(Date.UTC(2026, 9, 10, 10, minute))),
      priority,
    });
    // Se pasan desordenadas a propósito.
    const cards = [
      make('T4', 'alta', 4),
      make('T1', 'baja', 1),
      make('Otra', null, 0, 'en-curso'),
      make('T2', null, 2),
      make('T3', 'alta', 3),
    ];
    render(Board, { project, cards });
    const titles = (column: string) =>
      within(screen.getByRole('region', { name: column }))
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent);
    expect(titles('Sin empezar')).toEqual(['T3', 'T4', 'T1', 'T2']);
    expect(titles('En curso')).toEqual(['Otra']);
  });
  describe('arrastrar y soltar (WI-AC-015)', () => {
    const project = createProject({ name: 'Mi app' });
    const make = (title: string, status: CardStatus, priority: Priority, minute: number) => ({
      ...createCard({ projectId: project.id, title, status }, new Date(Date.UTC(2026, 9, 10, 10, minute))),
      priority,
    });
    const zone = (column: string) =>
      within(screen.getByRole('region', { name: column })).getByRole('list', { name: column });
    const titles = (column: string) =>
      within(screen.getByRole('region', { name: column }))
        .queryAllByRole('heading', { level: 3 })
        .map((h) => h.textContent);
    const finalize = (column: string, items: CardData[], id: string) =>
      fireEvent(
        zone(column),
        new CustomEvent('finalize', { detail: { items, info: { id, trigger: 'droppedIntoZone', source: 'pointer' } } }),
      );

    it('cada columna es una zona donde soltar, también vacía', () => {
      render(Board, { project });
      for (const column of ['Sin empezar', 'En curso', 'En pausa', 'Finalizado']) {
        expect(zone(column)).toBeInTheDocument();
      }
    });

    it('AC-015: al soltar en otra columna avisa con onmovecard y la coloca según el orden automático', async () => {
      const onmovecard = vi.fn();
      const alta = make('P-Alta', 'en-pausa', 'alta', 1);
      const baja = make('P-Baja', 'en-pausa', 'baja', 2);
      const mover = make('Mover', 'sin-empezar', 'media', 3);
      render(Board, { project, cards: [alta, baja, mover], onmovecard });

      await finalize('Sin empezar', [], mover.id);
      await finalize('En pausa', [alta, baja, mover], mover.id);

      expect(onmovecard).toHaveBeenCalledExactlyOnceWith(mover, 'en-pausa');
      expect(titles('En pausa')).toEqual(['P-Alta', 'Mover', 'P-Baja']);
      expect(titles('Sin empezar')).toEqual([]);
    });

    it('AC-016: al soltar en la misma columna no avisa y se re-aplica el orden automático', async () => {
      const onmovecard = vi.fn();
      const alta = make('T-Alta', 'sin-empezar', 'alta', 1);
      const media = make('T-Media', 'sin-empezar', 'media', 2);
      const baja = make('T-Baja', 'sin-empezar', 'baja', 3);
      render(Board, { project, cards: [alta, media, baja], onmovecard });

      await finalize('Sin empezar', [media, baja, alta], alta.id);

      expect(onmovecard).not.toHaveBeenCalled();
      expect(titles('Sin empezar')).toEqual(['T-Alta', 'T-Media', 'T-Baja']);
    });

    it('si guardar el movimiento falla, la tarjeta vuelve a su columna', async () => {
      const mover = make('Mover', 'sin-empezar', null, 1);
      render(Board, { project, cards: [mover], onmovecard: () => Promise.reject(new Error('QuotaExceededError')) });

      await finalize('Sin empezar', [], mover.id);
      await finalize('En pausa', [mover], mover.id);
      await new Promise((r) => setTimeout(r, 0));

      expect(titles('Sin empezar')).toEqual(['Mover']);
      expect(titles('En pausa')).toEqual([]);
    });
  });

  describe('filtro por tipo', () => {
    function fourTypes() {
      const project = createProject({ name: 'Mi app' });
      const cards = (['novedad', 'mejora', 'arreglo', 'tecnico'] as const).map((type) => ({
        ...createCard({ projectId: project.id, title: `T-${type}`, status: 'sin-empezar' }),
        type,
      }));
      return { project, cards };
    }

    const visibleTitles = () =>
      screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent?.trim());

    it('muestra un Chip por tipo dentro del grupo "Filtrar por tipo", sin seleccionar', () => {
      const { project, cards } = fourTypes();
      render(Board, { project, cards });
      const group = screen.getByRole('group', { name: 'Filtrar por tipo' });
      const chips = within(group).getAllByRole('button');
      expect(chips.map((c) => c.textContent?.replace('✓', '').trim())).toEqual([
        'Novedad',
        'Mejora',
        'Arreglo',
        'Técnico',
      ]);
      for (const chip of chips) expect(chip).toHaveAttribute('aria-pressed', 'false');
      expect(visibleTitles()).toHaveLength(4);
    });

    it('con "Arreglo" seleccionado solo se ven las tarjetas de tipo Arreglo (AC-018)', () => {
      const { project, cards } = fourTypes();
      render(Board, { project, cards, typeFilter: ['arreglo'] });
      const group = screen.getByRole('group', { name: 'Filtrar por tipo' });
      expect(within(group).getByRole('button', { name: /Arreglo/ })).toHaveAttribute('aria-pressed', 'true');
      expect(visibleTitles()).toEqual(['T-arreglo']);
    });

    it('con "Arreglo" y "Técnico" solo se ven esos dos tipos (AC-039)', () => {
      const { project, cards } = fourTypes();
      render(Board, { project, cards, typeFilter: ['arreglo', 'tecnico'] });
      expect(visibleTitles().sort()).toEqual(['T-arreglo', 'T-tecnico']);
    });

    it('pulsar un Chip avisa con la nueva selección y al quitarla vuelven todas', async () => {
      const { project, cards } = fourTypes();
      const ontypefilterchange = vi.fn();
      const { rerender } = render(Board, { project, cards, ontypefilterchange });
      const group = screen.getByRole('group', { name: 'Filtrar por tipo' });

      await fireEvent.click(within(group).getByRole('button', { name: /Técnico/ }));
      expect(ontypefilterchange).toHaveBeenLastCalledWith(['tecnico']);
      await rerender({ typeFilter: ['tecnico'] });
      await fireEvent.click(within(group).getByRole('button', { name: /Arreglo/ }));
      expect(ontypefilterchange).toHaveBeenLastCalledWith(['arreglo', 'tecnico']);
      await rerender({ typeFilter: ['arreglo', 'tecnico'] });
      expect(visibleTitles().sort()).toEqual(['T-arreglo', 'T-tecnico']);

      await fireEvent.click(within(group).getByRole('button', { name: /Arreglo/ }));
      expect(ontypefilterchange).toHaveBeenLastCalledWith(['tecnico']);
      await rerender({ typeFilter: [] });
      expect(visibleTitles()).toHaveLength(4);
    });
  });
});
