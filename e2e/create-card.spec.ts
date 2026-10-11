import { expect, test, type Page } from '@playwright/test';

async function createProject(page: Page, name: string) {
  await page.getByRole('button', { name: 'Crear proyecto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  await dialog.getByLabel('Nombre').fill(name);
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog).toBeHidden();
}

/** Lee las tarjetas guardadas en IndexedDB (store `cards`). */
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

// AC-010: crear una tarjeta desde "En curso" indicando solo el título → aparece en
// "En curso" con tipo "Novedad" y sin prioridad; tras recargar sigue ahí igual.
test('AC-010: crear tarjeta en "En curso" → recargar → sigue ahí con tipo Novedad y sin prioridad', async ({ page }) => {
  await page.goto('/');
  await createProject(page, 'Mi app');
  await page.getByRole('list').getByRole('button', { name: 'Mi app', exact: true }).click();

  const enCurso = page.getByRole('region', { name: 'En curso' });
  await enCurso.getByRole('button', { name: 'Añadir tarjeta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Añadir tarjeta' });
  await expect(dialog).toContainText('Columna: En curso');
  await dialog.getByLabel('Título').fill('Login');
  await dialog.getByRole('button', { name: 'Añadir' }).click();
  await expect(dialog).toBeHidden();

  const card = enCurso.getByRole('listitem').filter({ hasText: 'Login' });
  await expect(card).toHaveCount(1);
  await expect(card).toHaveAttribute('data-type', 'novedad');
  await expect(card).toHaveAttribute('data-priority', '');
  for (const other of ['Sin empezar', 'En pausa', 'Finalizado']) {
    await expect(page.getByRole('region', { name: other }).getByRole('listitem')).toHaveCount(0);
  }

  await page.reload();

  await expect(card).toHaveCount(1);
  await expect(card).toHaveAttribute('data-type', 'novedad');
  await expect(card).toHaveAttribute('data-priority', '');
  const cards = await storedCards(page);
  expect(cards).toHaveLength(1);
  expect(cards[0]).toMatchObject({ title: 'Login', status: 'en-curso', type: 'novedad', priority: null });
});
