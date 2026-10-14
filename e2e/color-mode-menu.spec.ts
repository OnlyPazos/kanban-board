import { expect, test, type Page } from '@playwright/test';
import { COLOR_MODE_ICON, colorModeButton, colorModeMenu, type ColorModeLabel } from './support/color-mode';
import { expectDecorativeIcon, gotoView, setupViews } from './support/redesign';

// AC-058 (D-035): menú "Modo de color" (MenuButton) en la cabecera de las 4 vistas.

const LABELS: ColorModeLabel[] = ['Auto', 'Claro', 'Oscuro'];
const THEME: Record<ColorModeLabel, string | null> = { Auto: null, Claro: 'light', Oscuro: 'dark' };

const item = (page: Page, label: ColorModeLabel) =>
  colorModeMenu(page).getByRole('menuitemradio', { name: label, exact: true });

async function expectTheme(page: Page, label: ColorModeLabel) {
  const theme = THEME[label];
  if (theme) await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  else await expect(page.locator('html')).not.toHaveAttribute('data-theme');
}

/** Icono del botón: el de `label` y ninguno de los otros dos. */
async function expectButtonIcon(page: Page, label: ColorModeLabel) {
  const button = colorModeButton(page);
  await expectDecorativeIcon(button, COLOR_MODE_ICON[label]);
  for (const other of LABELS.filter((l) => l !== label)) {
    await expect(button.locator(`svg.lucide-${COLOR_MODE_ICON[other]}`)).toHaveCount(0);
  }
}

/** Botón cerrado, sin combobox ni texto visible "Modo de color". */
async function expectClosedButton(page: Page) {
  const button = colorModeButton(page);
  await expect(button).toBeVisible();
  await expect(button).toHaveAttribute('aria-haspopup', 'menu');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('combobox', { name: 'Modo de color' })).toHaveCount(0);
  await expect(page.getByText('Modo de color', { exact: true })).toHaveCount(0);
}

test.describe('AC-058: menú de modo de color', () => {
  test('(1)(2)(3) en las 4 vistas: icono según la preferencia, menú con 3 opciones y elegir con el ratón', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    const views = await setupViews(page);

    for (const view of views) {
      await gotoView(page, view);
      await expectClosedButton(page);
      await expectButtonIcon(page, 'Auto');
      // Marca para detectar una recarga.
      await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));

      let before: ColorModeLabel = 'Auto';
      for (const label of ['Oscuro', 'Claro', 'Auto'] as const) {
        await colorModeButton(page).click();
        await expect(colorModeButton(page)).toHaveAttribute('aria-expanded', 'true');
        const menu = colorModeMenu(page);
        await expect(menu).toBeVisible();
        await expect(menu.getByRole('menuitemradio')).toHaveText(LABELS);
        for (const l of LABELS) {
          await expectDecorativeIcon(item(page, l), COLOR_MODE_ICON[l]);
          await expect(item(page, l)).toHaveAttribute('aria-checked', l === before ? 'true' : 'false');
        }

        await item(page, label).click();
        await expect(menu).toBeHidden();
        await expect(colorModeButton(page)).toBeFocused();
        await expect(colorModeButton(page)).toHaveAttribute('aria-expanded', 'false');
        await expectButtonIcon(page, label);
        await expectTheme(page, label);
        before = label;
      }
      expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);
    }
  });

  test('(4) teclado: Tab, Intro/Espacio/↓ abren en la opción elegida, ↓ ↑ dan la vuelta, Escape y clic fuera no cambian', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    const views = await setupViews(page);

    for (const view of views) {
      await gotoView(page, view);
      await page.reload();
      await expect(page.getByRole('heading', { level: 1, name: view.heading })).toBeVisible();
      const button = colorModeButton(page);

      // Se alcanza con Tab (tras el enlace del título, AC-048).
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await expect(button).toBeFocused();

      // Intro abre con el foco en la opción elegida (Auto); ↓ ↑ dan la vuelta.
      await page.keyboard.press('Enter');
      await expect(item(page, 'Auto')).toBeFocused();
      await page.keyboard.press('ArrowUp');
      await expect(item(page, 'Oscuro')).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(item(page, 'Auto')).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(item(page, 'Claro')).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(colorModeMenu(page)).toBeHidden();
      await expect(button).toBeFocused();
      await expectTheme(page, 'Claro');
      await expectButtonIcon(page, 'Claro');

      // Espacio abre en la elegida (Claro); Escape cierra sin cambiar y devuelve el foco.
      await page.keyboard.press(' ');
      await expect(item(page, 'Claro')).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(item(page, 'Oscuro')).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(colorModeMenu(page)).toBeHidden();
      await expect(button).toBeFocused();
      await expectTheme(page, 'Claro');

      // ↓ abre en la elegida; Intro elige.
      await page.keyboard.press('ArrowDown');
      await expect(item(page, 'Claro')).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown'); // Oscuro → da la vuelta → Auto
      await expect(item(page, 'Auto')).toBeFocused();
      await page.keyboard.press('Enter');
      await expectTheme(page, 'Auto');

      // Pulsar fuera del menú lo cierra sin cambiar nada.
      await button.click();
      await expect(colorModeMenu(page)).toBeVisible();
      await page.getByRole('heading', { level: 1, name: view.heading }).click();
      await expect(colorModeMenu(page)).toBeHidden();
      await expectTheme(page, 'Auto');
      await expectButtonIcon(page, 'Auto');
    }
  });

  test('(5) con 375 px: sin scroll horizontal, botón completo de al menos 44 × 44 y menú dentro del viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.emulateMedia({ colorScheme: 'light' });
    const views = await setupViews(page);

    for (const view of views) {
      await gotoView(page, view);
      await expectClosedButton(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

      const box = await colorModeButton(page).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(375);
      expect(box!.y + box!.height).toBeLessThanOrEqual(667);
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);

      await colorModeButton(page).click();
      await expect(colorModeMenu(page)).toBeVisible();
      for (const label of LABELS) {
        const b = await item(page, label).boundingBox();
        expect(b).not.toBeNull();
        expect(b!.x).toBeGreaterThanOrEqual(0);
        expect(b!.y).toBeGreaterThanOrEqual(0);
        expect(b!.x + b!.width).toBeLessThanOrEqual(375);
        expect(b!.y + b!.height).toBeLessThanOrEqual(667);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
      await page.keyboard.press('Escape');
      await expect(colorModeMenu(page)).toBeHidden();
    }
  });
});
