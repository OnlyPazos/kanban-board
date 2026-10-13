import { expect, test } from '@playwright/test';
import {
  addCard,
  column,
  createProject,
  expectDecorativeIcon,
  MODES,
  openProject,
  setMode,
  STATUSES,
  TOKENS,
} from './support/redesign';

// AC-049 (D-023, D-024): columnas del tablero con `Column` del sistema de diseño.

test.describe('AC-049: columnas con Column', () => {
  test('cada columna tiene el color y el icono de su estado, en claro y en oscuro', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await createProject(page, 'Mi app');
    await openProject(page, 'Mi app');

    const regions = page.getByRole('region');
    await expect(regions).toHaveCount(4);

    for (const status of STATUSES) {
      const region = column(page, status.label);
      await expect(region.getByRole('heading', { level: 2, name: status.label })).toBeVisible();
      await expectDecorativeIcon(region.locator('header'), status.icon);
    }

    for (const mode of MODES) {
      await setMode(page, mode);
      for (const status of STATUSES) {
        const region = column(page, status.label);
        const colors = TOKENS[mode].status[status.ds];
        await expect(region.locator('header')).toHaveCSS('background-color', colors.tint);
        await expect(region).toHaveCSS('border-top-width', '4px');
        await expect(region).toHaveCSS('border-top-color', colors.accent);
      }
    }
  });

  test('el contador muestra las tarjetas visibles y su texto accesible', async ({ page }) => {
    await createProject(page, 'Mi app');
    await openProject(page, 'Mi app');
    await addCard(page, 'Sin empezar', 'A');
    await addCard(page, 'Sin empezar', 'B');
    await addCard(page, 'Finalizado', 'C');

    const counter = (name: string) => column(page, name).locator('header');
    await expect(counter('Sin empezar')).toContainText('2');
    await expect(counter('Sin empezar')).toContainText('2 tarjetas');
    await expect(counter('En pausa')).toContainText('0 tarjetas');
    await expect(counter('Finalizado')).toContainText('1 tarjeta');
    await expect(counter('Finalizado')).not.toContainText('1 tarjetas');
  });

  test('con el filtro por tipo, el contador cuenta solo las tarjetas visibles', async ({ page }) => {
    await createProject(page, 'Mi app');
    await openProject(page, 'Mi app');
    await addCard(page, 'En curso', 'Uno');
    await addCard(page, 'En curso', 'Dos', { type: 'Mejora' });
    await addCard(page, 'En curso', 'Tres', { type: 'Arreglo' });

    const header = column(page, 'En curso').locator('header');
    await expect(header).toContainText('3 tarjetas');

    const filter = page.getByRole('group', { name: 'Filtrar por tipo' });
    await filter.getByRole('button', { name: 'Arreglo' }).click();
    await expect(column(page, 'En curso').getByRole('listitem')).toHaveCount(1);
    await expect(header).toContainText('1 tarjeta');

    await filter.getByRole('button', { name: 'Arreglo' }).click();
    await expect(header).toContainText('3 tarjetas');
  });
});
