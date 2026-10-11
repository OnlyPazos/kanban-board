import { expect, test, type Locator, type Page } from '@playwright/test';

// AC-045 (D-019): la etiqueta "Modo de color" se ve en la cabecera, encima
// del selector de AC-042, en las 4 vistas, también con un viewport de 375 px.

type Box = { x: number; y: number; width: number; height: number };

const banner = (page: Page) => page.getByRole('banner');
const colorModeSelect = (page: Page) => banner(page).getByRole('combobox', { name: 'Modo de color' });
const colorModeLabel = (page: Page) => banner(page).locator('label', { hasText: 'Modo de color' });
const headerTitle = (page: Page) => banner(page).getByText('Kanban de proyectos', { exact: true });

async function box(locator: Locator): Promise<Box> {
  const b = await locator.boundingBox();
  expect(b).not.toBeNull();
  return b as Box;
}

function intersects(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

function expectInsideViewport(b: Box, viewport: { width: number; height: number }) {
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.y).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(viewport.width);
  expect(b.y + b.height).toBeLessThanOrEqual(viewport.height);
}

/** Crea un proyecto y devuelve las 4 vistas con su encabezado de nivel 1. */
async function setupViews(page: Page): Promise<{ url: string; heading: string }[]> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Crear proyecto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  await dialog.getByLabel('Nombre').fill('Mi app');
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Mi app', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mi app' })).toBeVisible();
  const boardUrl = page.url();
  return [
    { url: '/#/', heading: 'Proyectos' },
    { url: boardUrl, heading: 'Mi app' },
    { url: `${boardUrl}/archived`, heading: 'Tarjetas archivadas' },
    { url: '/#/archived', heading: 'Proyectos archivados' },
  ];
}

async function checkLabel(page: Page) {
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const vp = viewport as { width: number; height: number };

  const label = colorModeLabel(page);
  const select = colorModeSelect(page);
  await expect(label).toHaveCount(1);
  await expect(select).toHaveCount(1);

  // Visible, sin ocultar, con tamaño y dentro del viewport.
  await expect(label).toBeVisible();
  await expect(label).not.toHaveClass(/ds-visually-hidden/);
  await expect(select).toBeVisible();
  const labelBox = await box(label);
  const selectBox = await box(select);
  expect(labelBox.width).toBeGreaterThan(0);
  expect(labelBox.height).toBeGreaterThan(0);
  expectInsideViewport(labelBox, vp);
  expectInsideViewport(selectBox, vp);

  // Encima del selector.
  expect(labelBox.y + labelBox.height).toBeLessThanOrEqual(selectBox.y);

  // Es la <label for> del <select>.
  const selectId = await select.getAttribute('id');
  expect(selectId).toBeTruthy();
  await expect(label).toHaveAttribute('for', selectId as string);

  // No se solapan con el título de la cabecera.
  const titleBox = await box(headerTitle(page));
  expect(intersects(labelBox, titleBox)).toBe(false);
  expect(intersects(selectBox, titleBox)).toBe(false);

  // Sin desplazamiento horizontal de la página.
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(vp.width);

  // Clic en el texto → foco en el selector.
  await page.locator('h1').click();
  await expect(select).not.toBeFocused();
  await label.click();
  await expect(select).toBeFocused();
}

test.describe('AC-045: etiqueta visible "Modo de color"', () => {
  test('en las 4 vistas, la etiqueta se ve encima del selector y enfoca el selector', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    const views = await setupViews(page);

    for (const view of views) {
      await page.goto(view.url);
      // Carga completa: el foco parte del principio del documento.
      await page.reload();
      await expect(page.getByRole('heading', { level: 1, name: view.heading })).toBeVisible();
      await checkLabel(page);

      // Se sigue manejando solo con el teclado, como en AC-042.
      await page.reload();
      await expect(page.getByRole('heading', { level: 1, name: view.heading })).toBeVisible();
      const select = colorModeSelect(page);
      await page.keyboard.press('Tab');
      await expect(select).toBeFocused();
      await page.keyboard.press('ArrowDown'); // Auto → Claro
      await expect(select).toHaveValue('light');
      await page.keyboard.press('ArrowDown'); // Claro → Oscuro
      await expect(select).toHaveValue('dark');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await page.keyboard.press('Home'); // → Auto
      await expect(select).toHaveValue('auto');
      await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    }
  });

  test('con un viewport de 375 px no hay scroll horizontal y etiqueta y selector se ven completos', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.emulateMedia({ colorScheme: 'light' });
    const views = await setupViews(page);

    for (const view of views) {
      await page.goto(view.url);
      await page.reload();
      await expect(page.getByRole('heading', { level: 1, name: view.heading })).toBeVisible();
      await checkLabel(page);
    }
  });
});
