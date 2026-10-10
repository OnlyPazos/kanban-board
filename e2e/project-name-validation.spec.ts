import { expect, test, type Locator, type Page } from '@playwright/test';

const LONG_NAME = 'a'.repeat(81);

async function createProject(page: Page, name: string, description: string) {
  await page.getByRole('button', { name: 'Crear proyecto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  await dialog.getByLabel('Nombre').fill(name);
  await dialog.getByLabel('Descripción').fill(description);
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog).toBeHidden();
}

/** Escribe el valor saltándose `maxlength`, como haría un pegado programático. */
async function forceValue(input: Locator, value: string) {
  await input.evaluate((el, v) => {
    (el as HTMLInputElement).value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

// AC-003: crear con nombre vacío o solo espacios → error junto al campo, no se crea.
test('AC-003: crear con nombre vacío o solo espacios no crea el proyecto', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Crear proyecto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  const name = dialog.getByLabel('Nombre');

  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog).toBeVisible();
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(name).toHaveAccessibleDescription('El nombre es obligatorio.');

  await name.fill('   ');
  await dialog.getByLabel('Descripción').fill('Demo');
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('El nombre es obligatorio.')).toBeVisible();

  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect(page.getByText('Todavía no tienes proyectos')).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(0);
});

// AC-003: guardar la edición con nombre vacío o solo espacios → error, no se modifica.
test('AC-003: editar con nombre vacío o solo espacios no modifica el proyecto', async ({ page }) => {
  await page.goto('/');
  await createProject(page, 'Mi app', 'Demo');

  await page.getByRole('button', { name: 'Editar Mi app' }).click();
  const dialog = page.getByRole('dialog', { name: 'Editar proyecto' });
  const name = dialog.getByLabel('Nombre');

  for (const value of ['', '   ']) {
    await name.fill(value);
    await dialog.getByLabel('Descripción').fill('Cambiada');
    await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(dialog).toBeVisible();
    await expect(name).toHaveAccessibleDescription('El nombre es obligatorio.');
  }

  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await page.reload();
  const list = page.getByRole('list');
  await expect(list.getByRole('heading', { name: 'Mi app' })).toBeVisible();
  await expect(list.getByText('Demo', { exact: true })).toBeVisible();
  await expect(list.getByText('Cambiada')).toHaveCount(0);
});

// AC-004: el campo no admite más de 80 caracteres y, si llegan más, se muestra error y no se guarda.
test('AC-004: crear con más de 80 caracteres no es posible', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Crear proyecto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  const name = dialog.getByLabel('Nombre');

  await name.fill(LONG_NAME);
  expect((await name.inputValue()).length).toBeLessThanOrEqual(80);

  await forceValue(name, LONG_NAME);
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog).toBeVisible();
  await expect(name).toHaveAccessibleDescription('El nombre no puede superar 80 caracteres.');

  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await page.reload();
  await expect(page.getByText('Todavía no tienes proyectos')).toBeVisible();
});

test('AC-004: editar con más de 80 caracteres no modifica el proyecto', async ({ page }) => {
  await page.goto('/');
  await createProject(page, 'Mi app', 'Demo');

  await page.getByRole('button', { name: 'Editar Mi app' }).click();
  const dialog = page.getByRole('dialog', { name: 'Editar proyecto' });
  const name = dialog.getByLabel('Nombre');

  await name.fill(LONG_NAME);
  expect((await name.inputValue()).length).toBeLessThanOrEqual(80);

  await forceValue(name, LONG_NAME);
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(dialog).toBeVisible();
  await expect(name).toHaveAccessibleDescription('El nombre no puede superar 80 caracteres.');

  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await page.reload();
  const list = page.getByRole('list');
  await expect(list.getByRole('heading', { name: 'Mi app' })).toBeVisible();
  await expect(list.getByRole('listitem')).toHaveCount(1);
});
