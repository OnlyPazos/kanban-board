import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import ProjectList from './ProjectList.svelte';
import { createCard, createProject } from '../domain';

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

  it('con proyectos los lista con nombre y descripción y mantiene "Crear proyecto"', () => {
    const projects = [
      createProject({ name: 'Mi app', description: 'Demo' }),
      createProject({ name: 'Otra' }),
    ];
    render(ProjectList, { projects });
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Mi app' })).toBeInTheDocument();
    expect(screen.getByText('Demo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear proyecto' })).toBeInTheDocument();
    expect(screen.queryByText('Todavía no tienes proyectos')).not.toBeInTheDocument();
  });

  it('cada proyecto tiene "Editar" que avisa con ese proyecto aunque los nombres coincidan', async () => {
    const onedit = vi.fn();
    const a = createProject({ name: 'Duplicado' });
    const b = createProject({ name: 'Duplicado' });
    render(ProjectList, { projects: [a, b], onedit });
    const buttons = screen.getAllByRole('button', { name: 'Editar Duplicado' });
    expect(buttons).toHaveLength(2);
    await fireEvent.click(buttons[1]);
    expect(onedit).toHaveBeenCalledExactlyOnceWith(b);
  });

  it('abrir un proyecto (título o tarjeta) avisa con ese proyecto; "Editar" no lo abre', async () => {
    const onopen = vi.fn();
    const onedit = vi.fn();
    const a = createProject({ name: 'A' });
    const b = createProject({ name: 'B' });
    render(ProjectList, { projects: [a, b], onopen, onedit });
    await fireEvent.click(screen.getByRole('button', { name: 'B' }));
    expect(onopen).toHaveBeenCalledExactlyOnceWith(b);
    await fireEvent.click(screen.getByRole('button', { name: 'Editar A' }));
    expect(onedit).toHaveBeenCalledExactlyOnceWith(a);
    expect(onopen).toHaveBeenCalledOnce();
  });

  it('muestra el recuento de tarjetas no archivadas por estado en el orden de las columnas (AC-008)', () => {
    const a = createProject({ name: 'A' });
    const b = createProject({ name: 'B' });
    const cards = [
      createCard({ projectId: a.id, title: 'T1', status: 'sin-empezar' }),
      createCard({ projectId: a.id, title: 'T2', status: 'sin-empezar' }),
      createCard({ projectId: a.id, title: 'T3', status: 'en-curso' }),
      { ...createCard({ projectId: a.id, title: 'T4', status: 'en-pausa' }), archived: true },
    ];
    render(ProjectList, { projects: [a, b], cards });
    const [itemA, itemB] = screen.getAllByRole('listitem');
    const read = (item: HTMLElement) =>
      within(item)
        .getAllByRole('term')
        .map((term) => `${term.textContent}=${term.nextElementSibling?.textContent}`);
    expect(read(itemA)).toEqual(['Sin empezar=2', 'En curso=1', 'En pausa=0', 'Finalizado=0']);
    expect(read(itemB)).toEqual(['Sin empezar=0', 'En curso=0', 'En pausa=0', 'Finalizado=0']);
  });
});

describe('ProjectList · archivo de proyectos (WI-AC-024)', () => {
  it('cada proyecto tiene "Archivar" que avisa con ese proyecto sin abrirlo ni pedir confirmación', async () => {
    const onarchive = vi.fn();
    const onopen = vi.fn();
    const a = createProject({ name: 'A' });
    const b = createProject({ name: 'B' });
    render(ProjectList, { projects: [a, b], onarchive, onopen });
    await fireEvent.click(screen.getByRole('button', { name: 'Archivar B' }));
    expect(onarchive).toHaveBeenCalledExactlyOnceWith(b);
    expect(onopen).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('enlaza a "Proyectos archivados" (también sin proyectos) y no ofrece borrado definitivo (AC-027)', () => {
    const { unmount } = render(ProjectList);
    expect(screen.getByRole('link', { name: 'Proyectos archivados' })).toHaveAttribute('href', '#/archived');
    unmount();
    render(ProjectList, { projects: [createProject({ name: 'A' })] });
    expect(screen.getByRole('link', { name: 'Proyectos archivados' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /borrar|eliminar/i })).not.toBeInTheDocument();
  });
});
