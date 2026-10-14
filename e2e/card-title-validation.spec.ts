import { expect, test, type Locator, type Page } from '@playwright/test';
import { chooseOption } from './support/select';

const LONG_TITLE = 'a'.repeat(121);
const PASTED_TITLE = 'b'.repeat(150);
const REQUIRED = 'El título es obligatorio.';
const TOO_LONG = 'El título no puede superar 120 caracteres.';

async function openNewProjectBoard(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Crear proyecto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  await dialog.getByLabel('Nombre').fill('Mi app');
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('list').getByRole('button', { name: 'Mi app', exact: true }).click();
}

/** Pega `value` en el campo como un usuario: portapapeles del sistema + Ctrl/Cmd+V. */
async function paste(page: Page, input: Locator, value: string) {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate((v) => navigator.clipboard.writeText(v), value);
  await input.click();
  await input.press('ControlOrMeta+A');
  await input.press('ControlOrMeta+V');
}

/** Lee un store de IndexedDB. */
function stored(page: Page, store: 'cards' | 'projects') {
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

// AC-011: crear con título vacío, solo espacios o más de 120 caracteres → error junto al
// campo título y la tarjeta no se crea.
test('AC-011: crear con título no válido no crea la tarjeta', async ({ page }) => {
  await openNewProjectBoard(page);
  const column = page.getByRole('region', { name: 'Sin empezar' });
  await column.getByRole('button', { name: 'Añadir tarjeta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Añadir tarjeta' });
  const title = dialog.getByLabel('Título');

  await dialog.getByRole('button', { name: 'Añadir' }).click();
  await expect(dialog).toBeVisible();
  await expect(title).toHaveAttribute('aria-invalid', 'true');
  await expect(title).toHaveAccessibleDescription(REQUIRED);

  await title.fill('   ');
  await dialog.getByRole('button', { name: 'Añadir' }).click();
  await expect(dialog).toBeVisible();
  await expect(title).toHaveAccessibleDescription(REQUIRED);

  // Escribir 121 caracteres: el campo no recorta y se muestra el error.
  await title.fill(LONG_TITLE);
  await expect(title).toHaveValue(LONG_TITLE);
  await dialog.getByRole('button', { name: 'Añadir' }).click();
  await expect(dialog).toBeVisible();
  await expect(title).toHaveAccessibleDescription(TOO_LONG);

  // Pegar 150 caracteres con Ctrl+V: tampoco recorta ni crea.
  await title.fill('');
  await paste(page, title, PASTED_TITLE);
  await expect(title).toHaveValue(PASTED_TITLE);
  await dialog.getByRole('button', { name: 'Añadir' }).click();
  await expect(dialog).toBeVisible();
  await expect(title).toHaveAccessibleDescription(TOO_LONG);

  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialog).toBeHidden();
  await expect(column.getByRole('listitem')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('region', { name: 'Sin empezar' })).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(0);
  expect(await stored(page, 'cards')).toHaveLength(0);
});

// AC-011: guardar la edición con título vacío, solo espacios o más de 120 caracteres → error
// junto al campo título y la tarjeta no se modifica.
test('AC-011: editar con título no válido no modifica la tarjeta', async ({ page }) => {
  await openNewProjectBoard(page);
  const column = page.getByRole('region', { name: 'Sin empezar' });
  await column.getByRole('button', { name: 'Añadir tarjeta' }).click();
  const create = page.getByRole('dialog', { name: 'Añadir tarjeta' });
  await create.getByLabel('Título').fill('Login');
  await create.getByRole('button', { name: 'Añadir' }).click();
  await expect(create).toBeHidden();
  const [before] = await stored(page, 'cards');
  const [projectBefore] = await stored(page, 'projects');

  await column.getByRole('button', { name: 'Login', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Editar tarjeta' });
  const title = dialog.getByLabel('Título');

  for (const [value, message] of [
    ['', REQUIRED],
    ['   ', REQUIRED],
    [LONG_TITLE, TOO_LONG],
  ] as const) {
    await title.fill(value);
    await expect(title).toHaveValue(value);
    await chooseOption(dialog, 'Prioridad', 'Alta');
    await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(dialog).toBeVisible();
    await expect(title).toHaveAttribute('aria-invalid', 'true');
    await expect(title).toHaveAccessibleDescription(message);
  }

  // Pegar 150 caracteres con Ctrl+V: el campo no recorta y no se guarda.
  await paste(page, title, PASTED_TITLE);
  await expect(title).toHaveValue(PASTED_TITLE);
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(dialog).toBeVisible();
  await expect(title).toHaveAccessibleDescription(TOO_LONG);

  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  const card = page.getByRole('region', { name: 'Sin empezar' }).getByRole('listitem');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Login');
  await expect(card).toHaveAttribute('data-priority', '');
  expect(await stored(page, 'cards')).toEqual([before]);
  expect(await stored(page, 'projects')).toEqual([projectBefore]);
});
