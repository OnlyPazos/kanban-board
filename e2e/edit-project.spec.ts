import { expect, test, type Page } from '@playwright/test';

async function createProject(page: Page, name: string, description: string) {
  await page.getByRole('button', { name: 'Crear proyecto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  await dialog.getByLabel('Nombre').fill(name);
  await dialog.getByLabel('Descripción').fill(description);
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog).toBeHidden();
}

// AC-005: editar nombre y descripción → se ven en la lista y se conservan al recargar.
// (La comprobación en la cabecera del tablero está en board-columns.spec.ts.)
test('AC-005: editar proyecto → nuevos valores en la lista y tras recargar', async ({ page }) => {
  await page.goto('/');
  await createProject(page, 'Mi app', 'Demo');

  await page.getByRole('button', { name: 'Editar Mi app' }).click();
  const dialog = page.getByRole('dialog', { name: 'Editar proyecto' });
  await expect(dialog.getByLabel('Nombre')).toHaveValue('Mi app');
  await expect(dialog.getByLabel('Descripción')).toHaveValue('Demo');
  await dialog.getByLabel('Nombre').fill('Mi app renombrada');
  await dialog.getByLabel('Descripción').fill('Nueva descripción');
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(dialog).toBeHidden();

  const list = page.getByRole('list');
  await expect(list.getByRole('heading', { name: 'Mi app renombrada' })).toBeVisible();
  await expect(list.getByText('Nueva descripción')).toBeVisible();
  await expect(list.getByText('Demo', { exact: true })).toHaveCount(0);

  await page.reload();

  await expect(list.getByRole('heading', { name: 'Mi app renombrada' })).toBeVisible();
  await expect(list.getByText('Nueva descripción')).toBeVisible();
  await expect(list.getByRole('listitem')).toHaveCount(1);
});

// AC-006: dos proyectos con el mismo nombre son distintos; editar uno no altera el otro.
test('AC-006: proyectos con el mismo nombre son independientes al editar', async ({ page }) => {
  await page.goto('/');
  await createProject(page, 'Duplicado', 'Primero');
  await createProject(page, 'Duplicado', 'Segundo');

  const list = page.getByRole('list');
  await expect(list.getByRole('listitem')).toHaveCount(2);
  await expect(list.getByRole('heading', { name: 'Duplicado' })).toHaveCount(2);

  const segundo = list.getByRole('listitem').filter({ hasText: 'Segundo' });
  await segundo.getByRole('button', { name: 'Editar Duplicado' }).click();
  const dialog = page.getByRole('dialog', { name: 'Editar proyecto' });
  await expect(dialog.getByLabel('Descripción')).toHaveValue('Segundo');
  await dialog.getByLabel('Nombre').fill('Renombrado');
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(dialog).toBeHidden();

  await page.reload();

  await expect(list.getByRole('listitem')).toHaveCount(2);
  const primero = list.getByRole('listitem').filter({ hasText: 'Primero' });
  await expect(primero.getByRole('heading', { name: 'Duplicado' })).toBeVisible();
  const editado = list.getByRole('listitem').filter({ hasText: 'Segundo' });
  await expect(editado.getByRole('heading', { name: 'Renombrado' })).toBeVisible();
});
