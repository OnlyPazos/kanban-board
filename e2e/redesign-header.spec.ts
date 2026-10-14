import { expect, test } from '@playwright/test';
import { expectDecorativeIcon, gotoView, MODES, setMode, setupViews, TOKENS } from './support/redesign';

// AC-048 (D-028): cabecera `appbar` con logo y título que enlaza con la lista.

test.describe('AC-048: cabecera de la app', () => {
  test('en las 4 vistas: colores de appbar, franja inferior, sombra y logo decorativo', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    const views = await setupViews(page);

    for (const view of views) {
      await gotoView(page, view);
      const header = page.getByRole('banner');
      await expectDecorativeIcon(header, 'square-kanban');
      await expect(header.getByRole('link', { name: 'Kanban de proyectos' })).toBeVisible();
      // (3) A la derecha, el botón del menú "Modo de color" (AC-058).
      const titleBox = await header.getByRole('link', { name: 'Kanban de proyectos' }).boundingBox();
      const buttonBox = await header.getByRole('button', { name: 'Modo de color' }).boundingBox();
      expect(titleBox && buttonBox && buttonBox.x >= titleBox.x + titleBox.width).toBe(true);

      for (const mode of MODES) {
        await setMode(page, mode);
        await expect(header).toHaveCSS('background-color', TOKENS[mode].appbarBg);
        await expect(header).toHaveCSS('border-bottom-width', '3px');
        await expect(header).toHaveCSS('border-bottom-style', 'solid');
        await expect(header).toHaveCSS('border-bottom-color', TOKENS[mode].appbarAccent);
        await expect(header).not.toHaveCSS('box-shadow', 'none');
      }
    }
  });

  test('el título "Kanban de proyectos" lleva a la lista desde el tablero y los archivados', async ({ page }) => {
    const views = await setupViews(page);

    for (const view of views.slice(1)) {
      await gotoView(page, view);
      await page.getByRole('banner').getByRole('link', { name: 'Kanban de proyectos' }).click();
      await expect(page.getByRole('heading', { level: 1, name: 'Proyectos' })).toBeVisible();
    }
  });
});
