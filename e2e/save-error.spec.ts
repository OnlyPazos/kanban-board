import { expect, test, type Download, type Page } from '@playwright/test';

/**
 * AC-035: se simula la cuota excedida haciendo que `IDBObjectStore.put`
 * lance `QuotaExceededError` mientras `window.__failWrites` sea `true`.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const flags = window as unknown as { __failWrites?: boolean };
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore['put']>) {
      if (flags.__failWrites) throw new DOMException('Cuota excedida', 'QuotaExceededError');
      return put.apply(this, args);
    };
  });
});

const setFailWrites = (page: Page, fail: boolean) =>
  page.evaluate((value) => {
    (window as unknown as { __failWrites?: boolean }).__failWrites = value;
  }, fail);

const projectList = (page: Page) => page.getByRole('region', { name: 'Proyectos', exact: true });

async function createProject(page: Page, name: string) {
  await page.getByRole('button', { name: 'Crear proyecto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  await dialog.getByLabel('Nombre').fill(name);
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog).toBeHidden();
  await expect(projectList(page).getByRole('button', { name, exact: true })).toBeVisible();
}

async function readDownload(download: Download): Promise<{
  formatVersion: number;
  kind: string;
  projects: { name: string; archived: boolean }[];
  cards: unknown[];
}> {
  const stream: AsyncIterable<Uint8Array> = await download.createReadStream();
  const decoder = new TextDecoder();
  let text = '';
  for await (const chunk of stream) text += decoder.decode(chunk, { stream: true });
  text += decoder.decode();
  return JSON.parse(text);
}

const saveErrorAlert = (page: Page) => page.getByRole('alert').filter({ hasText: 'No se pudieron guardar los cambios' });

test('AC-035: si el guardado falla se avisa con "Exportar ahora", que descarga el export completo en memoria; no se indica que se guardó', async ({
  page,
}) => {
  await page.goto('/');
  await createProject(page, 'Mi app');
  await createProject(page, 'Otra');
  await expect(saveErrorAlert(page)).toHaveCount(0);

  await setFailWrites(page, true);
  await page.getByRole('button', { name: 'Archivar Mi app' }).click();

  const alert = saveErrorAlert(page);
  await expect(alert).toBeVisible();
  // No se indica que se guardó: el proyecto sigue en la lista activa.
  await expect(projectList(page).getByRole('button', { name: 'Mi app', exact: true })).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await alert.getByRole('button', { name: 'Exportar ahora' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^kanban-export-.*\.json$/);
  const data = await readDownload(download);
  expect(data.formatVersion).toBe(1);
  expect(data.kind).toBe('full');
  expect(data.projects.map((p) => [p.name, p.archived]).sort()).toEqual([
    ['Mi app', false],
    ['Otra', false],
  ]);

  // Una creación fallida tampoco se muestra como guardada: el diálogo sigue abierto.
  await page.getByRole('button', { name: 'Crear proyecto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  await dialog.getByLabel('Nombre').fill('Nueva');
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(projectList(page).getByRole('button', { name: 'Nueva', exact: true })).toHaveCount(0);
  await expect(alert).toBeVisible();

  // Nada de lo fallido llegó a guardarse.
  await setFailWrites(page, false);
  await page.reload();
  await expect(projectList(page).getByRole('button', { name: 'Mi app', exact: true })).toBeVisible();
  await expect(projectList(page).getByRole('button', { name: 'Nueva', exact: true })).toHaveCount(0);
  await expect(saveErrorAlert(page)).toHaveCount(0);
});

test('AC-035: el aviso desaparece cuando un guardado posterior se confirma', async ({ page }) => {
  await page.goto('/');
  await createProject(page, 'Mi app');

  await setFailWrites(page, true);
  await page.getByRole('button', { name: 'Archivar Mi app' }).click();
  await expect(saveErrorAlert(page)).toBeVisible();

  await setFailWrites(page, false);
  await page.getByRole('button', { name: 'Archivar Mi app' }).click();
  await expect(projectList(page).getByRole('button', { name: 'Mi app', exact: true })).toHaveCount(0);
  await expect(saveErrorAlert(page)).toHaveCount(0);
});
