import { expect, test, type Page } from '@playwright/test';

async function createProject(page: Page, name: string) {
  await page.getByRole('button', { name: 'Crear proyecto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  await dialog.getByLabel('Nombre').fill(name);
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog).toBeHidden();
}

/** Crea "Login" en "En curso" con tipo Arreglo, descripción de 2 líneas y prioridad Alta. */
async function addFullCard(page: Page) {
  const enCurso = page.getByRole('region', { name: 'En curso' });
  await enCurso.getByRole('button', { name: 'Añadir tarjeta' }).click();
  const create = page.getByRole('dialog', { name: 'Añadir tarjeta' });
  await create.getByLabel('Título').fill('Login');
  await create.getByRole('button', { name: 'Añadir' }).click();
  await expect(create).toBeHidden();

  await enCurso.getByRole('button', { name: 'Login', exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'Editar tarjeta' });
  await edit.getByLabel('Tipo').selectOption({ label: 'Arreglo' });
  await edit.getByLabel('Descripción').fill('Primera línea\nSegunda línea');
  await edit.getByLabel('Prioridad').selectOption({ label: 'Alta' });
  await edit.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(edit).toBeHidden();
}

/** Lee el store `cards` de IndexedDB. */
function storedCards(page: Page) {
  return page.evaluate(
    () =>
      new Promise<Record<string, unknown>[]>((resolve, reject) => {
        const open = indexedDB.open('kanban-board');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const req = db.transaction('cards').objectStore('cards').getAll();
          req.onsuccess = () => {
            db.close();
            resolve(req.result);
          };
          req.onerror = () => reject(req.error);
        };
      }),
  );
}

async function setup(page: Page) {
  await page.goto('/');
  await createProject(page, 'Mi app');
  await page.getByRole('list').getByRole('button', { name: 'Mi app', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mi app' })).toBeVisible();
  await addFullCard(page);
}

async function archiveLogin(page: Page) {
  const card = page.getByRole('region', { name: 'En curso' }).getByRole('listitem', { name: 'Login' });
  await card.getByRole('button', { name: 'Archivar Login', exact: true }).click();
  await expect(card).toHaveCount(0);
}

async function openArchived(page: Page) {
  await page.getByRole('link', { name: 'Tarjetas archivadas' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Tarjetas archivadas' })).toBeVisible();
}

// AC-021: archivar sin confirmación → desaparece del tablero y aparece en archivadas con todos sus campos.
test('AC-021: archivar una tarjeta la quita del tablero sin confirmación y la muestra en archivadas', async ({ page }) => {
  await setup(page);
  const [before] = await storedCards(page);

  await archiveLogin(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const [after] = await storedCards(page);
  expect(after).toEqual({ ...before, archived: true });

  // Los recuentos de la lista solo cuentan tarjetas activas.
  await page.getByRole('link', { name: /volver a proyectos/i }).click();
  await expect(page.locator('[data-status="en-curso"] .status-counts__value')).toHaveText('0');
  await page.getByRole('list').getByRole('button', { name: 'Mi app', exact: true }).click();

  await openArchived(page);
  const archived = page.getByRole('listitem', { name: 'Login' });
  await expect(archived).toHaveCount(1);
  await expect(archived.getByRole('heading', { level: 3, name: 'Login' })).toBeVisible();
  await expect(archived).toContainText('Arreglo');
  await expect(archived).toContainText('Alta');
  await expect(archived).toContainText('Primera línea');
  await expect(archived).toContainText('Segunda línea');
  await expect(archived.getByTestId('archived-card-status')).toHaveText('En curso');
  await expect(archived.locator(`time[datetime="${before.createdAt as string}"]`)).toHaveCount(1);

  await page.reload();
  await expect(page.getByRole('listitem', { name: 'Login' })).toHaveCount(1);
});

// AC-022: restaurar → vuelve a "En curso" con los mismos campos y deja la vista de archivadas.
test('AC-022: restaurar una tarjeta archivada la devuelve a "En curso" sin cambios', async ({ page }) => {
  await setup(page);
  const [before] = await storedCards(page);
  await archiveLogin(page);
  await openArchived(page);

  await page.getByRole('button', { name: 'Restaurar Login' }).click();
  await expect(page.getByRole('listitem', { name: 'Login' })).toHaveCount(0);
  await expect(page.getByText('No hay tarjetas archivadas en este proyecto.')).toBeVisible();

  const [after] = await storedCards(page);
  expect(after).toEqual(before);

  await page.getByRole('link', { name: /volver al tablero/i }).click();
  const check = async () => {
    const card = page.getByRole('region', { name: 'En curso' }).getByRole('listitem', { name: 'Login' });
    await expect(card).toHaveCount(1);
    await expect(card).toHaveAttribute('data-type', 'arreglo');
    await expect(card).toHaveAttribute('data-priority', 'alta');
    await expect(card).toContainText('Primera línea');
  };
  await check();
  await page.reload();
  await check();
});

// AC-023: borrar definitivamente pide confirmación; cancelar la conserva; confirmar la elimina para siempre.
test('AC-023: borrar definitivamente desde archivadas pide confirmación y no reaparece tras recargar', async ({ page }) => {
  await setup(page);
  // El tablero no ofrece borrado definitivo para tarjetas activas.
  await expect(page.getByRole('button', { name: /borrar|eliminar/i })).toHaveCount(0);

  await archiveLogin(page);
  await openArchived(page);

  await page.getByRole('button', { name: 'Borrar definitivamente Login' }).click();
  const confirm = page.getByRole('dialog', { name: '¿Borrar definitivamente la tarjeta?' });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Cancelar' }).click();
  await expect(confirm).toBeHidden();
  await expect(page.getByRole('listitem', { name: 'Login' })).toHaveCount(1);
  expect(await storedCards(page)).toHaveLength(1);

  await page.getByRole('button', { name: 'Borrar definitivamente Login' }).click();
  await confirm.getByRole('button', { name: 'Borrar definitivamente', exact: true }).click();
  await expect(confirm).toBeHidden();
  await expect(page.getByRole('listitem', { name: 'Login' })).toHaveCount(0);
  expect(await storedCards(page)).toEqual([]);

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Tarjetas archivadas' })).toBeVisible();
  await expect(page.getByRole('listitem', { name: 'Login' })).toHaveCount(0);
  await page.getByRole('link', { name: /volver al tablero/i }).click();
  await expect(page.getByRole('listitem', { name: 'Login' })).toHaveCount(0);
});
