import { expect, test, type Page } from '@playwright/test';

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

/** "Exportar todo" y guarda el archivo en la carpeta del test. Devuelve su ruta. */
async function exportAll(page: Page): Promise<string> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar todo' }).click();
  const download = await downloadPromise;
  const path = test.info().outputPath('kanban-export.json');
  await download.saveAs(path);
  return path;
}

/** Pulsa "Importar" (del estado vacío) y elige el archivo en el selector. */
async function importFromEmptyState(page: Page, path: string) {
  await expect(page.getByText('Todavía no tienes proyectos')).toBeVisible();
  const chooserPromise = page.waitForEvent('filechooser');
  await projectList(page).getByRole('button', { name: 'Importar' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(path);
}

/** Borra todos los datos de IndexedDB y recarga: la app arranca sin proyectos. */
async function clearStorage(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('kanban-board');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(['projects', 'cards'], 'readwrite');
          tx.objectStore('projects').clear();
          tx.objectStore('cards').clear();
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  await page.reload();
}

const confirmDialog = (page: Page) => page.getByRole('dialog', { name: '¿Importar y reemplazar todos tus datos?' });

/** "Mi app" con A y "Otra" con E; devuelve el export completo y los datos guardados. */
async function setup(page: Page) {
  await page.goto('/');
  await createProject(page, 'Otra');
  await createProject(page, 'Mi app');
  await openProject(page, 'Mi app');
  await addCard(page, 'Sin empezar', 'A');
  await backToList(page);
  await openProject(page, 'Otra');
  await addCard(page, 'En pausa', 'E');
  await backToList(page);
  const file = await exportAll(page);
  const data = await snapshot(page);
  return { file, data };
}

test('AC-041: sin ningún proyecto, importar un export completo no pide confirmación y muestra los proyectos', async ({
  page,
}) => {
  const { file, data } = await setup(page);
  await clearStorage(page);
  expect(await snapshot(page)).toEqual({ projects: [], cards: [] });

  await importFromEmptyState(page, file);

  await expect(projectList(page).getByRole('button', { name: 'Mi app', exact: true })).toBeVisible();
  await expect(projectList(page).getByRole('button', { name: 'Otra', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(confirmDialog(page)).toHaveCount(0);
  expect(await snapshot(page)).toEqual(data);

  await page.reload();
  await expect(projectList(page).getByRole('button', { name: 'Mi app', exact: true })).toBeVisible();
  await expect(projectList(page).getByRole('button', { name: 'Otra', exact: true })).toBeVisible();
});

test('AC-041 / AC-030: con 1 proyecto archivado y ninguno activo sí se pide confirmación', async ({ page }) => {
  const { file, data } = await setup(page);
  await clearStorage(page);
  await createProject(page, 'Vieja');
  await projectList(page).getByRole('button', { name: 'Archivar Vieja' }).click();
  await expect(projectList(page).getByRole('button', { name: 'Vieja', exact: true })).toHaveCount(0);
  const before = await snapshot(page);
  expect(before.projects).toHaveLength(1);
  expect(before.projects[0]?.archived).toBe(true);

  await importFromEmptyState(page, file);
  const dialog = confirmDialog(page);
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Se borrará tu 1 proyecto actual');

  // Cancelar no cambia nada.
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialog).toBeHidden();
  expect(await snapshot(page)).toEqual(before);

  // Confirmar sustituye los datos por los del archivo.
  await importFromEmptyState(page, file);
  await dialog.getByRole('button', { name: 'Reemplazar' }).click();
  await expect(dialog).toBeHidden();
  await expect(projectList(page).getByRole('button', { name: 'Mi app', exact: true })).toBeVisible();
  expect(await snapshot(page)).toEqual(data);
});
