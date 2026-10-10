import { expect, test, type Browser, type Page } from '@playwright/test';

async function createProject(page: Page, name: string) {
  await page.getByRole('button', { name: 'Crear proyecto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  await dialog.getByLabel('Nombre').fill(name);
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog).toBeHidden();
}

async function addCard(page: Page, column: string, title: string) {
  const region = page.getByRole('region', { name: column });
  await region.getByRole('button', { name: 'Añadir tarjeta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Añadir tarjeta' });
  await dialog.getByLabel('Título').fill(title);
  await dialog.getByRole('button', { name: 'Añadir' }).click();
  await expect(dialog).toBeHidden();
  await expect(region.getByRole('listitem', { name: title })).toHaveCount(1);
}

const projectList = (page: Page) => page.getByRole('region', { name: 'Proyectos', exact: true });

async function openProject(page: Page, name: string) {
  await projectList(page).getByRole('button', { name, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
}

async function backToList(page: Page) {
  await page.getByRole('link', { name: /volver a proyectos/i }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Proyectos' })).toBeVisible();
}

type Row = Record<string, unknown> & { id: string };

/** Lee un store de IndexedDB, ordenado por id. */
async function stored(page: Page, store: 'projects' | 'cards'): Promise<Row[]> {
  const rows = await page.evaluate(
    (name) =>
      new Promise<Row[]>((resolve, reject) => {
        const open = indexedDB.open('kanban-board');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const req = db.transaction(name).objectStore(name).getAll();
          req.onsuccess = () => {
            db.close();
            resolve(req.result as Row[]);
          };
          req.onerror = () => reject(req.error);
        };
      }),
    store,
  );
  return rows.sort((a, b) => a.id.localeCompare(b.id));
}

async function snapshot(page: Page) {
  return { projects: await stored(page, 'projects'), cards: await stored(page, 'cards') };
}

/**
 * Pulsa un botón de exportar y guarda el archivo descargado en la carpeta
 * del test (sobrevive al cierre del contexto). Devuelve su ruta.
 */
async function download(page: Page, button: string, name: string): Promise<string> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: button }).click();
  const file = await downloadPromise;
  const path = test.info().outputPath(name);
  await file.saveAs(path);
  return path;
}

interface Exports {
  /** Ruta del export completo. */
  full: string;
  /** Ruta del export del proyecto "Mi app". */
  project: string;
  /** Datos guardados en el origen en el momento de exportar. */
  data: Awaited<ReturnType<typeof snapshot>>;
}

/**
 * En otro navegador (contexto aislado): "Mi app" con A y B, y "Otra" con E.
 * Devuelve el export completo, el export de "Mi app" y los datos guardados.
 */
async function makeExports(browser: Browser): Promise<Exports> {
  const context = await browser.newContext({ acceptDownloads: true });
  try {
    const page = await context.newPage();
    await page.goto('/');
    await createProject(page, 'Otra');
    await createProject(page, 'Mi app');
    await openProject(page, 'Otra');
    await addCard(page, 'En pausa', 'E');
    await backToList(page);
    await openProject(page, 'Mi app');
    await addCard(page, 'Sin empezar', 'A');
    await addCard(page, 'En curso', 'B');
    const project = await download(page, 'Exportar proyecto', 'kanban-mi-app.json');
    await backToList(page);
    const full = await download(page, 'Exportar todo', 'kanban-export.json');
    const data = await snapshot(page);
    return { full, project, data };
  } finally {
    await context.close();
  }
}

/** Pulsa "Importar" del estado vacío y elige el archivo en el selector. */
async function importFromEmptyState(page: Page, path: string) {
  await expect(page.getByText('Todavía no tienes proyectos')).toBeVisible();
  const chooserPromise = page.waitForEvent('filechooser');
  await projectList(page).getByRole('button', { name: 'Importar' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(path);
}

test('AC-034: "Importar" del estado vacío acepta un export completo y se ven los proyectos importados', async ({
  page,
  browser,
}) => {
  const exports = await makeExports(browser);
  await page.goto('/');
  await importFromEmptyState(page, exports.full);

  // Con 0 proyectos no se pide confirmación (AC-041, D-014).
  await expect(projectList(page).getByRole('button', { name: 'Mi app', exact: true })).toBeVisible();
  await expect(projectList(page).getByRole('button', { name: 'Otra', exact: true })).toBeVisible();
  await expect(page.getByText('Todavía no tienes proyectos')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await snapshot(page)).toEqual(exports.data);

  await page.reload();
  await expect(projectList(page).getByRole('button', { name: 'Mi app', exact: true })).toBeVisible();
  await expect(projectList(page).getByRole('button', { name: 'Otra', exact: true })).toBeVisible();
  await openProject(page, 'Mi app');
  await expect(page.getByRole('region', { name: 'Sin empezar' }).getByRole('listitem', { name: 'A' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'En curso' }).getByRole('listitem', { name: 'B' })).toBeVisible();
});

test('AC-034: "Importar" del estado vacío acepta un export de proyecto y se ve el proyecto importado', async ({
  page,
  browser,
}) => {
  const exports = await makeExports(browser);
  await page.goto('/');
  await importFromEmptyState(page, exports.project);

  await expect(projectList(page).getByRole('button', { name: 'Mi app', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Este proyecto ya existe' })).toHaveCount(0);
  await expect(projectList(page).getByRole('button', { name: 'Otra', exact: true })).toHaveCount(0);
  await expect(page.getByText('Todavía no tienes proyectos')).toHaveCount(0);

  const miApp = exports.data.projects.find((p) => p.name === 'Mi app')!;
  expect(await snapshot(page)).toEqual({
    projects: [miApp],
    cards: exports.data.cards.filter((c) => c.projectId === miApp.id),
  });

  await page.reload();
  await openProject(page, 'Mi app');
  await expect(page.getByRole('region', { name: 'Sin empezar' }).getByRole('listitem', { name: 'A' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'En curso' }).getByRole('listitem', { name: 'B' })).toBeVisible();
});
