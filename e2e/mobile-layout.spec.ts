import { expect, test } from '@playwright/test';

const COLUMNS = ['Sin empezar', 'En curso', 'En pausa', 'Finalizado'];

test.use({ viewport: { width: 375, height: 667 } });

// AC-020: en 375 px el tablero se desplaza horizontalmente dentro de sí mismo
// y la página no tiene desplazamiento horizontal.
test('AC-020: en móvil las 4 columnas se recorren desplazando el tablero, no la página', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Crear proyecto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  await dialog.getByLabel('Nombre').fill('App móvil');
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('list').getByRole('button', { name: 'App móvil', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'App móvil' })).toBeVisible();
  await expect(page.locator('[data-status]')).toHaveCount(4);

  // La página no se desplaza horizontalmente.
  const page_ = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(page_.scrollWidth).toBeLessThanOrEqual(page_.viewport);

  // El contenedor de columnas sí se desplaza horizontalmente.
  const columns = page.getByTestId('board-columns');
  const box = await columns.evaluate((el) => ({
    overflowX: getComputedStyle(el).overflowX,
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }));
  expect(box.overflowX).toBe('auto');
  expect(box.scrollWidth).toBeGreaterThan(box.clientWidth);

  // Las columnas tienen un ancho usable (no se comprimen a unos 78 px).
  for (const name of COLUMNS) {
    const width = await page.getByRole('region', { name }).evaluate((el) => el.getBoundingClientRect().width);
    expect(width).toBeGreaterThanOrEqual(200);
  }

  // Desplazando el tablero se llega a ver entera la última columna, sin mover la página.
  const last = page.getByRole('region', { name: 'Finalizado' });
  await expect(last).not.toBeInViewport({ ratio: 1 });
  await columns.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
  await expect(last).toBeInViewport({ ratio: 1 });
  await expect(last.getByRole('button', { name: 'Añadir tarjeta' })).toBeVisible();
  expect(await page.evaluate(() => window.scrollX)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
