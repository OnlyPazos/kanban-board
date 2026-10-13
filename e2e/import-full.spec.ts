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

async function archiveCard(page: Page, column: string, title: string) {
  const card = page.getByRole('region', { name: column }).getByRole('listitem', { name: title });
  await card.getByRole('button', { name: `Archivar ${title}`, exact: true }).click();
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

/** "Exportar todo" y devuelve la ruta local del archivo descargado. */
async function exportAll(page: Page): Promise<string> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar todo' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) throw new Error('La descarga no se guardó');
  return path;
}

/** Pulsa "Importar" y elige el archivo en el selector de archivos. */
async function importFile(page: Page, path: string) {
  const chooserPromise = page.waitForEvent('filechooser');
  await projectList(page).getByRole('button', { name: 'Importar' }).click();
  const chooser = await chooserPromise;
  expect(chooser.isMultiple()).toBe(false);
  await chooser.setFiles(path);
}

const confirmDialog = (page: Page) => page.getByRole('dialog', { name: '¿Importar y reemplazar todos tus datos?' });

test('AC-030: importar un export completo pide confirmación con N; cancelar no cambia nada y confirmar deja exactamente los datos originales (round-trip)', async ({
  page,
}) => {
  await setup(page);
  const original = await snapshot(page);
  expect(original.projects).toHaveLength(3);
  expect(original.cards).toHaveLength(5);

  const file = await exportAll(page);
  await createProject(page, 'Nuevo');
  await expect(projectList(page).getByRole('button', { name: 'Nuevo', exact: true })).toBeVisible();
  const withNew = await snapshot(page);
  expect(withNew.projects).toHaveLength(4);

  // Cancelar: la confirmación indica los 4 proyectos actuales (3 activos + 1 archivado) y no cambia nada.
  await importFile(page, file);
  const dialog = confirmDialog(page);
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Se borrarán tus 4 proyectos actuales');
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialog).toBeHidden();
  expect(await snapshot(page)).toEqual(withNew);
  await expect(projectList(page).getByRole('button', { name: 'Nuevo', exact: true })).toBeVisible();

  // Cerrar con Escape tampoco cambia nada.
  await importFile(page, file);
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  expect(await snapshot(page)).toEqual(withNew);

  // Confirmar: los datos actuales se sustituyen por los del archivo, tal cual.
  await importFile(page, file);
  await dialog.getByRole('button', { name: 'Reemplazar' }).click();
  await expect(dialog).toBeHidden();
  await expect(projectList(page).getByRole('button', { name: 'Nuevo', exact: true })).toHaveCount(0);
  await expect(projectList(page).getByRole('button', { name: 'Mi app', exact: true })).toBeVisible();
  await expect(projectList(page).getByRole('button', { name: 'Otra', exact: true })).toBeVisible();
  await expect(projectList(page).getByRole('button', { name: 'Vieja', exact: true })).toHaveCount(0);
  expect(await snapshot(page)).toEqual(original);

  // Tras recargar sigue igual: el proyecto archivado sigue archivado y sus tarjetas intactas.
  await page.reload();
  await expect(projectList(page).getByRole('button', { name: 'Mi app', exact: true })).toBeVisible();
  await expect(projectList(page).getByRole('button', { name: 'Nuevo', exact: true })).toHaveCount(0);
  expect(await snapshot(page)).toEqual(original);
  await page.getByRole('link', { name: 'Proyectos archivados' }).click();
  await expect(page.getByRole('listitem', { name: 'Vieja' })).toContainText('2 tarjetas');
});

test('AC-030: el selector de "Importar" solo acepta archivos JSON', async ({ page }) => {
  await page.goto('/');
  await createProject(page, 'Mi app');
  const input = page.getByLabel('Archivo para importar');
  await expect(input).toHaveAttribute('type', 'file');
  await expect(input).toHaveAttribute('accept', '.json,application/json');
});
