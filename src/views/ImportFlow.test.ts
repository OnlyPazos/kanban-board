import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import ImportFlow from './ImportFlow.svelte';
import { buildExport, createCard, createProject } from '../domain';

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

const project = { ...createProject({ name: 'Mi app' }), archived: true };
const source = {
  projects: [project, createProject({ name: 'Otra' })],
  cards: [createCard({ projectId: project.id, title: 'A', status: 'en-curso' })],
};

/** Simula elegir un archivo en el selector. */
async function chooseFile(content: string) {
  const input = screen.getByLabelText<HTMLInputElement>('Archivo para importar');
  const file = new File([content], 'export.json', { type: 'application/json' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  await fireEvent.change(input);
}

describe('ImportFlow (WI-AC-030)', () => {
  it('el selector solo acepta JSON', () => {
    render(ImportFlow);
    const input = screen.getByLabelText('Archivo para importar');
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('accept', '.json,application/json');
  });

  it('start() abre el selector de archivos', () => {
    const { component } = render(ImportFlow);
    const input = screen.getByLabelText<HTMLInputElement>('Archivo para importar');
    const click = vi.spyOn(input, 'click').mockImplementation(() => {});
    component.start();
    expect(click).toHaveBeenCalledOnce();
  });

  it('export completo: pide confirmación con N; cancelar no avisa (AC-030)', async () => {
    const onreplaceall = vi.fn();
    render(ImportFlow, { projectCount: 3, onreplaceall });
    await chooseFile(JSON.stringify(buildExport(source, { kind: 'full' })));

    const dialog = await screen.findByRole('dialog', { name: '¿Importar y reemplazar todos tus datos?' });
    expect(dialog).toHaveTextContent('Se borrarán tus 3 proyectos actuales');
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onreplaceall).not.toHaveBeenCalled();
  });

  it('export completo: al confirmar avisa con el contenido del archivo tal cual (AC-030)', async () => {
    const onreplaceall = vi.fn();
    render(ImportFlow, { projectCount: 1, onreplaceall });
    const file = buildExport(source, { kind: 'full' });
    await chooseFile(JSON.stringify(file));

    const dialog = await screen.findByRole('dialog', { name: '¿Importar y reemplazar todos tus datos?' });
    expect(dialog).toHaveTextContent('Se borrará tu 1 proyecto actual');
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Reemplazar' }));
    await waitFor(() => expect(onreplaceall).toHaveBeenCalledExactlyOnceWith(file));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('archivo no válido: muestra un error y no avisa', async () => {
    const onreplaceall = vi.fn();
    render(ImportFlow, { projectCount: 1, onreplaceall });
    await chooseFile('{no es json');

    const dialog = await screen.findByRole('dialog', { name: 'No se pudo importar el archivo' });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Aceptar' }));
    expect(onreplaceall).not.toHaveBeenCalled();
  });
});
