import { expect, test, type Download, type Locator, type Page } from '@playwright/test';

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

/** Lee un store de IndexedDB. */
function stored(page: Page, store: 'projects' | 'cards') {
  return page.evaluate(
    (name) =>
      new Promise<Record<string, unknown>[]>((resolve, reject) => {
        const open = indexedDB.open('kanban-board');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const req = db.transaction(name).objectStore(name).getAll();
          req.onsuccess = () => {
            db.close();
            resolve(req.result);
          };
          req.onerror = () => reject(req.error);
        };
      }),
    store,
  );
}

/** Lee y parsea el archivo descargado (sin depender de los tipos de Node). */
async function readDownload(download: Download) {
  const stream: AsyncIterable<Uint8Array> = await download.createReadStream();
  const decoder = new TextDecoder();
  let text = '';
  for await (const chunk of stream) text += decoder.decode(chunk, { stream: true });
  text += decoder.decode();
  return JSON.parse(text) as {
    formatVersion: number;
    kind: string;
    projects: { name: string; archived: boolean }[];
    cards: { title: string; archived: boolean }[];
  };
}

const projectList = (page: Page) => page.getByRole('region', { name: 'Proyectos', exact: true });
const column = (page: Page, name: string) => page.getByRole('region', { name });
const cardIn = (page: Page, name: string, title: string) =>
  column(page, name).getByRole('listitem', { name: title, exact: true });

/** "Mi app" con A (Sin empezar) y D (archivada), archivado; y "Otra" activo. Abre su tablero desde archivados. */
async function openArchivedBoard(page: Page) {
  await page.goto('/');
  await createProject(page, 'Otra');
  await createProject(page, 'Mi app');
  await projectList(page).getByRole('button', { name: 'Mi app', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mi app' })).toBeVisible();
  await addCard(page, 'Sin empezar', 'A');
  await addCard(page, 'En pausa', 'D');
  await cardIn(page, 'En pausa', 'D').getByRole('button', { name: 'Archivar D', exact: true }).click();
  await expect(cardIn(page, 'En pausa', 'D')).toHaveCount(0);
  await page.getByRole('link', { name: /volver a proyectos/i }).click();
  await page.getByRole('button', { name: 'Archivar Mi app' }).click();
  await expect(projectList(page).getByRole('button', { name: 'Mi app', exact: true })).toHaveCount(0);

  await page.getByRole('link', { name: 'Proyectos archivados' }).click();
  await page.getByRole('link', { name: 'Ver tablero de Mi app' }).click();
  await expectReadonlyBoard(page);
}

async function expectReadonlyBoard(page: Page) {
  await expect(page.getByRole('heading', { level: 1, name: 'Mi app' })).toBeVisible();
  await expect(cardIn(page, 'Sin empezar', 'A')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('solo lectura');
  // Sin crear, editar, archivar tarjetas ni editar el proyecto.
  await expect(page.getByRole('button', { name: 'Añadir tarjeta' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Archivar/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Editar proyecto' })).toHaveCount(0);
  await expect(cardIn(page, 'Sin empezar', 'A').getByRole('button')).toHaveCount(0);
  // Exportar sigue disponible.
  await expect(page.getByRole('button', { name: 'Exportar proyecto' })).toBeVisible();
}

async function centreOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('El elemento no es visible');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, top: box.y };
}

test('AC-026: el tablero de un proyecto archivado se ve pero no permite crear, editar, mover ni archivar tarjetas, ni editar el proyecto; sí exportarlo', async ({
  page,
}) => {
  await openArchivedBoard(page);
  const projectsBefore = await stored(page, 'projects');
  const cardsBefore = await stored(page, 'cards');

  // Editar: abrir la tarjeta no muestra el diálogo de edición.
  await cardIn(page, 'Sin empezar', 'A').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Mover con ratón: la tarjeta no se mueve.
  const card = cardIn(page, 'Sin empezar', 'A');
  const from = await centreOf(card);
  const to = await centreOf(column(page, 'Finalizado').getByRole('list', { name: 'Finalizado' }));
  await page.mouse.move(from.x, from.top + 6);
  await page.mouse.down();
  await page.mouse.move(from.x + 5, from.top + 11, { steps: 5 });
  await page.mouse.move(to.x, to.y, { steps: 25 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect(cardIn(page, 'Sin empezar', 'A')).toHaveCount(1);
  await expect(column(page, 'Finalizado').getByRole('listitem')).toHaveCount(0);

  // Mover con teclado: la tarjeta no es una parada de tabulación "cogible" y Espacio no la coge.
  await expect(card).toHaveAttribute('tabindex', '-1');
  await card.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  await expect(cardIn(page, 'Sin empezar', 'A')).toHaveCount(1);

  // Tarjetas archivadas: se ven, sin restaurar ni borrar.
  await page.getByRole('link', { name: 'Tarjetas archivadas' }).click();
  await expect(page.getByRole('listitem', { name: 'D' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: /restaurar|borrar/i })).toHaveCount(0);
  await page.getByRole('link', { name: /volver al tablero/i }).click();
  await expectReadonlyBoard(page);

  // Nada ha cambiado en el almacenamiento.
  expect(await stored(page, 'projects')).toEqual(projectsBefore);
  expect(await stored(page, 'cards')).toEqual(cardsBefore);

  // Exportar proyecto sigue funcionando.
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar proyecto' }).click();
  const data = await readDownload(await downloadPromise);
  expect(data.formatVersion).toBe(1);
  expect(data.kind).toBe('project');
  expect(data.projects).toEqual([expect.objectContaining({ name: 'Mi app', archived: true })]);
  expect(data.cards.map((c) => [c.title, c.archived]).sort()).toEqual([
    ['A', false],
    ['D', true],
  ]);

  // Tras recargar sigue siendo de solo lectura, y el enlace de vuelta lleva a archivados.
  await page.reload();
  await expectReadonlyBoard(page);
  await page.getByRole('link', { name: /volver a proyectos archivados/i }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Proyectos archivados' })).toBeVisible();
});
