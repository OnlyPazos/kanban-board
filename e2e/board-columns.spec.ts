import { expect, test, type Page } from '@playwright/test';

async function createProject(page: Page, name: string) {
  await page.getByRole('button', { name: 'Crear proyecto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  await dialog.getByLabel('Nombre').fill(name);
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog).toBeHidden();
}

const COLUMNS = ['Sin empezar', 'En curso', 'En pausa', 'Finalizado'];

// AC-009: al abrir un proyecto se ve su tablero con exactamente 4 columnas en orden.
test('AC-009: abrir proyecto → tablero con 4 columnas en orden', async ({ page }) => {
  await page.goto('/');
  await createProject(page, 'Mi app');

  await page.getByRole('list').getByRole('button', { name: 'Mi app', exact: true }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Mi app' })).toBeVisible();
  const columns = page.locator('[data-status]');
  await expect(columns).toHaveCount(4);
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(COLUMNS);
  for (const name of COLUMNS) {
    await expect(page.getByRole('region', { name })).toBeVisible();
  }

  // Sigue en el tablero tras recargar (hash #/project/<id>).
  await expect(page).toHaveURL(/#\/project\/[^/]+$/);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Mi app' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(COLUMNS);

  await page.getByRole('link', { name: /volver a proyectos/i }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Proyectos' })).toBeVisible();
  await expect(page.getByRole('list').getByRole('heading', { name: 'Mi app' })).toBeVisible();
});

// AC-005 (parte "tablero"): el nombre editado se muestra en la cabecera del tablero,
// tanto editando desde la lista como desde el propio tablero, y tras recargar.
test('AC-005: el tablero muestra el nombre del proyecto actualizado', async ({ page }) => {
  await page.goto('/');
  await createProject(page, 'Mi app');

  // Editar desde la lista → abrir tablero.
  await page.getByRole('button', { name: 'Editar Mi app' }).click();
  let dialog = page.getByRole('dialog', { name: 'Editar proyecto' });
  await dialog.getByLabel('Nombre').fill('Desde la lista');
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('list').getByRole('button', { name: 'Desde la lista', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Desde la lista' })).toBeVisible();

  // Editar desde la cabecera del tablero.
  await page.getByRole('button', { name: 'Editar proyecto' }).click();
  dialog = page.getByRole('dialog', { name: 'Editar proyecto' });
  await expect(dialog.getByLabel('Nombre')).toHaveValue('Desde la lista');
  await dialog.getByLabel('Nombre').fill('Desde el tablero');
  await dialog.getByLabel('Descripción').fill('Nueva descripción');
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { level: 1, name: 'Desde el tablero' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Desde el tablero' })).toBeVisible();

  await page.getByRole('link', { name: /volver a proyectos/i }).click();
  const list = page.getByRole('list');
  await expect(list.getByRole('heading', { name: 'Desde el tablero' })).toBeVisible();
  await expect(list.getByText('Nueva descripción')).toBeVisible();
});
