import { expect, test, type Page } from '@playwright/test';
import { addCard, column, createProject, expectDecorativeIcon, MODES, openProject, setMode, TOKENS } from './support/redesign';

// AC-056: las tarjetas archivadas se presentan con la franja de prioridad y los iconos de AC-052,
// y conservan estado, fechas y los botones "Restaurar"/"Borrar definitivamente" con sus iconos.

const CARDS = [
  { title: 'P-Alta', priority: 'Alta', ds: 'high', icon: 'arrow-up', type: 'Arreglo', typeIcon: 'bug' },
  { title: 'P-Media', priority: 'Media', ds: 'medium', icon: 'equal', type: 'Mejora', typeIcon: 'trending-up' },
  { title: 'P-Baja', priority: 'Baja', ds: 'low', icon: 'arrow-down', type: 'Técnico', typeIcon: 'wrench' },
] as const;

const archivedCard = (page: Page, title: string) =>
  page.getByRole('listitem', { name: title, exact: true }).locator('article');

test('AC-056: tarjetas archivadas con franja de prioridad, iconos, estado, fechas y botones con icono', async ({
  page,
}) => {
  await createProject(page, 'Mi app');
  await openProject(page, 'Mi app');
  for (const c of CARDS) await addCard(page, 'En curso', c.title, { type: c.type, priority: c.priority });
  await addCard(page, 'En curso', 'Sin-prio');
  for (const title of [...CARDS.map((c) => c.title), 'Sin-prio']) {
    await column(page, 'En curso').getByRole('button', { name: `Archivar ${title}`, exact: true }).click();
  }
  await page.getByRole('link', { name: 'Tarjetas archivadas', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Tarjetas archivadas' })).toBeVisible();

  for (const mode of MODES) {
    await setMode(page, mode);
    for (const c of CARDS) {
      await expect(archivedCard(page, c.title)).toHaveCSS('border-top-width', '4px');
      await expect(archivedCard(page, c.title)).toHaveCSS('border-top-color', TOKENS[mode].priority[c.ds]);
    }
    await expect(archivedCard(page, 'Sin-prio')).toHaveCSS('border-top-width', '1px');
    await expect(archivedCard(page, 'Sin-prio')).toHaveCSS('border-top-color', TOKENS[mode].borderDefault);
  }

  for (const c of CARDS) {
    const card = archivedCard(page, c.title);
    await expectDecorativeIcon(card.locator('.ds-badge', { hasText: c.priority }), c.icon);
    await expectDecorativeIcon(card.locator('.ds-badge', { hasText: c.type }), c.typeIcon);
  }
  const plain = archivedCard(page, 'Sin-prio');
  await expectDecorativeIcon(plain.locator('.ds-badge', { hasText: 'Novedad' }), 'sparkles');
  for (const label of ['Alta', 'Media', 'Baja']) await expect(plain.getByText(label, { exact: true })).toHaveCount(0);

  for (const title of [...CARDS.map((c) => c.title), 'Sin-prio']) {
    const card = archivedCard(page, title);
    await expect(card.getByRole('term')).toHaveText(['Estado', 'Creada', 'Última modificación']);
    await expect(card.getByRole('definition').first()).toHaveText('En curso');
    await expect(card.locator('time')).toHaveCount(2);
    const restore = page.getByRole('button', { name: `Restaurar ${title}`, exact: true });
    const remove = page.getByRole('button', { name: `Borrar definitivamente ${title}`, exact: true });
    await expectDecorativeIcon(restore, 'archive-restore');
    await expectDecorativeIcon(remove, 'trash-2');
  }
});
