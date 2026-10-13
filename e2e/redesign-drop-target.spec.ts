import { expect, test, type Locator, type Page } from '@playwright/test';
import { addCard, column, createProject, expectDecorativeIcon, openProject, setMode, TOKENS } from './support/redesign';

// AC-051 (D-023): columna vacía ("Sin tarjetas") y destino de arrastre con `Column` y `DropPlaceholder`.

const light = TOKENS.light;
const placeholders = (scope: Locator) => scope.locator('.ds-drop-placeholder');
const activeHole = (page: Page) => page.locator('.ds-drop-placeholder--active');
const emptyLabel = (page: Page, name: string) => column(page, name).getByText('Sin tarjetas', { exact: true });

async function centreOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('El elemento no es visible');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Coge la tarjeta por su borde superior (el título es un botón) y la lleva, sin soltar, al centro de `target`. */
async function dragOver(page: Page, card: Locator, target: Locator) {
  const box = await card.boundingBox();
  if (!box) throw new Error('Tarjeta no visible');
  const from = { x: box.x + box.width / 2, y: box.y + 6 };
  const to = await centreOf(target);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 5, from.y + 5, { steps: 5 });
  // La librería decide el destino por el centro de la tarjeta, que va desplazado respecto al puntero.
  await page.mouse.move(to.x, to.y - (box.height / 2 - 6), { steps: 25 });
  await page.waitForTimeout(150);
}

async function expectNoDropTarget(page: Page) {
  for (const name of ['Sin empezar', 'En curso', 'En pausa', 'Finalizado']) {
    await expect(column(page, name)).not.toHaveCSS('border-left-color', light.actionPrimary);
  }
  await expect(activeHole(page)).toHaveCount(0);
}

test.describe('AC-051: columna vacía y destino de arrastre', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
  });

  test('una columna vacía muestra "Sin tarjetas" con el icono inbox y borde punteado', async ({ page }) => {
    await createProject(page, 'Mi app');
    await openProject(page, 'Mi app');
    await setMode(page, 'light');
    await addCard(page, 'Sin empezar', 'Uno');

    const empty = column(page, 'En pausa');
    await expect(emptyLabel(page, 'En pausa')).toBeVisible();
    await expect(placeholders(empty)).toHaveCSS('border-top-style', 'dashed');
    await expectDecorativeIcon(empty, 'inbox');
    await expect(emptyLabel(page, 'Sin empezar')).toHaveCount(0);

    // Con el filtro por tipo que oculta todas sus tarjetas, la columna también se ve vacía.
    await page.getByRole('group', { name: 'Filtrar por tipo' }).getByRole('button', { name: 'Arreglo' }).click();
    await expect(column(page, 'Sin empezar').getByRole('listitem')).toHaveCount(0);
    await expect(emptyLabel(page, 'Sin empezar')).toBeVisible();
    await expect(placeholders(column(page, 'Sin empezar'))).toHaveCSS('border-top-style', 'dashed');
  });

  test('al arrastrar con el ratón, la columna destino y el hueco se marcan; al soltar desaparecen', async ({ page }) => {
    await createProject(page, 'Mi app');
    await openProject(page, 'Mi app');
    await setMode(page, 'light');
    await addCard(page, 'Sin empezar', 'Mover');

    const target = column(page, 'En curso');
    await expect(emptyLabel(page, 'En curso')).toBeVisible();
    await dragOver(page, column(page, 'Sin empezar').getByRole('listitem', { name: 'Mover' }), target);

    for (const side of ['left', 'right', 'bottom']) {
      await expect(target).toHaveCSS(`border-${side}-color`, light.actionPrimary);
    }
    const hole = activeHole(page);
    await expect(hole).toHaveCount(1);
    await expect(target.locator('.ds-drop-placeholder--active')).toBeVisible();
    await expect(hole).toHaveCSS('border-top-style', 'dashed');
    await expect(hole).toHaveCSS('border-top-color', light.actionPrimary);
    await expect(hole).toHaveCSS('background-color', light.actionTint);
    await expectDecorativeIcon(hole, 'arrow-down-to-line');
    await expect(emptyLabel(page, 'En curso')).toHaveCount(0);
    // La tarjeta que sigue al puntero conserva el aspecto `dragging` de Card.
    await expect(page.locator('#dnd-action-dragged-el article')).toHaveClass(/ds-card--dragging/);

    await page.mouse.up();
    await expect(target.getByRole('heading', { level: 3 })).toHaveText(['Mover']);
    await expectNoDropTarget(page);
    await expect(emptyLabel(page, 'En curso')).toHaveCount(0);
    for (const name of ['Sin empezar', 'En pausa', 'Finalizado']) {
      await expect(emptyLabel(page, name)).toBeVisible();
    }
  });

  test('tras soltar con Escape un arrastre de teclado no queda ningún destino ni hueco', async ({ page }) => {
    await createProject(page, 'Mi app');
    await openProject(page, 'Mi app');
    await setMode(page, 'light');
    await addCard(page, 'Sin empezar', 'Teclado');
    await page.reload();

    const card = column(page, 'Sin empezar').getByRole('listitem', { name: 'Teclado' });
    await card.focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Escape');

    // Lo que se comprueba es el estado tras soltar, no la columna donde cae la tarjeta (eso es AC-017):
    // la tarjeta está una sola vez y "Sin tarjetas" aparece justo en las columnas que no la tienen.
    const items = page.getByRole('listitem', { name: 'Teclado', exact: true });
    await expect(items).toHaveCount(1);
    await expectNoDropTarget(page);
    for (const name of ['Sin empezar', 'En curso', 'En pausa', 'Finalizado']) {
      const hasCard = (await column(page, name).getByRole('listitem', { name: 'Teclado' }).count()) === 1;
      await expect(emptyLabel(page, name)).toHaveCount(hasCard ? 0 : 1);
    }
  });
});
