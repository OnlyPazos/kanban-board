import { expect, test, type FileChooser, type Page } from '@playwright/test';

async function createProject(page: Page, name: string) {
  await page.getByRole('button', { name: 'Crear proyecto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  await dialog.getByLabel('Nombre').fill(name);
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog).toBeHidden();
}

async function addCard(page: Page, column: string, title: string) {
  const region = page.getByRole('region', { name: column });
  await region.getByRole('button', { name: 'Añadir tarjeta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Añadir tarjeta' });
  await dialog.getByLabel('Título').fill(title);
  await dialog.getByRole('button', { name: 'Añadir' }).click();
  await expect(dialog).toBeHidden();
  await expect(region.getByRole('listitem', { name: title })).toHaveCount(1);
}

const projectList = (page: Page) => page.getByRole('region', { name: 'Proyectos', exact: true });

async function openProject(page: Page, name: string) {
  await projectList(page).getByRole('button', { name, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
}

async function backToList(page: Page) {
  await page.getByRole('link', { name: /volver a proyectos/i }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Proyectos' })).toBeVisible();
}

type Row = Record<string, unknown> & { id: string };

/** Lee un store de IndexedDB, ordenado por id. */
async function stored(page: Page, store: 'projects' | 'cards'): Promise<Row[]> {
  const rows = await page.evaluate(
    (name) =>
      new Promise<Row[]>((resolve, reject) => {
        const open = indexedDB.open('kanban-board');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const req = db.transaction(name).objectStore(name).getAll();
          req.onsuccess = () => {
            db.close();
            resolve(req.result as Row[]);
          };
          req.onerror = () => reject(req.error);
        };
      }),
    store,
  );
  return rows.sort((a, b) => a.id.localeCompare(b.id));
}

async function snapshot(page: Page) {
  return { projects: await stored(page, 'projects'), cards: await stored(page, 'cards') };
}

type ExportLike = { formatVersion: number; kind: 'full' | 'project'; exportedAt: string; projects: Row[]; cards: Row[] };

/** Archivo con el formato de export a partir de los datos guardados (mismo contenido que "Exportar"). */
function exportOf(data: { projects: Row[]; cards: Row[] }, kind: 'full' | 'project'): ExportLike {
  return { formatVersion: 1, kind, exportedAt: new Date().toISOString(), ...data };
}

type FilePayload = Extract<Parameters<FileChooser['setFiles']>[0], { buffer: unknown }>;
// El proyecto no incluye los tipos de Node: se toma `Buffer` del entorno de Playwright.
const NodeBuffer = (globalThis as unknown as { Buffer: { from(text: string, encoding: 'utf-8'): FilePayload['buffer'] } })
  .Buffer;

/** Pulsa "Importar" y elige un archivo con ese contenido. */
async function importContent(page: Page, content: string) {
  const chooserPromise = page.waitForEvent('filechooser');
  await projectList(page).getByRole('button', { name: 'Importar' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: 'import.json', mimeType: 'application/json', buffer: NodeBuffer.from(content, 'utf-8') });
}

test('AC-033: un archivo no válido muestra el motivo en español y no modifica ningún dato', async ({ page }) => {
  await page.goto('/');
  await createProject(page, 'Otra');
  await createProject(page, 'Mi app');
  await openProject(page, 'Mi app');
  await addCard(page, 'Sin empezar', 'A');
  await addCard(page, 'En curso', 'B');
  await backToList(page);
  const before = await snapshot(page);
  expect(before.cards).toHaveLength(2);
  const miApp = before.projects.find((p) => p.name === 'Mi app')!;
  const fullFile = exportOf(before, 'full');
  const projectFile = exportOf({ projects: [miApp], cards: before.cards.filter((c) => c.projectId === miApp.id) }, 'project');

  const withCards = (file: ExportLike, patch: Record<string, unknown>): string =>
    JSON.stringify({ ...file, cards: file.cards.map((c, i) => (i === 0 ? { ...c, ...patch } : c)) });

  const cases: [string, string, string][] = [
    ['JSON no válido', '{"formatVersion": 1, "kind": "full",', 'El archivo no es un JSON válido.'],
    [
      'versión de formato desconocida',
      JSON.stringify({ ...fullFile, formatVersion: 99 }),
      'El archivo tiene una versión de formato desconocida.',
    ],
    [
      'export completo con una tarjeta sin título',
      withCards(fullFile, { title: undefined }),
      'La estructura del archivo no es válida: la tarjeta 1 no tiene título.',
    ],
    [
      'export completo con un estado inexistente',
      withCards(fullFile, { status: 'bloqueada' }),
      'La estructura del archivo no es válida: la tarjeta 1 tiene un estado inexistente.',
    ],
    [
      'export de proyecto con una tarjeta de un proyecto que no está en el archivo',
      withCards(projectFile, { projectId: 'otro' }),
      'La estructura del archivo no es válida: la tarjeta 1 pertenece a un proyecto que no está en el archivo.',
    ],
  ];

  const error = page.getByRole('dialog', { name: 'No se pudo importar el archivo' });
  for (const [label, content, message] of cases) {
    await test.step(label, async () => {
      await importContent(page, content);
      await expect(error).toBeVisible();
      await expect(error).toContainText(message);
      await expect(page.getByRole('dialog', { name: '¿Importar y reemplazar todos tus datos?' })).toHaveCount(0);
      await expect(page.getByRole('dialog', { name: 'Este proyecto ya existe' })).toHaveCount(0);
      await error.getByRole('button', { name: 'Aceptar' }).click();
      await expect(error).toBeHidden();
      expect(await snapshot(page)).toEqual(before);
    });
  }

  // Tras recargar, los datos siguen intactos.
  await page.reload();
  await expect(projectList(page).getByRole('button', { name: 'Mi app', exact: true })).toBeVisible();
  await expect(projectList(page).getByRole('button', { name: 'Otra', exact: true })).toBeVisible();
  expect(await snapshot(page)).toEqual(before);
});
