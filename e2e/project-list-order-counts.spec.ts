import { expect, test, type Page } from '@playwright/test';

// Reloj de la página controlado: cada paso ocurre una hora después del anterior,
// así el orden por `updatedAt` no depende de la velocidad de ejecución.
const START = new Date('2026-10-10T10:00:00.000Z');

async function later(page: Page) {
  await page.clock.fastForward('01:00:00');
}

async function createProject(page: Page, name: string) {
  await page.getByRole('button', { name: 'Crear proyecto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  await dialog.getByLabel('Nombre').fill(name);
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog).toBeHidden();
}

async function openBoard(page: Page, name: string) {
  await page.getByRole('list').getByRole('button', { name, exact: true }).click();
  await expect(page.getByRole('region', { name: 'Sin empezar' })).toBeVisible();
}

async function backToList(page: Page) {
  await page.getByRole('link', { name: '← Volver a proyectos' }).click();
  await expect(page.getByRole('heading', { name: 'Proyectos', level: 1 })).toBeVisible();
}

async function addCard(page: Page, column: string, title: string) {
  await page.getByRole('region', { name: column }).getByRole('button', { name: 'Añadir tarjeta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Añadir tarjeta' });
  await dialog.getByLabel('Título').fill(title);
  await dialog.getByRole('button', { name: 'Añadir' }).click();
  await expect(dialog).toBeHidden();
}

function projectNames(page: Page) {
  return page.getByRole('list').getByRole('heading', { level: 3 });
}

function projectItem(page: Page, name: string) {
  return page
    .getByRole('list')
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name, exact: true }) });
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: START });
  await page.goto('/');
});

// AC-007: la lista se ordena por última modificación (la más reciente primero), en vivo:
// crear o editar una tarjeta, o editar el proyecto, lo sube al primer puesto sin recargar.
test('AC-007: crear/editar tarjeta o editar proyecto lo pone el primero de la lista', async ({ page }) => {
  await createProject(page, 'A');
  await later(page);
  await createProject(page, 'B');
  await expect(projectNames(page)).toHaveText(['B', 'A']);

  // Crear una tarjeta en A (el más antiguo) → A pasa a ser el primero.
  await later(page);
  await openBoard(page, 'A');
  await addCard(page, 'Sin empezar', 'Login');
  await backToList(page);
  await expect(projectNames(page)).toHaveText(['A', 'B']);

  // Editar el proyecto B → B sube sin recargar.
  await later(page);
  await page.getByRole('button', { name: 'Editar B' }).click();
  const editProject = page.getByRole('dialog', { name: 'Editar proyecto' });
  await editProject.getByLabel('Descripción').fill('Ahora con descripción');
  await editProject.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(editProject).toBeHidden();
  await expect(projectNames(page)).toHaveText(['B', 'A']);

  // Editar la tarjeta de A → A vuelve a ser el primero.
  await later(page);
  await openBoard(page, 'A');
  await page.getByRole('region', { name: 'Sin empezar' }).getByRole('button', { name: 'Login' }).click();
  const editCard = page.getByRole('dialog', { name: 'Editar tarjeta' });
  await editCard.getByLabel('Título').fill('Login con Google');
  await editCard.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(editCard).toBeHidden();
  await backToList(page);
  await expect(projectNames(page)).toHaveText(['A', 'B']);

  await page.reload();
  await expect(projectNames(page)).toHaveText(['A', 'B']);
});

// AC-008: cada proyecto muestra el número de tarjetas activas en los 4 estados, en orden.
test('AC-008: con 2 tarjetas en "Sin empezar" y 1 en "En curso" muestra 2, 1, 0 y 0', async ({ page }) => {
  await createProject(page, 'Mi app');
  await later(page);
  await createProject(page, 'Vacío');

  const item = projectItem(page, 'Mi app');
  const labels = ['Sin empezar', 'En curso', 'En pausa', 'Finalizado'];
  await expect(item.getByRole('term')).toHaveText(labels);
  await expect(item.getByRole('definition')).toHaveText(['0', '0', '0', '0']);

  await later(page);
  await openBoard(page, 'Mi app');
  await addCard(page, 'Sin empezar', 'T1');
  await addCard(page, 'Sin empezar', 'T2');
  await addCard(page, 'En curso', 'T3');
  await backToList(page);

  await expect(item.getByRole('definition')).toHaveText(['2', '1', '0', '0']);
  await expect(projectItem(page, 'Vacío').getByRole('definition')).toHaveText(['0', '0', '0', '0']);

  await page.reload();
  await expect(item.getByRole('term')).toHaveText(labels);
  await expect(item.getByRole('definition')).toHaveText(['2', '1', '0', '0']);
  await expect(projectItem(page, 'Vacío').getByRole('definition')).toHaveText(['0', '0', '0', '0']);
});
