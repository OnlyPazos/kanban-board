import { expect, test } from '@playwright/test';
import { addCard, createProject, expectDecorativeIcon, MODES, openProject, setMode, STATUSES, TOKENS } from './support/redesign';

// AC-054 (D-029): recuento por estado en la lista de proyectos como pastillas con el color e icono del estado.

test.describe('AC-054: pastillas de estado en la lista de proyectos', () => {
  test('4 pastillas en orden con icono, nombre y número, y colores status.* en claro y en oscuro', async ({ page }) => {
    await createProject(page, 'Mi app');
    await openProject(page, 'Mi app');
    await addCard(page, 'Sin empezar', 'A');
    await addCard(page, 'Sin empezar', 'B');
    await addCard(page, 'En curso', 'C');
    await page.getByRole('link', { name: /Volver a proyectos/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Proyectos' })).toBeVisible();

    const item = page.getByRole('list').getByRole('listitem').filter({ hasText: 'Mi app' });
    const pills = item.locator('.status-counts__item');
    await expect(pills).toHaveCount(4);
    await expect(item.getByRole('term')).toHaveText(STATUSES.map((s) => s.label));
    await expect(item.getByRole('definition')).toHaveText(['2', '1', '0', '0']);

    for (const [i, status] of STATUSES.entries()) {
      await expectDecorativeIcon(pills.nth(i), status.icon);
      await expect(pills.nth(i)).toBeVisible();
    }

    for (const mode of MODES) {
      await setMode(page, mode);
      for (const [i, status] of STATUSES.entries()) {
        const colors = TOKENS[mode].status[status.ds];
        await expect(pills.nth(i)).toHaveCSS('background-color', colors.tint);
        await expect(pills.nth(i)).toHaveCSS('color', colors.onTint);
        await expect(pills.nth(i).locator(`svg.lucide-${status.icon}`)).toHaveCSS('color', colors.accent);
      }
    }
  });
});
