import { expect, test, type FileChooser, type Locator, type Page } from '@playwright/test';
import { addCard, column, createProject, expectDecorativeIcon, openProject } from './support/redesign';

// AC-055 (D-027, D-032): iconos Lucide delante del texto en los botones y enlaces de la tabla de AC-055.

/** El control tiene el `svg.lucide-<icon>` decorativo delante de su texto visible. */
async function expectLeadingIcon(control: Locator, icon: string, text: string) {
  await expect(control).toBeVisible();
  await expectDecorativeIcon(control, icon);
  await expect(control).toHaveText(text);
  const iconFirst = await control.evaluate((el, name) => {
    const svg = el.querySelector(`svg.lucide-${name}`);
    const textNode = [...el.querySelectorAll('*'), el]
      .flatMap((node) => [...node.childNodes])
      .find((child) => child.nodeType === Node.TEXT_NODE && child.textContent?.trim());
    return !!svg && !!textNode && !!(svg.compareDocumentPosition(textNode) & Node.DOCUMENT_POSITION_FOLLOWING);
  }, icon);
  expect(iconFirst, `svg.lucide-${icon} debe ir delante de "${text}"`).toBe(true);
}

/** Botones de diálogo que no llevan icono. */
async function expectNoIcon(control: Locator) {
  await expect(control).toBeVisible();
  await expect(control.locator('svg.lucide')).toHaveCount(0);
}

const button = (scope: Page | Locator, name: string) => scope.getByRole('button', { name, exact: true });
const link = (scope: Page | Locator, name: string) => scope.getByRole('link', { name, exact: true });

async function expectNoArrowInBackLinks(page: Page) {
  const backs = page.getByRole('link', { name: /^Volver/ });
  for (const back of await backs.all()) await expect(back).not.toContainText('←');
}

type FilePayload = Extract<Parameters<FileChooser['setFiles']>[0], { buffer: unknown }>;
// El proyecto no incluye los tipos de Node: se toma `Buffer` del entorno de Playwright (como en import-validation).
const NodeBuffer = (globalThis as unknown as { Buffer: { from(text: string, encoding: 'utf-8'): FilePayload['buffer'] } })
  .Buffer;

async function chooseFile(page: Page, files: string | FilePayload) {
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('region', { name: 'Proyectos', exact: true }).getByRole('button', { name: 'Importar' }).click();
  await (await chooserPromise).setFiles(files);
}

async function downloadFrom(page: Page, name: string) {
  const downloadPromise = page.waitForEvent('download');
  await button(page, name).click();
  const path = await (await downloadPromise).path();
  if (!path) throw new Error('La descarga no se guardó');
  return path;
}

test.describe('AC-055: iconos en botones y enlaces', () => {
  test('estado vacío y lista de proyectos', async ({ page }) => {
    await page.goto('/');
    await expectLeadingIcon(button(page, 'Crear proyecto'), 'plus', 'Crear proyecto');
    await expectLeadingIcon(button(page, 'Importar'), 'upload', 'Importar');
    await expectLeadingIcon(link(page, 'Proyectos archivados'), 'archive', 'Proyectos archivados');

    await button(page, 'Crear proyecto').click();
    const create = page.getByRole('dialog', { name: 'Crear proyecto' });
    await expectNoIcon(button(create, 'Crear'));
    await expectNoIcon(button(create, 'Cancelar'));
    await create.getByLabel('Nombre').fill('Mi app');
    await button(create, 'Crear').click();
    await expect(create).toBeHidden();

    await expectLeadingIcon(button(page, 'Crear proyecto'), 'plus', 'Crear proyecto');
    await expectLeadingIcon(button(page, 'Importar'), 'upload', 'Importar');
    await expectLeadingIcon(button(page, 'Exportar todo'), 'download', 'Exportar todo');
    await expectLeadingIcon(button(page, 'Editar Mi app'), 'pencil', 'Editar');
    await expectLeadingIcon(button(page, 'Archivar Mi app'), 'archive', 'Archivar');
    await expectLeadingIcon(link(page, 'Proyectos archivados'), 'archive', 'Proyectos archivados');
  });

  test('tablero, tarjetas archivadas y sus diálogos', async ({ page }) => {
    await createProject(page, 'Mi app');
    await openProject(page, 'Mi app');
    await expectLeadingIcon(button(page, 'Exportar proyecto'), 'download', 'Exportar proyecto');
    await expectLeadingIcon(button(page, 'Editar proyecto'), 'pencil', 'Editar proyecto');
    await expectLeadingIcon(link(page, 'Tarjetas archivadas'), 'archive', 'Tarjetas archivadas');
    await expectLeadingIcon(link(page, 'Volver a proyectos'), 'arrow-left', 'Volver a proyectos');
    await expectNoArrowInBackLinks(page);

    await button(column(page, 'Sin empezar'), 'Añadir tarjeta en Sin empezar').click();
    const add = page.getByRole('dialog', { name: 'Añadir tarjeta' });
    await expectNoIcon(button(add, 'Añadir'));
    await expectNoIcon(button(add, 'Cancelar'));
    await button(add, 'Cancelar').click();
    await addCard(page, 'Sin empezar', 'Login');

    await button(column(page, 'Sin empezar'), 'Login').click();
    const edit = page.getByRole('dialog', { name: 'Editar tarjeta' });
    await expectNoIcon(button(edit, 'Guardar cambios'));
    await expectNoIcon(button(edit, 'Cancelar'));
    await button(edit, 'Cancelar').click();

    await button(page, 'Archivar Login').click();
    await link(page, 'Tarjetas archivadas').click();
    await expect(page.getByRole('heading', { level: 1, name: 'Tarjetas archivadas' })).toBeVisible();
    await expectLeadingIcon(link(page, 'Volver al tablero'), 'arrow-left', 'Volver al tablero');
    await expectNoArrowInBackLinks(page);
    await expectLeadingIcon(button(page, 'Restaurar Login'), 'archive-restore', 'Restaurar');
    await expectLeadingIcon(button(page, 'Borrar definitivamente Login'), 'trash-2', 'Borrar definitivamente');

    await button(page, 'Borrar definitivamente Login').click();
    const confirm = page.getByRole('dialog', { name: '¿Borrar definitivamente la tarjeta?' });
    await expectLeadingIcon(button(confirm, 'Borrar definitivamente'), 'trash-2', 'Borrar definitivamente');
    await expectNoIcon(button(confirm, 'Cancelar'));
  });

  test('proyectos archivados, tablero de solo lectura y página no encontrada', async ({ page }) => {
    await createProject(page, 'Viejo');
    await button(page, 'Archivar Viejo').click();
    await link(page, 'Proyectos archivados').click();
    await expect(page.getByRole('heading', { level: 1, name: 'Proyectos archivados' })).toBeVisible();
    await expectLeadingIcon(link(page, 'Volver a proyectos'), 'arrow-left', 'Volver a proyectos');
    await expectNoArrowInBackLinks(page);
    await expectLeadingIcon(button(page, 'Restaurar Viejo'), 'archive-restore', 'Restaurar');
    await expectLeadingIcon(button(page, 'Borrar definitivamente Viejo'), 'trash-2', 'Borrar definitivamente');

    await button(page, 'Borrar definitivamente Viejo').click();
    const confirm = page.getByRole('dialog', { name: '¿Borrar definitivamente el proyecto?' });
    await expectLeadingIcon(button(confirm, 'Borrar definitivamente'), 'trash-2', 'Borrar definitivamente');
    await expectNoIcon(button(confirm, 'Cancelar'));
    await button(confirm, 'Cancelar').click();

    await link(page, 'Ver tablero de Viejo').click();
    await expect(page.getByRole('heading', { level: 1, name: 'Viejo' })).toBeVisible();
    await expectLeadingIcon(
      link(page, 'Volver a proyectos archivados'),
      'arrow-left',
      'Volver a proyectos archivados',
    );
    await expectNoArrowInBackLinks(page);

    await page.goto('/#/project/no-existe');
    await expect(page.getByRole('heading', { level: 1, name: 'Proyecto no encontrado' })).toBeVisible();
    await expectLeadingIcon(link(page, 'Volver a proyectos'), 'arrow-left', 'Volver a proyectos');
    await expectNoArrowInBackLinks(page);
  });

  test('diálogos de importación', async ({ page }) => {
    await createProject(page, 'Mi app');
    await openProject(page, 'Mi app');
    const projectFile = await downloadFrom(page, 'Exportar proyecto');
    await link(page, 'Volver a proyectos').click();

    // Proyecto que ya existe: "Reemplazar" e "Importar como copia".
    await chooseFile(page, projectFile);
    const conflict = page.getByRole('dialog', { name: 'Este proyecto ya existe' });
    await expectLeadingIcon(button(conflict, 'Reemplazar'), 'replace', 'Reemplazar');
    await expectLeadingIcon(button(conflict, 'Importar como copia'), 'copy', 'Importar como copia');
    await expectNoIcon(button(conflict, 'Cancelar'));
    await button(conflict, 'Cancelar').click();
    await expect(conflict).toBeHidden();

    // Export completo sobre datos existentes: confirmación con "Reemplazar".
    const fullFile = await downloadFrom(page, 'Exportar todo');
    await chooseFile(page, fullFile);
    const full = page.getByRole('dialog', { name: '¿Importar y reemplazar todos tus datos?' });
    await expectLeadingIcon(button(full, 'Reemplazar'), 'replace', 'Reemplazar');
    await expectNoIcon(button(full, 'Cancelar'));
    await button(full, 'Cancelar').click();
    await expect(full).toBeHidden();

    // Archivo no válido: el aviso se cierra con "Aceptar", sin icono.
    await chooseFile(page, { name: 'roto.json', mimeType: 'application/json', buffer: NodeBuffer.from('no es json', 'utf-8') });
    const failed = page.getByRole('dialog').filter({ has: button(page, 'Aceptar') });
    await expectNoIcon(button(failed, 'Aceptar'));
  });
});

test.describe('AC-055: aviso de error de guardado', () => {
  test.beforeEach(async ({ page }) => {
    // Igual que el e2e de AC-035: `put` falla con cuota excedida mientras `__failWrites` sea `true`.
    await page.addInitScript(() => {
      const flags = window as unknown as { __failWrites?: boolean };
      const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore['put']>) {
        if (flags.__failWrites) throw new DOMException('Cuota excedida', 'QuotaExceededError');
        return put.apply(this, args);
      };
    });
  });

  test('"Exportar ahora" lleva el icono download', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      (window as unknown as { __failWrites?: boolean }).__failWrites = true;
    });
    await button(page, 'Crear proyecto').click();
    const create = page.getByRole('dialog', { name: 'Crear proyecto' });
    await create.getByLabel('Nombre').fill('Mi app');
    await button(create, 'Crear').click();

    const alert = page.getByRole('alert').filter({ hasText: 'No se pudieron guardar los cambios' });
    await expectLeadingIcon(button(alert, 'Exportar ahora'), 'download', 'Exportar ahora');
  });
});
