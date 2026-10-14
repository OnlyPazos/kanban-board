import { expect, type Page } from '@playwright/test';

/**
 * Menú "Modo de color" de la cabecera (AC-058, D-035): `MenuButton` del
 * sistema de diseño. Botón de solo icono que abre un `menu` con
 * `menuitemradio` "Auto", "Claro" y "Oscuro".
 */
export type ColorModeLabel = 'Auto' | 'Claro' | 'Oscuro';

export const COLOR_MODE_ICON: Record<ColorModeLabel, string> = { Auto: 'monitor', Claro: 'sun', Oscuro: 'moon' };

export const colorModeButton = (page: Page) => page.getByRole('banner').getByRole('button', { name: 'Modo de color' });

export const colorModeMenu = (page: Page) => page.getByRole('menu', { name: 'Modo de color' });

/** Abre el menú y elige `label`; el menú se cierra y el foco vuelve al botón. */
export async function chooseColorMode(page: Page, label: ColorModeLabel) {
  await colorModeButton(page).click();
  await colorModeMenu(page).getByRole('menuitemradio', { name: label, exact: true }).click();
  await expect(colorModeMenu(page)).toBeHidden();
}

/** La preferencia actual es `label`: icono del botón y `aria-checked` en su opción. */
export async function expectColorMode(page: Page, label: ColorModeLabel) {
  const button = colorModeButton(page);
  await expect(button.locator(`svg.lucide-${COLOR_MODE_ICON[label]}`)).toHaveCount(1);
  await button.click();
  const menu = colorModeMenu(page);
  await expect(menu.getByRole('menuitemradio', { name: label, exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(menu.locator('[role="menuitemradio"][aria-checked="true"]')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
}
