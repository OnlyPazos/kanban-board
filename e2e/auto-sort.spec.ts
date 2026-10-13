import { expect, test, type Page } from '@playwright/test';

async function createProject(page: Page, name: string) {
  await page.getByRole('button', { name: 'Crear proyecto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  await dialog.getByLabel('Nombre').fill(name);
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog).toBeHidden();
}

async function addCard(page: Page, column: string, title: string) {
  await page.getByRole('region', { name: column }).getByRole('button', { name: 'Añadir tarjeta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Añadir tarjeta' });
  await dialog.getByLabel('Título').fill(title);
  await dialog.getByRole('button', { name: 'Añadir' }).click();
  await expect(dialog).toBeHidden();
}

async function setPriority(page: Page, column: string, title: string, priority: string) {
  await page.getByRole('region', { name: column }).getByRole('button', { name: title, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Editar tarjeta' });
  await dialog.getByLabel('Prioridad').selectOption({ label: priority });
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(dialog).toBeHidden();
}

// AC-014: con tarjetas creadas en este orden — T1 (Baja), T2 (sin prioridad), T3 (Alta),
// T4 (Alta) — la columna muestra T3, T4, T1, T2.
test('AC-014: orden automático dentro de una columna → T3, T4, T1, T2', async ({ page }) => {
  await page.goto('/');
  await createProject(page, 'Mi app');
  await page.getByRole('list').getByRole('button', { name: 'Mi app', exact: true }).click();

  const column = page.getByRole('region', { name: 'Sin empezar' });
  const titles = column.getByRole('heading', { level: 3 });
  const steps: [string, string][] = [
    ['T1', 'Baja'],
    ['T2', 'Sin prioridad'],
    ['T3', 'Alta'],
    ['T4', 'Alta'],
  ];
  for (const [title, priority] of steps) {
    await addCard(page, 'Sin empezar', title);
    if (priority !== 'Sin prioridad') await setPriority(page, 'Sin empezar', title, priority);
    // Cada creación queda en un milisegundo distinto: el desempate por createdAt es determinista.
    await page.waitForTimeout(5);
  }

  await expect(titles).toHaveText(['T3', 'T4', 'T1', 'T2']);

  // El orden se recalcula a partir de los datos guardados: se mantiene tras recargar.
  await page.reload();
  await expect(titles).toHaveText(['T3', 'T4', 'T1', 'T2']);
});
