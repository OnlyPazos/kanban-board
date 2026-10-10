import { expect, test } from '@playwright/test';

// AC-002 + AC-036: crear un proyecto lo muestra en la lista y, sin pulsar
// ningún botón de guardar, sigue ahí tras recargar con nombre y descripción.
test('AC-002/AC-036: crear proyecto → recargar → sigue visible con nombre y descripción', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Crear proyecto' }).click();

  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Nombre').fill('Mi app');
  await dialog.getByLabel('Descripción').fill('Demo');
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog).toBeHidden();

  const list = page.getByRole('list');
  await expect(list.getByRole('heading', { name: 'Mi app' })).toBeVisible();
  await expect(list.getByText('Demo')).toBeVisible();
  await expect(page.getByRole('button', { name: /guardar/i })).toHaveCount(0);

  await page.reload();

  await expect(list.getByRole('heading', { name: 'Mi app' })).toBeVisible();
  await expect(list.getByText('Demo')).toBeVisible();
  await expect(list.getByRole('listitem')).toHaveCount(1);
});
