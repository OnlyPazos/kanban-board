import { expect, test, type Page } from '@playwright/test';
import { addCard, column, createProject, expectDecorativeIcon, openProject } from './support/redesign';

// AC-053 (D-030, D-027): pie de la tarjeta con la fecha de creación y "Archivar" de solo icono.

const cardIn = (page: Page, name: string, title: string) =>
  column(page, name).getByRole('listitem', { name: title, exact: true });

test.describe('AC-053: pie de la tarjeta', () => {
  test.beforeEach(async ({ page }) => {
    // Fecha fija en hora local del navegador; los temporizadores siguen siendo reales.
    await page.clock.setFixedTime(new Date(2026, 9, 9, 10, 30));
  });

  test('muestra "Creada el 9 oct 2026" con icono y no cambia al editar la tarjeta', async ({ page }) => {
    await createProject(page, 'Mi app');
    await openProject(page, 'Mi app');
    await addCard(page, 'En curso', 'Mi tarjeta');

    const card = cardIn(page, 'En curso', 'Mi tarjeta');
    const footer = card.locator('.ds-card__footer');
    await expect(footer).toContainText('Creada el 9 oct 2026');
    await expect(footer.locator('time')).toHaveText('Creada el 9 oct 2026');
    await expectDecorativeIcon(footer, 'calendar');

    // Editar la tarjeta (otro día) no cambia la fecha de creación.
    await page.clock.setFixedTime(new Date(2026, 9, 20, 9, 0));
    await card.getByRole('button', { name: 'Mi tarjeta', exact: true }).click();
    const edit = page.getByRole('dialog', { name: 'Editar tarjeta' });
    await edit.getByLabel('Título').fill('Renombrada');
    await edit.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(edit).toBeHidden();
    await expect(cardIn(page, 'En curso', 'Renombrada').locator('.ds-card__footer')).toContainText(
      'Creada el 9 oct 2026',
    );
  });

  test('"Archivar {título}" es un botón de solo icono que archiva la tarjeta', async ({ page }) => {
    await createProject(page, 'Mi app');
    await openProject(page, 'Mi app');
    await addCard(page, 'En curso', 'Mi tarjeta');

    const card = cardIn(page, 'En curso', 'Mi tarjeta');
    const button = page.getByRole('button', { name: 'Archivar Mi tarjeta', exact: true });
    await expect(button).toBeVisible();
    await expect(button).toHaveText('');
    await expectDecorativeIcon(button, 'archive');
    await expect(card.getByRole('button', { name: 'Archivar', exact: true })).toHaveCount(0);
    await expect(card.getByText('Archivar', { exact: true })).toHaveCount(0);

    await button.click();
    await expect(card).toHaveCount(0);
    await page.getByRole('link', { name: 'Tarjetas archivadas' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Tarjetas archivadas' })).toBeVisible();
    await expect(page.getByText('Mi tarjeta')).toBeVisible();
  });

  test('en un proyecto archivado el pie muestra la fecha pero no el botón de archivar', async ({ page }) => {
    await createProject(page, 'Viejo');
    await openProject(page, 'Viejo');
    await addCard(page, 'Sin empezar', 'Antigua');
    await page.getByRole('link', { name: /Volver a proyectos/ }).click();
    await page.getByRole('button', { name: 'Archivar Viejo' }).click();
    await page.getByRole('link', { name: 'Proyectos archivados' }).click();
    await page.getByRole('link', { name: 'Ver tablero de Viejo' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Viejo' })).toBeVisible();

    const card = cardIn(page, 'Sin empezar', 'Antigua');
    await expect(card.locator('.ds-card__footer')).toContainText('Creada el 9 oct 2026');
    await expect(page.getByRole('button', { name: /^Archivar/ })).toHaveCount(0);
  });
});
