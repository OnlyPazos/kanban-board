import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import ProjectList from './ProjectList.svelte';
import { createProject } from '../domain';

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
});
