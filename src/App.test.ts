import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import App from './App.svelte';

describe('App', () => {
  it('renderiza la cabecera común y la lista de proyectos vacía', () => {
    render(App);
    expect(screen.getByRole('banner')).toHaveTextContent('Kanban de proyectos');
    expect(screen.getByRole('heading', { name: 'Proyectos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear proyecto' })).toBeInTheDocument();
  });
});
