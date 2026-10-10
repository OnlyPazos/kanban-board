import { expect, test, type Page } from '@playwright/test';

const projectList = (page: Page) => page.getByRole('region', { name: 'Proyectos', exact: true });

async function createProject(page: Page, name: string) {
  await page.getByRole('button', { name: 'Crear proyecto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  await dialog.getByLabel('Nombre').fill(name);
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog).toBeHidden();
}

async function openProject(page: Page, name: string) {
  await projectList(page).getByRole('button', { name, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
}

async function backToList(page: Page) {
  await page.getByRole('link', { name: /volver a proyectos/i }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Proyectos' })).toBeVisible();
}

async function exportProject(page: Page): Promise<string> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar proyecto' }).click();
  const path = await (await downloadPromise).path();
  if (!path) throw new Error('La descarga no se guardó');
  return path;
}

async function importFile(page: Page, path: string) {
  const chooserPromise = page.waitForEvent('filechooser');
  await projectList(page).getByRole('button', { name: 'Importar' }).click();
  await (await chooserPromise).setFiles(path);
}

type Row = Record<string, unknown> & { id: string; name: string };

async function storedProjects(page: Page): Promise<Row[]> {
  return page.evaluate(
    () =>
      new Promise<Row[]>((resolve, reject) => {
        const open = indexedDB.open('kanban-board');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const req = db.transaction('projects').objectStore('projects').getAll();
          req.onsuccess = () => {
            db.close();
            resolve(req.result as Row[]);
          };
          req.onerror = () => reject(req.error);
        };
      }),
  );
}

test('AC-040: "Importar como copia" con un nombre largo lo recorta a 80 y la copia se puede editar y guardar', async ({
  page,
}) => {
  const original = 'Proyecto con un nombre muy largo para comprobar el recorte de la copia ok';
  const longName = original.padEnd(78, 'x');
  expect(longName).toHaveLength(78);
  const expected = `${longName.slice(0, 72)} (copia)`;
  expect(expected).toHaveLength(80);

  await page.goto('/');
  await createProject(page, longName);
  await openProject(page, longName);
  const file = await exportProject(page);
  await backToList(page);

  await importFile(page, file);
  const conflict = page.getByRole('dialog', { name: 'Este proyecto ya existe' });
  await conflict.getByRole('button', { name: 'Importar como copia' }).click();
  await expect(conflict).toBeHidden();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(projectList(page).getByRole('button', { name: expected, exact: true })).toBeVisible();
  await expect(projectList(page).getByRole('button', { name: longName, exact: true })).toBeVisible();

  const copy = (await storedProjects(page)).find((p) => p.name === expected)!;
  expect(copy.name).toHaveLength(80);
  expect(copy.name.endsWith(' (copia)')).toBe(true);

  // Editar la copia y guardar sin tocar el nombre: se acepta y el nombre se conserva.
  await projectList(page).getByRole('button', { name: `Editar ${expected}`, exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'Editar proyecto' });
  await expect(edit.getByLabel('Nombre')).toHaveValue(expected);
  await edit.getByLabel('Descripción').fill('Copia editada');
  await edit.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(edit).toBeHidden();
  await expect(projectList(page).getByText('Copia editada')).toBeVisible();

  await page.reload();
  await expect(projectList(page).getByRole('button', { name: expected, exact: true })).toBeVisible();
  await expect(projectList(page).getByText('Copia editada')).toBeVisible();
  const saved = (await storedProjects(page)).find((p) => p.id === copy.id)!;
  expect(saved.name).toBe(expected);
  expect(saved.description).toBe('Copia editada');
});
