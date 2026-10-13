import { expect, test, type Page } from '@playwright/test';

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

async function archiveCard(page: Page, column: string, title: string) {
  const card = page.getByRole('region', { name: column }).getByRole('listitem', { name: title });
  await card.getByRole('button', { name: `Archivar ${title}`, exact: true }).click();
  await expect(card).toHaveCount(0);
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

/** Pulsa "Exportar proyecto" en el tablero abierto y devuelve la ruta local del archivo descargado. */
async function exportProject(page: Page): Promise<string> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar proyecto' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) throw new Error('La descarga no se guardó');
  return path;
}

/** Pulsa "Importar" y elige el archivo en el selector de archivos. */
async function importFile(page: Page, path: string) {
  const chooserPromise = page.waitForEvent('filechooser');
  await projectList(page).getByRole('button', { name: 'Importar' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(path);
}

const conflictDialog = (page: Page) => page.getByRole('dialog', { name: 'Este proyecto ya existe' });

/** "Mi app" con A (activa) y B (archivada); "Otra" con E. Devuelve el export de "Mi app". */
async function setup(page: Page): Promise<string> {
  await page.goto('/');
  await createProject(page, 'Otra');
  await createProject(page, 'Mi app');

  await openProject(page, 'Otra');
  await addCard(page, 'En pausa', 'E');
  await backToList(page);

  await openProject(page, 'Mi app');
  await addCard(page, 'Sin empezar', 'A');
  await addCard(page, 'En curso', 'B');
  await archiveCard(page, 'En curso', 'B');
  const file = await exportProject(page);
  await backToList(page);
  return file;
}

test('AC-031: importar un export de proyecto con id nuevo lo añade con todas sus tarjetas y no cambia los existentes', async ({
  page,
}) => {
  const file = await setup(page);
  const exported = await snapshot(page);
  const miApp = exported.projects.find((p) => p.name === 'Mi app')!;

  // "Mi app" se borra definitivamente: su id ya no existe en la app.
  await projectList(page).getByRole('button', { name: 'Archivar Mi app' }).click();
  await page.getByRole('link', { name: 'Proyectos archivados' }).click();
  await page.getByRole('button', { name: 'Borrar definitivamente Mi app' }).click();
  const confirm = page.getByRole('dialog', { name: '¿Borrar definitivamente el proyecto?' });
  await confirm.getByRole('button', { name: 'Borrar definitivamente', exact: true }).click();
  await expect(confirm).toBeHidden();
  await page.getByRole('link', { name: /volver a proyectos/i }).click();
  await createProject(page, 'Nueva');
  const before = await snapshot(page);
  expect(before.projects.map((p) => p.id)).not.toContain(miApp.id);

  await importFile(page, file);
  await expect(projectList(page).getByRole('button', { name: 'Mi app', exact: true })).toBeVisible();
  await expect(conflictDialog(page)).toHaveCount(0);
  await expect(projectList(page).getByRole('button', { name: 'Nueva', exact: true })).toBeVisible();
  await expect(projectList(page).getByRole('button', { name: 'Otra', exact: true })).toBeVisible();

  // Se añade tal cual (ids, fechas y flags, tarjeta archivada incluida) y lo existente no cambia.
  const imported = {
    projects: exported.projects.filter((p) => p.id === miApp.id),
    cards: exported.cards.filter((c) => c.projectId === miApp.id),
  };
  expect(imported.cards).toHaveLength(2);
  const byId = (rows: Row[]) => [...rows].sort((a, b) => a.id.localeCompare(b.id));
  const after = await snapshot(page);
  expect(after.projects).toEqual(byId([...before.projects, ...imported.projects]));
  expect(after.cards).toEqual(byId([...before.cards, ...imported.cards]));

  // Tras recargar sigue igual y el tablero muestra su tarjeta activa.
  await page.reload();
  await openProject(page, 'Mi app');
  await expect(page.getByRole('region', { name: 'Sin empezar' }).getByRole('listitem', { name: 'A' })).toBeVisible();
  await expect(page.getByRole('listitem', { name: 'B' })).toHaveCount(0);
  expect(await snapshot(page)).toEqual(after);
});

test('AC-032: con id existente ofrece "Reemplazar" e "Importar como copia"; cancelar o cerrar no cambia nada', async ({
  page,
}) => {
  const file = await setup(page);
  // Cambios posteriores al export: una tarjeta nueva en "Mi app".
  await openProject(page, 'Mi app');
  await addCard(page, 'Finalizado', 'C');
  await backToList(page);
  const before = await snapshot(page);

  const dialog = conflictDialog(page);
  await importFile(page, file);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Reemplazar' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Importar como copia' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialog).toBeHidden();
  expect(await snapshot(page)).toEqual(before);

  await importFile(page, file);
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  expect(await snapshot(page)).toEqual(before);

  await importFile(page, file);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cerrar' }).click();
  await expect(dialog).toBeHidden();
  expect(await snapshot(page)).toEqual(before);
});

test('AC-032: "Reemplazar" sustituye el proyecto existente y sus tarjetas por los del archivo', async ({ page }) => {
  const file = await setup(page);
  const exported = await snapshot(page);
  await openProject(page, 'Mi app');
  await addCard(page, 'Finalizado', 'C');
  await backToList(page);
  const otraBefore = (await snapshot(page)).projects.find((p) => p.name === 'Otra');

  await importFile(page, file);
  const dialog = conflictDialog(page);
  await dialog.getByRole('button', { name: 'Reemplazar' }).click();
  await expect(dialog).toBeHidden();

  // Queda exactamente como en el export: sin "C"; "Otra" no cambia.
  const after = await snapshot(page);
  expect(after).toEqual(exported);
  expect(after.projects.find((p) => p.name === 'Otra')).toEqual(otraBefore);
  await expect(projectList(page).getByRole('button', { name: 'Mi app', exact: true })).toHaveCount(1);
  await openProject(page, 'Mi app');
  await expect(page.getByRole('listitem', { name: 'C' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Sin empezar' }).getByRole('listitem', { name: 'A' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('region', { name: 'Sin empezar' }).getByRole('listitem', { name: 'A' })).toBeVisible();
  expect(await snapshot(page)).toEqual(exported);
});

test('AC-032: "Importar como copia" añade "<nombre> (copia)" con ids nuevos y deja intacto el existente', async ({
  page,
}) => {
  const file = await setup(page);
  const before = await snapshot(page);
  const original = before.projects.find((p) => p.name === 'Mi app')!;
  const originalCards = before.cards.filter((c) => c.projectId === original.id);

  await importFile(page, file);
  const dialog = conflictDialog(page);
  await dialog.getByRole('button', { name: 'Importar como copia' }).click();
  await expect(dialog).toBeHidden();
  await expect(projectList(page).getByRole('button', { name: 'Mi app (copia)', exact: true })).toBeVisible();
  await expect(projectList(page).getByRole('button', { name: 'Mi app', exact: true })).toBeVisible();

  const after = await snapshot(page);
  // Lo existente no cambia.
  for (const row of [...before.projects, ...before.cards]) {
    expect([...after.projects, ...after.cards]).toContainEqual(row);
  }
  const copy = after.projects.find((p) => p.name === 'Mi app (copia)')!;
  expect(after.projects).toHaveLength(3);
  expect(copy).toEqual({ ...original, id: copy.id, name: 'Mi app (copia)' });
  expect(copy.id).not.toBe(original.id);

  const copyCards = after.cards.filter((c) => c.projectId === copy.id).sort((a, b) => String(a.title).localeCompare(String(b.title)));
  expect(copyCards).toHaveLength(originalCards.length);
  const sortedOriginal = [...originalCards].sort((a, b) => String(a.title).localeCompare(String(b.title)));
  copyCards.forEach((c, i) => {
    expect(c).toEqual({ ...sortedOriginal[i], id: c.id, projectId: copy.id });
    expect(originalCards.map((o) => o.id)).not.toContain(c.id);
  });

  await openProject(page, 'Mi app (copia)');
  await expect(page.getByRole('region', { name: 'Sin empezar' }).getByRole('listitem', { name: 'A' })).toBeVisible();
});

test('AC-032: con el proyecto existente archivado, "Reemplazar" e "Importar como copia" también funcionan', async ({
  page,
}) => {
  const file = await setup(page);
  const exported = await snapshot(page);
  await projectList(page).getByRole('button', { name: 'Archivar Mi app' }).click();
  await expect(projectList(page).getByRole('button', { name: 'Mi app', exact: true })).toHaveCount(0);

  // Reemplazar el archivado por el del archivo (activo).
  await importFile(page, file);
  const dialog = conflictDialog(page);
  await dialog.getByRole('button', { name: 'Reemplazar' }).click();
  await expect(dialog).toBeHidden();
  await expect(projectList(page).getByRole('button', { name: 'Mi app', exact: true })).toBeVisible();
  expect(await snapshot(page)).toEqual(exported);

  // Archivado otra vez: "Importar como copia" añade la copia y deja el archivado intacto.
  await projectList(page).getByRole('button', { name: 'Archivar Mi app' }).click();
  await expect(projectList(page).getByRole('button', { name: 'Mi app', exact: true })).toHaveCount(0);
  const archived = await snapshot(page);
  await importFile(page, file);
  await dialog.getByRole('button', { name: 'Importar como copia' }).click();
  await expect(dialog).toBeHidden();
  await expect(projectList(page).getByRole('button', { name: 'Mi app (copia)', exact: true })).toBeVisible();
  const after = await snapshot(page);
  for (const row of [...archived.projects, ...archived.cards]) {
    expect([...after.projects, ...after.cards]).toContainEqual(row);
  }
  await page.getByRole('link', { name: 'Proyectos archivados' }).click();
  await expect(page.getByRole('listitem', { name: 'Mi app' })).toBeVisible();
});
