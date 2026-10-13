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

/** Lee un store de IndexedDB. */
function stored(page: Page, store: 'projects' | 'cards') {
  return page.evaluate(
    (name) =>
      new Promise<Record<string, unknown>[]>((resolve, reject) => {
        const open = indexedDB.open('kanban-board');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const req = db.transaction(name).objectStore(name).getAll();
          req.onsuccess = () => {
            db.close();
            resolve(req.result);
          };
          req.onerror = () => reject(req.error);
        };
      }),
    store,
  );
}

const projectList = (page: Page) => page.getByRole('region', { name: 'Proyectos', exact: true });

/** Crea "Mi app" con 3 tarjetas activas (Sin empezar, En curso, Finalizado) y 1 archivada (En pausa), y "Otra". */
async function setup(page: Page) {
  await page.goto('/');
  await createProject(page, 'Otra');
  await createProject(page, 'Mi app');
  await projectList(page).getByRole('button', { name: 'Mi app', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mi app' })).toBeVisible();
  await addCard(page, 'Sin empezar', 'A');
  await addCard(page, 'En curso', 'B');
  await addCard(page, 'Finalizado', 'C');
  await addCard(page, 'En pausa', 'D');
  const d = page.getByRole('region', { name: 'En pausa' }).getByRole('listitem', { name: 'D' });
  await d.getByRole('button', { name: 'Archivar D', exact: true }).click();
  await expect(d).toHaveCount(0);
  await page.getByRole('link', { name: /volver a proyectos/i }).click();
  await expect(projectList(page).getByRole('button', { name: 'Mi app', exact: true })).toBeVisible();
}

async function archiveMiApp(page: Page) {
  await page.getByRole('button', { name: 'Archivar Mi app' }).click();
  await expect(projectList(page).getByRole('button', { name: 'Mi app', exact: true })).toHaveCount(0);
}

async function openArchivedProjects(page: Page) {
  await page.getByRole('link', { name: 'Proyectos archivados' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Proyectos archivados' })).toBeVisible();
}

// AC-024: al archivar un proyecto desaparece de la lista y aparece en la vista global de archivados.
test('AC-024: archivar un proyecto lo quita de la lista y lo muestra en "Proyectos archivados"', async ({ page }) => {
  await setup(page);
  const cardsBefore = await stored(page, 'cards');

  await archiveMiApp(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(projectList(page).getByRole('button', { name: 'Otra', exact: true })).toBeVisible();

  // Solo cambia el flag del proyecto; las tarjetas no se tocan.
  const miApp = (await stored(page, 'projects')).find((p) => p.name === 'Mi app');
  expect(miApp?.archived).toBe(true);
  expect(await stored(page, 'cards')).toEqual(cardsBefore);

  await openArchivedProjects(page);
  await expect(page.getByRole('listitem', { name: 'Mi app' })).toHaveCount(1);
  await expect(page.getByRole('listitem', { name: 'Otra' })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('listitem', { name: 'Mi app' })).toHaveCount(1);
  await page.getByRole('link', { name: /volver a proyectos/i }).click();
  await expect(projectList(page).getByRole('button', { name: 'Otra', exact: true })).toBeVisible();
  await expect(projectList(page).getByRole('button', { name: 'Mi app', exact: true })).toHaveCount(0);
});

// AC-025: restaurar un proyecto con 3 tarjetas activas y 1 archivada lo devuelve igual.
test('AC-025: restaurar un proyecto lo devuelve con sus 3 tarjetas activas y 1 archivada', async ({ page }) => {
  await setup(page);
  const projectsBefore = await stored(page, 'projects');
  const cardsBefore = await stored(page, 'cards');
  await archiveMiApp(page);
  await openArchivedProjects(page);

  await page.getByRole('button', { name: 'Restaurar Mi app' }).click();
  await expect(page.getByRole('listitem', { name: 'Mi app' })).toHaveCount(0);
  await expect(page.getByText('No hay proyectos archivados.')).toBeVisible();

  expect(await stored(page, 'projects')).toEqual(expect.arrayContaining(projectsBefore));
  expect(await stored(page, 'cards')).toEqual(cardsBefore);

  const check = async () => {
    await page.getByRole('link', { name: /volver a proyectos/i }).click();
    await projectList(page).getByRole('button', { name: 'Mi app', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Mi app' })).toBeVisible();
    for (const [column, title] of [
      ['Sin empezar', 'A'],
      ['En curso', 'B'],
      ['Finalizado', 'C'],
    ]) {
      await expect(page.getByRole('region', { name: column }).getByRole('listitem', { name: title })).toHaveCount(1);
    }
    await expect(page.getByRole('region', { name: 'En pausa' }).getByRole('listitem')).toHaveCount(0);
    await page.getByRole('link', { name: 'Tarjetas archivadas' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Tarjetas archivadas' })).toBeVisible();
    await expect(page.getByRole('listitem')).toHaveCount(1);
    await expect(page.getByRole('listitem', { name: 'D' })).toHaveCount(1);
  };
  await check();
  await page.reload();
  await expect(page.getByRole('listitem', { name: 'D' })).toHaveCount(1);
  await page.goto('/#/archived');
  await check();
});

// AC-027: borrado definitivo desde la vista global con confirmación (nombre + total de tarjetas).
test('AC-027: borrar definitivamente un proyecto archivado pide confirmación y no reaparece tras recargar', async ({ page }) => {
  await setup(page);
  // Desde la lista activa no existe borrado definitivo.
  await expect(page.getByRole('button', { name: /borrar|eliminar/i })).toHaveCount(0);

  await archiveMiApp(page);
  await openArchivedProjects(page);

  await page.getByRole('button', { name: 'Borrar definitivamente Mi app' }).click();
  const confirm = page.getByRole('dialog', { name: '¿Borrar definitivamente el proyecto?' });
  await expect(confirm).toBeVisible();
  await expect(confirm).toContainText('«Mi app»');
  await expect(confirm).toContainText('4 tarjetas');

  const projectsBefore = await stored(page, 'projects');
  const cardsBefore = await stored(page, 'cards');
  await confirm.getByRole('button', { name: 'Cancelar' }).click();
  await expect(confirm).toBeHidden();
  await expect(page.getByRole('listitem', { name: 'Mi app' })).toHaveCount(1);
  expect(await stored(page, 'projects')).toEqual(projectsBefore);
  expect(await stored(page, 'cards')).toEqual(cardsBefore);

  await page.getByRole('button', { name: 'Borrar definitivamente Mi app' }).click();
  await confirm.getByRole('button', { name: 'Borrar definitivamente', exact: true }).click();
  await expect(confirm).toBeHidden();
  await expect(page.getByRole('listitem', { name: 'Mi app' })).toHaveCount(0);
  const projects = await stored(page, 'projects');
  expect(projects.map((p) => p.name)).toEqual(['Otra']);
  expect(await stored(page, 'cards')).toEqual([]);

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Proyectos archivados' })).toBeVisible();
  await expect(page.getByRole('listitem', { name: 'Mi app' })).toHaveCount(0);
  await page.getByRole('link', { name: /volver a proyectos/i }).click();
  await expect(projectList(page).getByRole('button', { name: 'Otra', exact: true })).toBeVisible();
  await expect(projectList(page).getByRole('button', { name: 'Mi app', exact: true })).toHaveCount(0);
});
