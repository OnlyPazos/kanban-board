import { expect, test, type Page } from '@playwright/test';
import { chooseOption } from './support/select';

// AC-042 (D-017): selector "Modo de color" en la cabecera con Auto / Claro / Oscuro.
// El color de fondo del body debe ser el del token `background`.
const LIGHT_BACKGROUND = 'rgb(248, 250, 252)'; // #F8FAFC
const DARK_BACKGROUND = 'rgb(15, 23, 42)'; // #0F172A

function colorModeSelect(page: Page) {
  return page.getByRole('banner').getByRole('combobox', { name: 'Modo de color' });
}

async function expectBackground(page: Page, color: string) {
  await expect(page.locator('body')).toHaveCSS('background-color', color);
}

test.describe('AC-042: modo de color', () => {
  test('Auto con el sistema en claro usa el fondo claro y no pone data-theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    const select = colorModeSelect(page);
    await expect(select).toHaveText('Auto');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    await expectBackground(page, LIGHT_BACKGROUND);
  });

  test('Auto con el sistema en oscuro usa el fondo oscuro', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await expect(colorModeSelect(page)).toHaveText('Auto');
    await expectBackground(page, DARK_BACKGROUND);
  });

  test('con el sistema en claro, "Oscuro" pasa a oscuro sin recargar y "Auto" vuelve a seguir al sistema', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    // Marca para detectar una recarga.
    await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));

    await chooseOption(page.getByRole('banner'), 'Modo de color', 'Oscuro');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expectBackground(page, DARK_BACKGROUND);
    expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);

    await chooseOption(page.getByRole('banner'), 'Modo de color', 'Auto');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    await expectBackground(page, LIGHT_BACKGROUND);
    // Sigue al sistema: si el sistema cambia a oscuro, la interfaz también.
    await page.emulateMedia({ colorScheme: 'dark' });
    await expectBackground(page, DARK_BACKGROUND);
  });

  test('con el sistema en oscuro, "Claro" pasa a claro y "Auto" vuelve al oscuro del sistema', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    await chooseOption(page.getByRole('banner'), 'Modo de color', 'Claro');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expectBackground(page, LIGHT_BACKGROUND);

    await chooseOption(page.getByRole('banner'), 'Modo de color', 'Auto');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    await expectBackground(page, DARK_BACKGROUND);
  });

  test('el selector está en las 4 vistas y se maneja solo con el teclado', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    // Proyecto con el que llegar al tablero y a sus tarjetas archivadas.
    await page.getByRole('button', { name: 'Crear proyecto' }).click();
    const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
    await dialog.getByLabel('Nombre').fill('Mi app');
    await dialog.getByRole('button', { name: 'Crear' }).click();
    await expect(dialog).toBeHidden();
    await page.getByRole('button', { name: 'Mi app', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Mi app' })).toBeVisible();
    const boardUrl = page.url();

    const views: { url: string; heading: string }[] = [
      { url: '/#/', heading: 'Proyectos' },
      { url: boardUrl, heading: 'Mi app' },
      { url: `${boardUrl}/archived`, heading: 'Tarjetas archivadas' },
      { url: '/#/archived', heading: 'Proyectos archivados' },
    ];

    for (const view of views) {
      await page.goto(view.url);
      // Carga completa: el foco parte del principio del documento.
      await page.reload();
      await expect(page.getByRole('heading', { level: 1, name: view.heading })).toBeVisible();
      const select = colorModeSelect(page);
      await expect(select).toBeVisible();

      // Solo teclado: tras el enlace del título de la cabecera (AC-048), el
      // selector es el segundo elemento enfocable de la página.
      await page.keyboard.press('Tab');
      await expect(page.getByRole('banner').getByRole('link', { name: 'Kanban de proyectos' })).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(select).toBeFocused();

      // Combobox del sistema de diseño (D-034): ↓ abre la lista en la opción
      // elegida, ↓ mueve y Intro elige y cierra.
      await page.keyboard.press('ArrowDown'); // abre en Auto
      await page.keyboard.press('ArrowDown'); // → Claro
      await page.keyboard.press('Enter');
      await expect(select).toHaveText('Claro');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

      await page.keyboard.press('ArrowDown'); // abre en Claro
      await page.keyboard.press('ArrowDown'); // → Oscuro
      await page.keyboard.press('Enter');
      await expect(select).toHaveText('Oscuro');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await expectBackground(page, DARK_BACKGROUND);

      await page.keyboard.press('Home'); // abre en la primera: Auto
      await page.keyboard.press('Enter');
      await expect(select).toHaveText('Auto');
      await expect(page.locator('html')).not.toHaveAttribute('data-theme');
      await expectBackground(page, LIGHT_BACKGROUND);
    }
  });
});
