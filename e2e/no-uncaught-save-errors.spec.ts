import { expect, test, type Download, type FileChooser, type Locator, type Page } from '@playwright/test';
import { chooseOption } from './support/select';

/**
 * AC-044: con el almacenamiento forzado a fallar, ningún flujo que escribe
 * datos produce un error no controlado (`pageerror`, "Uncaught" o
 * "Uncaught (in promise)"), y se mantiene lo visible de AC-035.
 *
 * Mecanismo de `save-error.spec.ts`, ampliado a todas las escrituras de
 * IndexedDB: `put`, `add`, `delete` y `clear` lanzan `QuotaExceededError`
 * mientras `window.__failWrites` sea `true`. Los `console.error` y
 * `console.warn` controlados de la app están permitidos.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const flags = window as unknown as { __failWrites?: boolean };
    const proto = IDBObjectStore.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;
    for (const method of ['put', 'add', 'delete', 'clear']) {
      const original = proto[method]!;
      proto[method] = function (this: IDBObjectStore, ...args: unknown[]) {
        if (flags.__failWrites) throw new DOMException('Cuota excedida', 'QuotaExceededError');
        return original.apply(this, args);
      };
    }
  });
});

const setFailWrites = (page: Page, fail: boolean) =>
  page.evaluate((value) => {
    (window as unknown as { __failWrites?: boolean }).__failWrites = value;
  }, fail);

/** Registra los errores no controlados de la página desde este momento. */
function watchUncaught(page: Page) {
  const uncaught: string[] = [];
  page.on('pageerror', (error) => uncaught.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.text().includes('Uncaught')) uncaught.push(`console.${message.type()}: ${message.text()}`);
  });
  return {
    async expectNone() {
      // Margen para que un rechazo sin capturar llegue a notificarse.
      await page.waitForTimeout(300);
      expect(uncaught).toEqual([]);
    },
  };
}

const saveErrorAlert = (page: Page) => page.getByRole('alert').filter({ hasText: 'No se pudieron guardar los cambios' });

/** Lo visible de AC-035: el aviso de error de guardado con "Exportar ahora". */
async function expectSaveErrorNotice(page: Page) {
  const alert = saveErrorAlert(page);
  await expect(alert).toBeVisible();
  await expect(alert.getByRole('button', { name: 'Exportar ahora' })).toBeVisible();
}

const projectList = (page: Page) => page.getByRole('region', { name: 'Proyectos', exact: true });
const projectButton = (page: Page, name: string) => projectList(page).getByRole('button', { name, exact: true });
const column = (page: Page, name: string) => page.getByRole('region', { name });
const cardIn = (page: Page, columnName: string, title: string) =>
  column(page, columnName).getByRole('listitem', { name: title, exact: true });
const titlesIn = (page: Page, name: string) => column(page, name).getByRole('heading', { level: 3 });

async function createProject(page: Page, name: string) {
  await page.getByRole('button', { name: 'Crear proyecto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  await dialog.getByLabel('Nombre').fill(name);
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog).toBeHidden();
  await expect(projectButton(page, name)).toBeVisible();
}

async function openProject(page: Page, name: string) {
  await projectButton(page, name).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
}

async function backToList(page: Page) {
  await page.getByRole('link', { name: /volver a proyectos/i }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Proyectos' })).toBeVisible();
}

async function addCard(page: Page, columnName: string, title: string) {
  await column(page, columnName).getByRole('button', { name: 'Añadir tarjeta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Añadir tarjeta' });
  await dialog.getByLabel('Título').fill(title);
  await dialog.getByRole('button', { name: 'Añadir' }).click();
  await expect(dialog).toBeHidden();
  await expect(cardIn(page, columnName, title)).toHaveCount(1);
}

/** Proyecto "Mi app" abierto, con la tarjeta "Login" en "Sin empezar". */
async function boardWithCard(page: Page) {
  await page.goto('/');
  await createProject(page, 'Mi app');
  await openProject(page, 'Mi app');
  await addCard(page, 'Sin empezar', 'Login');
}

async function readDownload(download: Download): Promise<string> {
  const stream: AsyncIterable<Uint8Array> = await download.createReadStream();
  const decoder = new TextDecoder();
  let text = '';
  for await (const chunk of stream) text += decoder.decode(chunk, { stream: true });
  return text + decoder.decode();
}

async function exportFrom(page: Page, button: string): Promise<string> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: button }).click();
  return readDownload(await downloadPromise);
}

type FilePayload = Extract<Parameters<FileChooser['setFiles']>[0], { buffer: unknown }>;
// El proyecto no incluye los tipos de Node: se toma `Buffer` del entorno de Playwright.
const NodeBuffer = (globalThis as unknown as { Buffer: { from(text: string, encoding: 'utf-8'): FilePayload['buffer'] } })
  .Buffer;

async function importText(page: Page, content: string) {
  const chooserPromise = page.waitForEvent('filechooser');
  await projectList(page).getByRole('button', { name: 'Importar' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: 'import.json', mimeType: 'application/json', buffer: NodeBuffer.from(content, 'utf-8') });
}

type ExportData = {
  projects: { id: string; name: string }[];
  cards: { id: string; projectId: string }[];
};

/** Export de "Mi app" (con "Login") y vuelta a la lista de proyectos. */
async function projectExport(page: Page): Promise<ExportData & Record<string, unknown>> {
  await boardWithCard(page);
  const text = await exportFrom(page, 'Exportar proyecto');
  await backToList(page);
  return JSON.parse(text);
}

test.describe('AC-044: proyectos', () => {
  test('crear proyecto: diálogo abierto con lo escrito, aviso y sin errores no controlados', async ({ page }) => {
    await page.goto('/');
    await createProject(page, 'Otra');
    const errors = watchUncaught(page);
    await setFailWrites(page, true);

    await page.getByRole('button', { name: 'Crear proyecto' }).click();
    const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
    await dialog.getByLabel('Nombre').fill('Nueva');
    await dialog.getByRole('button', { name: 'Crear' }).click();

    await expectSaveErrorNotice(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Nombre')).toHaveValue('Nueva');
    await expect(dialog.getByRole('button', { name: 'Crear' })).not.toHaveAttribute('aria-busy');
    await expect(projectButton(page, 'Nueva')).toHaveCount(0);
    await errors.expectNone();
  });

  test('editar proyecto: diálogo abierto con lo escrito, aviso y sin errores no controlados', async ({ page }) => {
    await page.goto('/');
    await createProject(page, 'Mi app');
    await openProject(page, 'Mi app');
    const errors = watchUncaught(page);
    await setFailWrites(page, true);

    await page.getByRole('button', { name: 'Editar proyecto' }).click();
    const dialog = page.getByRole('dialog', { name: 'Editar proyecto' });
    await dialog.getByLabel('Nombre').fill('Renombrado');
    await dialog.getByRole('button', { name: 'Guardar cambios' }).click();

    await expectSaveErrorNotice(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Nombre')).toHaveValue('Renombrado');
    await expect(dialog.getByRole('button', { name: 'Guardar cambios' })).not.toHaveAttribute('aria-busy');
    await expect(page.getByRole('heading', { level: 1, name: 'Mi app' })).toBeVisible();
    await errors.expectNone();
  });

  test('archivar proyecto: sigue en la lista, aviso y sin errores no controlados', async ({ page }) => {
    await page.goto('/');
    await createProject(page, 'Mi app');
    const errors = watchUncaught(page);
    await setFailWrites(page, true);

    await page.getByRole('button', { name: 'Archivar Mi app' }).click();

    await expectSaveErrorNotice(page);
    await expect(projectButton(page, 'Mi app')).toBeVisible();
    await errors.expectNone();
  });

  test('restaurar y borrar definitivamente proyecto: sigue archivado, aviso y sin errores no controlados', async ({
    page,
  }) => {
    await page.goto('/');
    await createProject(page, 'Mi app');
    await page.getByRole('button', { name: 'Archivar Mi app' }).click();
    await expect(projectButton(page, 'Mi app')).toHaveCount(0);
    await page.getByRole('link', { name: 'Proyectos archivados' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Proyectos archivados' })).toBeVisible();
    const errors = watchUncaught(page);
    await setFailWrites(page, true);

    await page.getByRole('button', { name: 'Restaurar Mi app' }).click();
    await expectSaveErrorNotice(page);
    await expect(page.getByRole('listitem', { name: 'Mi app' })).toHaveCount(1);
    await errors.expectNone();

    await page.getByRole('button', { name: 'Borrar definitivamente Mi app' }).click();
    const confirm = page.getByRole('dialog', { name: '¿Borrar definitivamente el proyecto?' });
    await confirm.getByRole('button', { name: 'Borrar definitivamente', exact: true }).click();
    await expectSaveErrorNotice(page);
    await expect(page.getByRole('listitem', { name: 'Mi app' })).toHaveCount(1);
    await errors.expectNone();
  });
});

test.describe('AC-044: tarjetas', () => {
  test('crear tarjeta: diálogo abierto con lo escrito, aviso y sin errores no controlados', async ({ page }) => {
    await page.goto('/');
    await createProject(page, 'Mi app');
    await openProject(page, 'Mi app');
    const errors = watchUncaught(page);
    await setFailWrites(page, true);

    await column(page, 'En curso').getByRole('button', { name: 'Añadir tarjeta' }).click();
    const dialog = page.getByRole('dialog', { name: 'Añadir tarjeta' });
    await dialog.getByLabel('Título').fill('Nueva');
    await dialog.getByRole('button', { name: 'Añadir' }).click();

    await expectSaveErrorNotice(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Título')).toHaveValue('Nueva');
    await expect(dialog.getByRole('button', { name: 'Añadir' })).not.toHaveAttribute('aria-busy');
    await expect(column(page, 'En curso').getByRole('listitem')).toHaveCount(0);
    await errors.expectNone();
  });

  test('editar tarjeta: diálogo abierto con lo escrito, aviso y sin errores no controlados', async ({ page }) => {
    await boardWithCard(page);
    const errors = watchUncaught(page);
    await setFailWrites(page, true);

    await column(page, 'Sin empezar').getByRole('button', { name: 'Login', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Editar tarjeta' });
    await dialog.getByLabel('Título').fill('Login 2');
    await dialog.getByRole('button', { name: 'Guardar cambios' }).click();

    await expectSaveErrorNotice(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Título')).toHaveValue('Login 2');
    await expect(dialog.getByRole('button', { name: 'Guardar cambios' })).not.toHaveAttribute('aria-busy');
    await expect(titlesIn(page, 'Sin empezar')).toHaveText(['Login']);
    await errors.expectNone();
  });

  test('archivar tarjeta: sigue en el tablero, aviso y sin errores no controlados', async ({ page }) => {
    await boardWithCard(page);
    const errors = watchUncaught(page);
    await setFailWrites(page, true);

    await cardIn(page, 'Sin empezar', 'Login').getByRole('button', { name: 'Archivar Login', exact: true }).click();

    await expectSaveErrorNotice(page);
    await expect(cardIn(page, 'Sin empezar', 'Login')).toHaveCount(1);
    await errors.expectNone();
  });

  test('restaurar y borrar definitivamente tarjeta: sigue archivada, aviso y sin errores no controlados', async ({
    page,
  }) => {
    await boardWithCard(page);
    await cardIn(page, 'Sin empezar', 'Login').getByRole('button', { name: 'Archivar Login', exact: true }).click();
    await expect(cardIn(page, 'Sin empezar', 'Login')).toHaveCount(0);
    await page.getByRole('link', { name: 'Tarjetas archivadas' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Tarjetas archivadas' })).toBeVisible();
    const errors = watchUncaught(page);
    await setFailWrites(page, true);

    await page.getByRole('button', { name: 'Restaurar Login' }).click();
    await expectSaveErrorNotice(page);
    await expect(page.getByRole('listitem', { name: 'Login' })).toHaveCount(1);
    await errors.expectNone();

    await page.getByRole('button', { name: 'Borrar definitivamente Login' }).click();
    const confirm = page.getByRole('dialog', { name: '¿Borrar definitivamente la tarjeta?' });
    await confirm.getByRole('button', { name: 'Borrar definitivamente', exact: true }).click();
    await expectSaveErrorNotice(page);
    await expect(page.getByRole('listitem', { name: 'Login' })).toHaveCount(1);
    await errors.expectNone();
  });
});

async function centreOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('El elemento no es visible');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
}

/** Punto por el que se agarra una tarjeta: su borde superior (como en el e2e de AC-015/AC-017). */
async function gripOf(card: Locator) {
  const { x, box } = await centreOf(card);
  return { x, y: box.y + 6 };
}

async function tabUntilFocused(page: Page, target: Locator, maxTabs = 40) {
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab');
    if ((await target.count()) === 1 && (await target.evaluate((el) => el === document.activeElement))) return;
  }
  throw new Error('El foco no llegó al elemento esperado con Tab');
}

/** Tras un movimiento fallido, la tarjeta vuelve a "Sin empezar" y las demás columnas quedan vacías. */
async function expectMoveNotSaved(page: Page) {
  await expect(titlesIn(page, 'Sin empezar')).toHaveText(['Login']);
  for (const other of ['En curso', 'En pausa', 'Finalizado']) {
    await expect(titlesIn(page, other)).toHaveCount(0);
  }
}

test.describe('AC-044: mover tarjeta', () => {
  test('con ratón: vuelve a su columna, aviso y sin errores no controlados', async ({ page }) => {
    await boardWithCard(page);
    const errors = watchUncaught(page);
    await setFailWrites(page, true);

    const card = cardIn(page, 'Sin empezar', 'Login');
    const from = await gripOf(card);
    const centre = await centreOf(card);
    const zone = await centreOf(column(page, 'En pausa').getByRole('list', { name: 'En pausa' }));
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 5, from.y + 5, { steps: 5 });
    await page.mouse.move(from.x + zone.x - centre.x, from.y + zone.y - centre.y, { steps: 25 });
    await page.waitForTimeout(150);
    await page.mouse.up();

    await expectSaveErrorNotice(page);
    await expectMoveNotSaved(page);
    await errors.expectNone();
  });

  test('con teclado: vuelve a su columna, aviso y sin errores no controlados', async ({ page }) => {
    await boardWithCard(page);
    await page.reload();
    await expect(cardIn(page, 'Sin empezar', 'Login')).toBeVisible();
    const errors = watchUncaught(page);
    await setFailWrites(page, true);

    // Espacio coge la tarjeta y Tab la lleva a otra columna, como en el e2e de AC-017. En cuanto llega
    // a otra columna el movimiento se intenta guardar y, al fallar, la tarjeta vuelve a su columna.
    await tabUntilFocused(page, cardIn(page, 'Sin empezar', 'Login'));
    await page.keyboard.press('Space');
    for (let i = 0; i < 40 && (await saveErrorAlert(page).count()) === 0; i++) {
      await page.keyboard.press('Tab');
    }
    await page.keyboard.press('Escape');

    await expectSaveErrorNotice(page);
    await expectMoveNotSaved(page);
    await errors.expectNone();
  });

  test.describe('táctil', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    test('con un gesto táctil en móvil: vuelve a su columna, aviso y sin errores no controlados', async ({ page }) => {
      await boardWithCard(page);
      const errors = watchUncaught(page);
      await setFailWrites(page, true);

      const viewport = page.viewportSize();
      if (!viewport) throw new Error('Sin viewport');
      const card = cardIn(page, 'Sin empezar', 'Login');
      const from = await gripOf(card);
      const centre = await centreOf(card);
      const offset = { x: centre.x - from.x, y: centre.y - from.y };

      // Mismo gesto que el e2e de AC-017: eventos táctiles reales por CDP.
      const cdp = await page.context().newCDPSession(page);
      const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
        cdp.send('Input.dispatchTouchEvent', {
          type,
          touchPoints: type === 'touchEnd' ? [] : [{ x: Math.round(x), y: Math.round(y) }],
        });
      const slide = async (a: { x: number; y: number }, b: { x: number; y: number }, steps = 25) => {
        for (let i = 1; i <= steps; i++) {
          await touch('touchMove', a.x + ((b.x - a.x) * i) / steps, a.y + ((b.y - a.y) * i) / steps);
        }
      };
      await touch('touchStart', from.x, from.y);

      const board = await page.getByTestId('board-columns').boundingBox();
      if (!board) throw new Error('Tablero no visible');
      const edge = { x: board.x + board.width - 10, y: from.y };
      await slide(from, edge);
      const zoneLocator = column(page, 'En pausa').getByRole('list', { name: 'En pausa' });
      for (let i = 0; i < 200; i++) {
        const box = await zoneLocator.boundingBox();
        if (box && box.x + box.width / 2 < viewport.width - 60) break;
        await touch('touchMove', edge.x - (i % 2), edge.y);
        await page.waitForTimeout(20);
      }
      const rest = { x: viewport.width / 2, y: edge.y };
      await touch('touchMove', rest.x, rest.y);
      await page.waitForTimeout(150);
      const zone = await centreOf(zoneLocator);
      const to = { x: zone.x - offset.x, y: zone.y - offset.y };
      await slide(rest, to, 10);
      await page.waitForTimeout(150);
      await touch('touchEnd', to.x, to.y);

      await expectSaveErrorNotice(page);
      await expectMoveNotSaved(page);
      await errors.expectNone();
    });
  });
});

test.describe('AC-044: importar', () => {
  test('export completo confirmado: no se sustituye nada, aviso y sin errores no controlados', async ({ page }) => {
    await page.goto('/');
    await createProject(page, 'Mi app');
    const file = await exportFrom(page, 'Exportar todo');
    await createProject(page, 'Nuevo');
    const errors = watchUncaught(page);
    await setFailWrites(page, true);

    await importText(page, file);
    const confirm = page.getByRole('dialog', { name: '¿Importar y reemplazar todos tus datos?' });
    await confirm.getByRole('button', { name: 'Reemplazar' }).click();

    await expectSaveErrorNotice(page);
    // No se indica que se guardó: los datos actuales siguen ahí ("Nuevo" no está en el archivo).
    await expect(projectButton(page, 'Nuevo')).toBeVisible();
    await expect(projectButton(page, 'Mi app')).toBeVisible();
    await errors.expectNone();
  });

  test('proyecto nuevo: no aparece, aviso y sin errores no controlados', async ({ page }) => {
    const data = await projectExport(page);
    const project = { ...data.projects[0]!, id: 'proyecto-nuevo-ac-044', name: 'Del archivo' };
    const file = JSON.stringify({
      ...data,
      projects: [project],
      cards: data.cards.map((card) => ({ ...card, projectId: project.id })),
    });
    const errors = watchUncaught(page);
    await setFailWrites(page, true);

    await importText(page, file);

    await expectSaveErrorNotice(page);
    await expect(projectButton(page, 'Del archivo')).toHaveCount(0);
    await expect(projectButton(page, 'Mi app')).toBeVisible();
    await errors.expectNone();
  });

  test('"Reemplazar": el proyecto existente no cambia, aviso y sin errores no controlados', async ({ page }) => {
    const data = await projectExport(page);
    const file = JSON.stringify({ ...data, projects: [{ ...data.projects[0]!, name: 'Del archivo' }] });
    const errors = watchUncaught(page);
    await setFailWrites(page, true);

    await importText(page, file);
    await page.getByRole('dialog', { name: 'Este proyecto ya existe' }).getByRole('button', { name: 'Reemplazar' }).click();

    await expectSaveErrorNotice(page);
    await expect(projectButton(page, 'Del archivo')).toHaveCount(0);
    await expect(projectButton(page, 'Mi app')).toBeVisible();
    await errors.expectNone();
  });

  test('"Importar como copia": la copia no aparece, aviso y sin errores no controlados', async ({ page }) => {
    const data = await projectExport(page);
    const errors = watchUncaught(page);
    await setFailWrites(page, true);

    await importText(page, JSON.stringify(data));
    await page
      .getByRole('dialog', { name: 'Este proyecto ya existe' })
      .getByRole('button', { name: 'Importar como copia' })
      .click();

    await expectSaveErrorNotice(page);
    await expect(projectButton(page, 'Mi app (copia)')).toHaveCount(0);
    await expect(projectButton(page, 'Mi app')).toBeVisible();
    await errors.expectNone();
  });
});

test('AC-044: cambiar el filtro por tipo: aviso, no se recuerda tras recargar y sin errores no controlados', async ({
  page,
}) => {
  await boardWithCard(page);
  const errors = watchUncaught(page);
  await setFailWrites(page, true);

  const chip = page.getByRole('group', { name: 'Filtrar por tipo' }).getByRole('button', { name: 'Arreglo', exact: true });
  await chip.click();

  await expectSaveErrorNotice(page);
  await errors.expectNone();

  // No se guardó: al recargar (sin fallos) el filtro no está aplicado.
  await page.reload();
  await expect(chip).toHaveAttribute('aria-pressed', 'false');
  await expect(titlesIn(page, 'Sin empezar')).toHaveText(['Login']);
});

test('AC-044: si falla guardar el modo de color no hay errores no controlados ni aviso', async ({ page }) => {
  await page.addInitScript(() => {
    const quota = () => {
      throw new DOMException('Cuota excedida', 'QuotaExceededError');
    };
    Storage.prototype.setItem = quota;
    Storage.prototype.removeItem = quota;
  });
  const errors = watchUncaught(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Proyectos' })).toBeVisible();

  await chooseOption(page.getByRole('banner'), 'Modo de color', 'Oscuro');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await chooseOption(page.getByRole('banner'), 'Modo de color', 'Claro');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await chooseOption(page.getByRole('banner'), 'Modo de color', 'Auto');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');

  await expect(saveErrorAlert(page)).toHaveCount(0);
  await errors.expectNone();
});
