import { expect, test } from '@playwright/test';
import { column, createProject, expectDecorativeIcon, openProject, STATUSES } from './support/redesign';

// AC-050 (D-025): "Añadir tarjeta" es un botón de solo icono en la cabecera de cada columna.

test.describe('AC-050: "Añadir tarjeta en <estado>" en la cabecera', () => {
  test('cada columna tiene el botón en su cabecera, con icono plus y sin botón de texto al pie', async ({ page }) => {
    await createProject(page, 'Mi app');
    await openProject(page, 'Mi app');

    for (const status of STATUSES) {
      const header = column(page, status.label).locator('header');
      const button = header.getByRole('button', { name: `Añadir tarjeta en ${status.label}`, exact: true });
      await expect(button).toBeVisible();
      await expectDecorativeIcon(button, 'plus');
      await expect(button).toHaveText('');
    }
    await expect(page.getByRole('button', { name: 'Añadir tarjeta', exact: true })).toHaveCount(0);
  });

  test('con teclado (Intro y Espacio) abre el diálogo y crea la tarjeta en esa columna', async ({ page }) => {
    await createProject(page, 'Mi app');
    await openProject(page, 'Mi app');
    const button = page.getByRole('button', { name: 'Añadir tarjeta en En curso', exact: true });
    const dialog = page.getByRole('dialog', { name: 'Añadir tarjeta' });

    // Se alcanza con Tab (desde el botón de "Sin empezar", tras la lista de esa columna).
    await page.getByRole('button', { name: 'Añadir tarjeta en Sin empezar', exact: true }).focus();
    for (let i = 0; i < 10 && !(await button.evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press('Tab');
    }
    await expect(button).toBeFocused();
    await page.keyboard.press('Space');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await button.focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Título').fill('Login');
    await dialog.getByRole('button', { name: 'Añadir' }).click();
    await expect(dialog).toBeHidden();
    await expect(column(page, 'En curso').getByRole('listitem', { name: 'Login' })).toBeVisible();

    await page.reload();
    await expect(column(page, 'En curso').getByRole('listitem', { name: 'Login' })).toBeVisible();
  });

  test('en un proyecto archivado no hay ningún botón "Añadir tarjeta en …"', async ({ page }) => {
    await createProject(page, 'Viejo');
    await page.getByRole('button', { name: 'Archivar Viejo' }).click();
    await page.getByRole('link', { name: 'Proyectos archivados' }).click();
    await page.getByRole('link', { name: 'Ver tablero de Viejo' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Viejo' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Añadir tarjeta/ })).toHaveCount(0);
  });
});
