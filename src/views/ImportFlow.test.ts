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

describe('ImportFlow: export completo sin proyectos (WI-AC-041, AC-041)', () => {
  it('con 0 proyectos no pide confirmación y avisa directamente con el contenido del archivo', async () => {
    const onreplaceall = vi.fn();
    render(ImportFlow, { projectCount: 0, onreplaceall });
    const file = buildExport(source, { kind: 'full' });
    await chooseFile(JSON.stringify(file));

    await waitFor(() => expect(onreplaceall).toHaveBeenCalledExactlyOnceWith(file));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('con 0 proyectos, si el guardado falla, muestra un error', async () => {
    const onreplaceall = vi.fn().mockRejectedValue(new Error('QuotaExceededError'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(ImportFlow, { projectCount: 0, onreplaceall });
    await chooseFile(JSON.stringify(buildExport(source, { kind: 'full' })));

    await screen.findByRole('dialog', { name: 'No se pudo importar el archivo' });
    expect(screen.queryByRole('dialog', { name: '¿Importar y reemplazar todos tus datos?' })).not.toBeInTheDocument();
  });

  it('con 1 proyecto (aunque esté archivado) sí pide confirmación', async () => {
    const onreplaceall = vi.fn();
    render(ImportFlow, { projectCount: 1, onreplaceall });
    await chooseFile(JSON.stringify(buildExport(source, { kind: 'full' })));

    await screen.findByRole('dialog', { name: '¿Importar y reemplazar todos tus datos?' });
    expect(onreplaceall).not.toHaveBeenCalled();
  });
});

describe('ImportFlow: export de proyecto (WI-AC-031)', () => {
  const projectFile = () => buildExport(source, { kind: 'project', projectId: project.id });
  const conflictName = 'Este proyecto ya existe';

  it('id nuevo: lo importa directamente, sin diálogo, con sus tarjetas tal cual (AC-031)', async () => {
    const onimportproject = vi.fn();
    render(ImportFlow, { projectCount: 1, projectIds: ['otro-id'], onimportproject });
    const file = projectFile();
    await chooseFile(JSON.stringify(file));

    await waitFor(() => expect(onimportproject).toHaveBeenCalledExactlyOnceWith(file.projects[0], file.cards));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('id existente: ofrece "Reemplazar" e "Importar como copia"; cancelar no avisa (AC-032)', async () => {
    const onimportproject = vi.fn();
    render(ImportFlow, { projectCount: 1, projectIds: [project.id], onimportproject });
    await chooseFile(JSON.stringify(projectFile()));

    const dialog = await screen.findByRole('dialog', { name: conflictName });
    expect(within(dialog).getByRole('button', { name: 'Reemplazar' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Importar como copia' })).toBeInTheDocument();
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onimportproject).not.toHaveBeenCalled();
  });

  it('id existente: cerrar con × no avisa (AC-032)', async () => {
    const onimportproject = vi.fn();
    render(ImportFlow, { projectCount: 1, projectIds: [project.id], onimportproject });
    await chooseFile(JSON.stringify(projectFile()));

    const dialog = await screen.findByRole('dialog', { name: conflictName });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onimportproject).not.toHaveBeenCalled();
  });

  it('"Reemplazar" avisa con el proyecto y las tarjetas del archivo tal cual (AC-032)', async () => {
    const onimportproject = vi.fn();
    render(ImportFlow, { projectCount: 1, projectIds: [project.id], onimportproject });
    const file = projectFile();
    await chooseFile(JSON.stringify(file));

    const dialog = await screen.findByRole('dialog', { name: conflictName });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Reemplazar' }));
    await waitFor(() => expect(onimportproject).toHaveBeenCalledExactlyOnceWith(file.projects[0], file.cards));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('"Importar como copia" avisa con ids nuevos, projectId remapeado y nombre "(copia)" (AC-032)', async () => {
    const onimportproject = vi.fn();
    render(ImportFlow, { projectCount: 1, projectIds: [project.id], onimportproject });
    const file = projectFile();
    await chooseFile(JSON.stringify(file));

    const dialog = await screen.findByRole('dialog', { name: conflictName });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Importar como copia' }));
    await waitFor(() => expect(onimportproject).toHaveBeenCalledOnce());
    const [copy, cards] = onimportproject.mock.calls[0]!;
    expect(copy).toEqual({ ...file.projects[0], id: expect.any(String), name: 'Mi app (copia)' });
    expect(copy.id).not.toBe(project.id);
    expect(cards).toHaveLength(file.cards.length);
    cards.forEach((card: (typeof file.cards)[number], i: number) => {
      expect(card).toEqual({ ...file.cards[i], id: expect.any(String), projectId: copy.id });
      expect(card.id).not.toBe(file.cards[i]!.id);
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('si el guardado falla, muestra un error', async () => {
    const onimportproject = vi.fn().mockRejectedValue(new Error('QuotaExceededError'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(ImportFlow, { projectIds: [], onimportproject });
    await chooseFile(JSON.stringify(projectFile()));

    await screen.findByRole('dialog', { name: 'No se pudo importar el archivo' });
  });
});

describe('ImportFlow: archivo no válido (WI-AC-033, AC-033)', () => {
  const errorName = 'No se pudo importar el archivo';
  const full = () => buildExport(source, { kind: 'full' });

  it.each([
    ['JSON no válido', '{no es json', 'El archivo no es un JSON válido.'],
    ['versión desconocida', JSON.stringify({ ...full(), formatVersion: 2 }), 'El archivo tiene una versión de formato desconocida.'],
    [
      'tarjeta sin título',
      JSON.stringify({ ...full(), cards: full().cards.map((c) => ({ ...c, title: '' })) }),
      'La estructura del archivo no es válida: la tarjeta 1 no tiene título.',
    ],
    [
      'tarjeta con estado inexistente',
      JSON.stringify({ ...full(), cards: full().cards.map((c) => ({ ...c, status: 'bloqueada' })) }),
      'La estructura del archivo no es válida: la tarjeta 1 tiene un estado inexistente.',
    ],
  ])('%s: muestra el motivo y no avisa de ningún cambio', async (_, content, message) => {
    const onreplaceall = vi.fn();
    const onimportproject = vi.fn();
    render(ImportFlow, { projectCount: 1, projectIds: [], onreplaceall, onimportproject });
    await chooseFile(content);

    const dialog = await screen.findByRole('dialog', { name: errorName });
    expect(dialog).toHaveTextContent(message);
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Aceptar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onreplaceall).not.toHaveBeenCalled();
    expect(onimportproject).not.toHaveBeenCalled();
  });

  it('export de proyecto con 2 proyectos: muestra el motivo y no importa', async () => {
    const onimportproject = vi.fn();
    render(ImportFlow, { projectIds: [], onimportproject });
    const file = buildExport(source, { kind: 'project', projectId: project.id });
    await chooseFile(JSON.stringify({ ...file, projects: source.projects }));

    const dialog = await screen.findByRole('dialog', { name: errorName });
    expect(dialog).toHaveTextContent(
      'La estructura del archivo no es válida: un export de proyecto debe contener exactamente un proyecto.',
    );
    expect(onimportproject).not.toHaveBeenCalled();
  });
});
