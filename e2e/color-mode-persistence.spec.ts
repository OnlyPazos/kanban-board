import { expect, test, type FileChooser, type Page } from '@playwright/test';

// AC-043 (D-017): la preferencia de modo de color se recuerda entre sesiones
// (localStorage), no viaja en los exports, ninguna importación la cambia y,
// sin almacenamiento, funciona solo durante la sesión y sin errores.
const LIGHT_BACKGROUND = 'rgb(248, 250, 252)'; // #F8FAFC
const DARK_BACKGROUND = 'rgb(15, 23, 42)'; // #0F172A
const STORAGE_KEY = 'kanban-board:color-mode';

const colorModeSelect = (page: Page) => page.getByRole('banner').getByRole('combobox', { name: 'Modo de color' });
const projectList = (page: Page) => page.getByRole('region', { name: 'Proyectos', exact: true });
const storedMode = (page: Page) => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);

async function expectDark(page: Page) {
  await expect(colorModeSelect(page)).toHaveValue('dark');
  await expect(colorModeSelect(page).locator('option:checked')).toHaveText('Oscuro');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('body')).toHaveCSS('background-color', DARK_BACKGROUND);
}

async function expectAutoLight(page: Page) {
  await expect(colorModeSelect(page)).toHaveValue('auto');
  await expect(colorModeSelect(page).locator('option:checked')).toHaveText('Auto');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');
  await expect(page.locator('body')).toHaveCSS('background-color', LIGHT_BACKGROUND);
}

async function createProject(page: Page, name: string) {
  await page.getByRole('button', { name: 'Crear proyecto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  await dialog.getByLabel('Nombre').fill(name);
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog).toBeHidden();
}

/** Pulsa el botón y devuelve la ruta local y el texto del archivo descargado. */
async function download(page: Page, button: string): Promise<{ path: string; text: string }> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: button }).click();
  const file = await downloadPromise;
  const path = await file.path();
  if (!path) throw new Error('La descarga no se guardó');
  const stream: AsyncIterable<Uint8Array> = await file.createReadStream();
  const decoder = new TextDecoder();
  let text = '';
  for await (const chunk of stream) text += decoder.decode(chunk, { stream: true });
  text += decoder.decode();
  return { path, text };
}

type FilePayload = Extract<Parameters<FileChooser['setFiles']>[0], { buffer: unknown }>;
type ChooserFile = string | FilePayload;
// El proyecto no incluye los tipos de Node: se toma `Buffer` del entorno de Playwright.
const NodeBuffer = (globalThis as unknown as { Buffer: { from(text: string, encoding: 'utf-8'): FilePayload['buffer'] } })
  .Buffer;

/** Pulsa "Importar" en la lista de proyectos y elige el archivo. */
async function importFile(page: Page, file: ChooserFile) {
  const chooserPromise = page.waitForEvent('filechooser');
  await projectList(page).getByRole('button', { name: 'Importar' }).click();
  await (await chooserPromise).setFiles(file);
}

test('AC-043: tras elegir "Oscuro" y recargar sigue en oscuro con el sistema en claro', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expectAutoLight(page);
  expect(await storedMode(page)).toBeNull();

  await colorModeSelect(page).selectOption({ label: 'Oscuro' });
  await expectDark(page);
  expect(await storedMode(page)).toBe('dark');

  await page.reload();
  await expectDark(page);

  // El modo ya está aplicado antes de montar la app (script inline de index.html).
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      (window as unknown as { __themeAtLoad: string | null }).__themeAtLoad =
        document.documentElement.getAttribute('data-theme');
    });
  });
  await page.reload();
  await expectDark(page);
  expect(await page.evaluate(() => (window as unknown as { __themeAtLoad: string | null }).__themeAtLoad)).toBe(
    'dark',
  );

  // Volver a "Auto" elimina la preferencia: al recargar sigue al sistema.
  await colorModeSelect(page).selectOption({ label: 'Auto' });
  await expect.poll(() => storedMode(page)).toBeNull();
  await page.reload();
  await expectAutoLight(page);
});

test('AC-043: "Claro" también se recuerda con el sistema en oscuro', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await colorModeSelect(page).selectOption({ label: 'Claro' });
  await page.reload();
  await expect(colorModeSelect(page)).toHaveValue('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('body')).toHaveCSS('background-color', LIGHT_BACKGROUND);
});

test('AC-043: la preferencia no aparece en los exports e importar cualquier archivo no la cambia', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await createProject(page, 'Mi app');
  await colorModeSelect(page).selectOption({ label: 'Oscuro' });
  await expectDark(page);

  // Export completo y de proyecto: solo datos del modelo, sin la preferencia.
  const full = await download(page, 'Exportar todo');
  await projectList(page).getByRole('button', { name: 'Mi app', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mi app' })).toBeVisible();
  const project = await download(page, 'Exportar proyecto');
  await page.getByRole('link', { name: /volver a proyectos/i }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Proyectos' })).toBeVisible();

  for (const file of [full, project]) {
    expect(file.text).not.toMatch(/color-?mode|theme|"dark"|"light"|"auto"/i);
    expect(Object.keys(JSON.parse(file.text) as object).sort()).toEqual([
      'cards',
      'exportedAt',
      'formatVersion',
      'kind',
      'projects',
    ]);
  }

  // Importar el export completo (confirmando el reemplazo): sigue en Oscuro.
  await importFile(page, full.path);
  const confirm = page.getByRole('dialog', { name: '¿Importar y reemplazar todos tus datos?' });
  await confirm.getByRole('button', { name: 'Reemplazar' }).click();
  await expect(confirm).toBeHidden();
  await expect(projectList(page).getByRole('button', { name: 'Mi app', exact: true })).toBeVisible();
  await expectDark(page);

  // Importar el export de proyecto (mismo id: "Reemplazar"): sigue en Oscuro.
  await importFile(page, project.path);
  const conflict = page.getByRole('dialog', { name: 'Este proyecto ya existe' });
  await conflict.getByRole('button', { name: 'Reemplazar' }).click();
  await expect(conflict).toBeHidden();
  await expectDark(page);

  // Un archivo con campos de modo de color ajenos al formato tampoco la cambia.
  const tampered = JSON.parse(project.text) as Record<string, unknown> & { projects: Record<string, unknown>[] };
  tampered.colorMode = 'light';
  tampered[STORAGE_KEY] = 'light';
  tampered.projects = tampered.projects.map((p) => ({ ...p, colorMode: 'light', theme: 'light' }));
  await importFile(page, {
    name: 'manipulado.json',
    mimeType: 'application/json',
    buffer: NodeBuffer.from(JSON.stringify(tampered), 'utf-8'),
  });
  await conflict.getByRole('button', { name: 'Reemplazar' }).click();
  await expect(conflict).toBeHidden();
  await expectDark(page);

  // Un archivo no válido (diálogo de error) tampoco la cambia.
  await importFile(page, {
    name: 'roto.json',
    mimeType: 'application/json',
    buffer: NodeBuffer.from('{"theme":"light"', 'utf-8'),
  });
  const failure = page.getByRole('dialog', { name: 'No se pudo importar el archivo' });
  await expect(failure).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(failure).toBeHidden();
  await expectDark(page);

  expect(await storedMode(page)).toBe('dark');
  await page.reload();
  await expectDark(page);
});

test('AC-043: con localStorage bloqueado el selector funciona en la sesión, al recargar vuelve a "Auto" y no hay errores', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const blocked = () => {
      throw new DOMException('Almacenamiento bloqueado', 'SecurityError');
    };
    Storage.prototype.getItem = blocked;
    Storage.prototype.setItem = blocked;
    Storage.prototype.removeItem = blocked;
  });
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expectAutoLight(page);

  await colorModeSelect(page).selectOption({ label: 'Oscuro' });
  await expectDark(page);
  await colorModeSelect(page).selectOption({ label: 'Claro' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await colorModeSelect(page).selectOption({ label: 'Oscuro' });
  await expectDark(page);

  await page.reload();
  await expectAutoLight(page);

  // Ningún error: ni avisos en la interfaz ni en la consola.
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});
