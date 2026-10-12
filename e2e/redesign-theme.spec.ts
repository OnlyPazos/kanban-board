import { expect, test } from '@playwright/test';
import { gotoView, MODES, setMode, setupViews, TOKENS } from './support/redesign';

// AC-047 (D-021): tipografía Plus Jakarta Sans y paleta índigo/slate del rediseño.

test.describe('AC-047: tipografía y paleta', () => {
  test('en las 4 vistas la fuente es Plus Jakarta Sans y el fondo es el del token background', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    const views = await setupViews(page);

    for (const view of views) {
      await gotoView(page, view);

      const fontFamily = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
      expect(fontFamily.startsWith('"Plus Jakarta Sans Variable"')).toBe(true);
      const loaded = await page.evaluate(async () => {
        await document.fonts.ready;
        return document.fonts.check('16px "Plus Jakarta Sans Variable"');
      });
      expect(loaded).toBe(true);

      for (const mode of MODES) {
        await setMode(page, mode);
        await expect(page.locator('body')).toHaveCSS('background-color', TOKENS[mode].background);
      }
    }
  });

  test('el botón primario "Crear proyecto" usa action.primary en claro y en oscuro', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    const create = page.getByRole('button', { name: 'Crear proyecto' });
    for (const mode of MODES) {
      await setMode(page, mode);
      await expect(create).toHaveCSS('background-color', TOKENS[mode].actionPrimary);
    }
  });
});
