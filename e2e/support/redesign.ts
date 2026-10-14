import { expect, type Locator, type Page } from '@playwright/test';
import { chooseOption } from './select';

// Utilidades comunes de los e2e del rediseño visual (AC-047 … AC-057).

export type View = { url: string; heading: string };

/** Valores de los tokens de color usados en los checks, por modo. */
export const TOKENS = {
  light: {
    background: 'rgb(248, 250, 252)',
    actionPrimary: 'rgb(79, 70, 229)',
    actionTint: 'rgb(238, 242, 255)',
    surfaceRaised: 'rgb(255, 255, 255)',
    appbarBg: 'rgb(255, 255, 255)',
    appbarAccent: 'rgb(79, 70, 229)',
    borderDefault: 'rgb(226, 232, 240)',
    priority: { high: 'rgb(220, 38, 38)', medium: 'rgb(234, 88, 12)', low: 'rgb(77, 124, 15)' },
    status: {
      todo: { accent: 'rgb(100, 116, 139)', tint: 'rgb(241, 245, 249)', onTint: 'rgb(51, 65, 85)' },
      doing: { accent: 'rgb(37, 99, 235)', tint: 'rgb(219, 234, 254)', onTint: 'rgb(30, 64, 175)' },
      paused: { accent: 'rgb(234, 88, 12)', tint: 'rgb(255, 237, 213)', onTint: 'rgb(154, 52, 18)' },
      done: { accent: 'rgb(21, 128, 61)', tint: 'rgb(220, 252, 231)', onTint: 'rgb(22, 101, 52)' },
    },
  },
  dark: {
    background: 'rgb(15, 23, 42)',
    actionPrimary: 'rgb(139, 147, 250)',
    actionTint: 'rgb(30, 27, 75)',
    surfaceRaised: 'rgb(36, 49, 71)',
    appbarBg: 'rgb(30, 41, 59)',
    appbarAccent: 'rgb(139, 147, 250)',
    borderDefault: 'rgb(51, 65, 85)',
    priority: { high: 'rgb(248, 113, 113)', medium: 'rgb(251, 146, 60)', low: 'rgb(163, 230, 53)' },
    status: {
      todo: { accent: 'rgb(148, 163, 184)', tint: 'rgb(30, 41, 59)', onTint: 'rgb(226, 232, 240)' },
      doing: { accent: 'rgb(96, 165, 250)', tint: 'rgb(23, 37, 84)', onTint: 'rgb(191, 219, 254)' },
      paused: { accent: 'rgb(251, 146, 60)', tint: 'rgb(67, 20, 7)', onTint: 'rgb(254, 215, 170)' },
      done: { accent: 'rgb(74, 222, 128)', tint: 'rgb(5, 46, 22)', onTint: 'rgb(187, 247, 208)' },
    },
  },
} as const;

export type Mode = keyof typeof TOKENS;
export const MODES: Mode[] = ['light', 'dark'];

/** Estados en orden de columna, con su `status` del sistema de diseño. */
export const STATUSES = [
  { label: 'Sin empezar', ds: 'todo', icon: 'circle-dashed' },
  { label: 'En curso', ds: 'doing', icon: 'circle-dot' },
  { label: 'En pausa', ds: 'paused', icon: 'circle-pause' },
  { label: 'Finalizado', ds: 'done', icon: 'circle-check' },
] as const;

export const colorModeSelect = (page: Page) =>
  page.getByRole('banner').getByRole('combobox', { name: 'Modo de color' });

/** Fuerza el modo de color desde el selector de la cabecera. */
export async function setMode(page: Page, mode: Mode) {
  await chooseOption(page.getByRole('banner'), 'Modo de color', mode === 'dark' ? 'Oscuro' : 'Claro');
  await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
}

export async function createProject(page: Page, name: string) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Crear proyecto' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  await dialog.getByLabel('Nombre').fill(name);
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog).toBeHidden();
}

export async function openProject(page: Page, name: string) {
  await page.getByRole('button', { name, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
}

export const column = (page: Page, name: string) => page.getByRole('region', { name, exact: true });

/** Botón de crear tarjeta de una columna. */
export const addCardButton = (page: Page, columnName: string) =>
  column(page, columnName).getByRole('button', { name: 'Añadir tarjeta' });

/** Crea una tarjeta en una columna y, si se indica, le cambia tipo y prioridad. */
export async function addCard(
  page: Page,
  columnName: string,
  title: string,
  opts: { type?: string; priority?: string } = {},
) {
  await addCardButton(page, columnName).click();
  const dialog = page.getByRole('dialog', { name: 'Añadir tarjeta' });
  await dialog.getByLabel('Título').fill(title);
  await dialog.getByRole('button', { name: 'Añadir' }).click();
  await expect(dialog).toBeHidden();
  if (opts.type || opts.priority) {
    await column(page, columnName).getByRole('button', { name: title, exact: true }).click();
    const edit = page.getByRole('dialog', { name: 'Editar tarjeta' });
    if (opts.type) await chooseOption(edit, 'Tipo', opts.type);
    if (opts.priority) await chooseOption(edit, 'Prioridad', opts.priority);
    await edit.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(edit).toBeHidden();
  }
  // Cada creación queda en un milisegundo distinto (desempate por createdAt).
  await page.waitForTimeout(5);
}

/** Crea un proyecto y devuelve las 4 vistas con su encabezado de nivel 1. */
export async function setupViews(page: Page, name = 'Mi app'): Promise<View[]> {
  await createProject(page, name);
  await openProject(page, name);
  const boardUrl = page.url();
  return [
    { url: '/#/', heading: 'Proyectos' },
    { url: boardUrl, heading: name },
    { url: `${boardUrl}/archived`, heading: 'Tarjetas archivadas' },
    { url: '/#/archived', heading: 'Proyectos archivados' },
  ];
}

export async function gotoView(page: Page, view: View) {
  await page.goto(view.url);
  await expect(page.getByRole('heading', { level: 1, name: view.heading })).toBeVisible();
}

/** Comprueba que el `svg.lucide-<name>` existe dentro de `scope` y está oculto a lectores de pantalla. */
export async function expectDecorativeIcon(scope: Locator, name: string) {
  const icon = scope.locator(`svg.lucide-${name}`).first();
  await expect(icon).toBeAttached();
  const hidden = await icon.evaluate((el) => el.closest('[aria-hidden="true"]') !== null);
  expect(hidden, `svg.lucide-${name} debe estar dentro de aria-hidden`).toBe(true);
}
