import { expect, test, type Download, type Page } from '@playwright/test';

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

async function archiveCard(page: Page, column: string, title: string) {
  const card = page.getByRole('region', { name: column }).getByRole('listitem', { name: title });
  await card.getByRole('button', { name: 'Archivar' }).click();
  await expect(card).toHaveCount(0);
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

interface ExportJson {
  formatVersion: number;
  kind: string;
  exportedAt: string;
  projects: { id: string; name: string; archived: boolean }[];
  cards: { id: string; projectId: string; title: string; archived: boolean }[];
}

/** Lee y parsea el archivo descargado (sin depender de los tipos de Node). */
async function readDownload(download: Download): Promise<ExportJson> {
  const stream: AsyncIterable<Uint8Array> = await download.createReadStream();
  const decoder = new TextDecoder();
  let text = '';
  for await (const chunk of stream) text += decoder.decode(chunk, { stream: true });
  text += decoder.decode();
  return JSON.parse(text) as ExportJson;
}

/**
 * "Mi app" con A (activa) y B (archivada); "Vieja" (proyecto archivado) con
 * C (activa) y D (archivada); "Otra" con E.
 */
async function setup(page: Page) {
  await page.goto('/');
  await createProject(page, 'Otra');
  await createProject(page, 'Vieja');
  await createProject(page, 'Mi app');

  await openProject(page, 'Mi app');
  await addCard(page, 'Sin empezar', 'A');
  await addCard(page, 'En curso', 'B');
  await archiveCard(page, 'En curso', 'B');
  await backToList(page);

  await openProject(page, 'Vieja');
  await addCard(page, 'Finalizado', 'C');
  await addCard(page, 'En pausa', 'D');
  await archiveCard(page, 'En pausa', 'D');
  await backToList(page);

  await openProject(page, 'Otra');
  await addCard(page, 'En pausa', 'E');
  await backToList(page);

  await projectList(page).getByRole('button', { name: 'Archivar Vieja' }).click();
  await expect(projectList(page).getByRole('button', { name: 'Vieja', exact: true })).toHaveCount(0);
}

test('AC-028: "Exportar todo" descarga un JSON con versión de formato y todos los proyectos y tarjetas, archivados incluidos', async ({
  page,
}) => {
  await setup(page);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar todo' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^kanban-export-\d{4}-\d{2}-\d{2}\.json$/);

  const data = await readDownload(download);
  expect(data.formatVersion).toBe(1);
  expect(data.kind).toBe('full');
  expect(Number.isNaN(Date.parse(data.exportedAt))).toBe(false);
  expect(data.projects.map((p) => [p.name, p.archived]).sort()).toEqual([
    ['Mi app', false],
    ['Otra', false],
    ['Vieja', true],
  ]);
  expect(data.cards.map((c) => [c.title, c.archived]).sort()).toEqual([
    ['A', false],
    ['B', true],
    ['C', false],
    ['D', true],
    ['E', false],
  ]);
  const projectIds = new Set(data.projects.map((p) => p.id));
  expect(data.cards.every((c) => projectIds.has(c.projectId))).toBe(true);
});

test('AC-029: "Exportar proyecto" descarga un JSON con versión de formato, ese proyecto y todas sus tarjetas, y ningún otro', async ({
  page,
}) => {
  await setup(page);
  await openProject(page, 'Mi app');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar proyecto' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^kanban-Mi-app-\d{4}-\d{2}-\d{2}\.json$/);

  const data = await readDownload(download);
  expect(data.formatVersion).toBe(1);
  expect(data.kind).toBe('project');
  expect(data.projects).toHaveLength(1);
  expect(data.projects[0]).toMatchObject({ name: 'Mi app', archived: false });
  expect(data.cards.map((c) => [c.title, c.archived]).sort()).toEqual([
    ['A', false],
    ['B', true],
  ]);
  expect(data.cards.every((c) => c.projectId === data.projects[0].id)).toBe(true);
});
