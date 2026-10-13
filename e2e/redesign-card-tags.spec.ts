import { expect, test, type Page } from '@playwright/test';
import { addCard, column, createProject, expectDecorativeIcon, MODES, openProject, setMode, TOKENS } from './support/redesign';

// AC-052 (D-026, D-016): franja de prioridad e iconos de prioridad y tipo en la tarjeta del tablero.

const card = (page: Page, title: string) =>
  column(page, 'Sin empezar').getByRole('listitem', { name: title, exact: true }).locator('article');

const PRIORITIES = [
  { title: 'P-Alta', label: 'Alta', ds: 'high', icon: 'arrow-up' },
  { title: 'P-Media', label: 'Media', ds: 'medium', icon: 'equal' },
  { title: 'P-Baja', label: 'Baja', ds: 'low', icon: 'arrow-down' },
] as const;

const TYPES = [
  { label: 'Novedad', icon: 'sparkles' },
  { label: 'Mejora', icon: 'trending-up' },
  { label: 'Arreglo', icon: 'bug' },
  { label: 'Técnico', icon: 'wrench' },
] as const;

test.describe('AC-052: prioridad y tipo en la tarjeta', () => {
  test('franja superior por prioridad e iconos de prioridad y tipo, en claro y en oscuro', async ({ page }) => {
    await createProject(page, 'Mi app');
    await openProject(page, 'Mi app');
    for (const p of PRIORITIES) await addCard(page, 'Sin empezar', p.title, { priority: p.label });
    await addCard(page, 'Sin empezar', 'Sin-prio');
    for (const t of TYPES.slice(1)) await addCard(page, 'Sin empezar', `T-${t.label}`, { type: t.label });

    for (const mode of MODES) {
      await setMode(page, mode);
      for (const p of PRIORITIES) {
        await expect(card(page, p.title)).toHaveCSS('border-top-width', '4px');
        await expect(card(page, p.title)).toHaveCSS('border-top-color', TOKENS[mode].priority[p.ds]);
      }
      await expect(card(page, 'Sin-prio')).toHaveCSS('border-top-width', '1px');
      await expect(card(page, 'Sin-prio')).toHaveCSS('border-top-color', TOKENS[mode].borderDefault);
    }

    for (const p of PRIORITIES) {
      const badge = card(page, p.title).locator('.ds-badge', { hasText: p.label });
      await expect(badge).toHaveText(p.label);
      await expectDecorativeIcon(badge, p.icon);
    }
    for (const label of ['Alta', 'Media', 'Baja']) {
      await expect(card(page, 'Sin-prio').getByText(label, { exact: true })).toHaveCount(0);
    }

    const typed = [{ title: 'Sin-prio', ...TYPES[0] }, ...TYPES.slice(1).map((t) => ({ title: `T-${t.label}`, ...t }))];
    for (const t of typed) {
      const badge = card(page, t.title).locator('.ds-badge', { hasText: t.label });
      await expect(badge).toHaveText(t.label);
      await expectDecorativeIcon(badge, t.icon);
    }
  });

  test('cada chip del filtro muestra el icono de su tipo y el seleccionado además el check', async ({ page }) => {
    await createProject(page, 'Mi app');
    await openProject(page, 'Mi app');
    const filter = page.getByRole('group', { name: 'Filtrar por tipo' });

    for (const t of TYPES) {
      const chip = filter.getByRole('button', { name: t.label, exact: true });
      await expectDecorativeIcon(chip, t.icon);
      await expect(chip.locator('svg.lucide-check')).toBeHidden();
    }

    const arreglo = filter.getByRole('button', { name: 'Arreglo', exact: true });
    await arreglo.click();
    await expect(arreglo).toHaveAttribute('aria-pressed', 'true');
    await expect(arreglo.locator('svg.lucide-check')).toBeVisible();
    await expectDecorativeIcon(arreglo, 'check');
    await expect(filter.getByRole('button', { name: 'Mejora', exact: true }).locator('svg.lucide-check')).toBeHidden();
  });
});
