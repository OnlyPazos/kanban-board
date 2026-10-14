import { expect, test, type Page } from '@playwright/test';
import { chooseOption } from './support/select';

async function createProject(page: Page, name: string) {
  await page.getByRole('button', { name: 'Crear proyecto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  await dialog.getByLabel('Nombre').fill(name);
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog).toBeHidden();
}

async function openProject(page: Page, name: string) {
  await page.getByRole('list').getByRole('button', { name, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
}

async function addCard(page: Page, title: string, type: string) {
  await page.getByRole('region', { name: 'Sin empezar' }).getByRole('button', { name: 'Añadir tarjeta' }).click();
  const create = page.getByRole('dialog', { name: 'Añadir tarjeta' });
  await create.getByLabel('Título').fill(title);
  await create.getByRole('button', { name: 'Añadir' }).click();
  await expect(create).toBeHidden();
  if (type === 'Novedad') return;
  await page.getByRole('region', { name: 'Sin empezar' }).getByRole('button', { name: title, exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'Editar tarjeta' });
  await chooseOption(edit, 'Tipo', type);
  await edit.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(edit).toBeHidden();
}

/** Proyecto con una tarjeta de cada tipo: N (Novedad), M (Mejora), A (Arreglo), T (Técnico). */
async function projectWithFourTypes(page: Page, name: string) {
  await createProject(page, name);
  await openProject(page, name);
  for (const [title, type] of [
    ['N', 'Novedad'],
    ['M', 'Mejora'],
    ['A', 'Arreglo'],
    ['T', 'Técnico'],
  ]) {
    await addCard(page, title, type);
  }
}

/** Filtros guardados en IndexedDB (store `prefs`, claves `filter:<projectId>`), en orden de clave. */
async function storedFilters(page: Page): Promise<unknown[]> {
  return page.evaluate(
    () =>
      new Promise<unknown[]>((resolve, reject) => {
        const open = indexedDB.open('kanban-board');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const request = db.transaction('prefs').objectStore('prefs').getAll(IDBKeyRange.bound('filter:', 'filter;'));
          request.onsuccess = () => {
            db.close();
            resolve(request.result);
          };
          request.onerror = () => reject(request.error);
        };
      }),
  );
}

const filter = (page: Page) => page.getByRole('group', { name: 'Filtrar por tipo' });
const chip = (page: Page, label: string) => filter(page).getByRole('button', { name: label, exact: true });
const visibleTitles = (page: Page) => page.getByRole('heading', { level: 3 });

test('AC-018: filtrar por "Arreglo" deja solo las tarjetas Arreglo; al quitarlo vuelven todas', async ({ page }) => {
  await page.goto('/');
  await projectWithFourTypes(page, 'Mi app');
  await expect(visibleTitles(page)).toHaveCount(4);

  await chip(page, 'Arreglo').click();
  await expect(chip(page, 'Arreglo')).toHaveAttribute('aria-pressed', 'true');
  await expect(visibleTitles(page)).toHaveText(['A']);

  await chip(page, 'Arreglo').click();
  await expect(chip(page, 'Arreglo')).toHaveAttribute('aria-pressed', 'false');
  await expect(visibleTitles(page)).toHaveCount(4);
});

test('AC-019: el filtro se recuerda por proyecto tras recargar', async ({ page }) => {
  await page.goto('/');
  await projectWithFourTypes(page, 'B');
  await page.getByRole('link', { name: /volver a proyectos/i }).click();
  await projectWithFourTypes(page, 'A');

  await chip(page, 'Arreglo').click();
  await expect(visibleTitles(page)).toHaveText(['A']);
  // Guardado automático e inmediato, sin botón "Guardar".
  await expect.poll(() => storedFilters(page)).toEqual([['arreglo']]);

  await page.reload();
  await expect(chip(page, 'Arreglo')).toHaveAttribute('aria-pressed', 'true');
  await expect(visibleTitles(page)).toHaveText(['A']);

  await page.getByRole('link', { name: /volver a proyectos/i }).click();
  await openProject(page, 'B');
  for (const label of ['Novedad', 'Mejora', 'Arreglo', 'Técnico']) {
    await expect(chip(page, label)).toHaveAttribute('aria-pressed', 'false');
  }
  await expect(visibleTitles(page)).toHaveCount(4);
});

test('AC-039: selección múltiple "Arreglo" + "Técnico", se recuerda y sin selección se ven todas', async ({ page }) => {
  await page.goto('/');
  await projectWithFourTypes(page, 'Mi app');

  await chip(page, 'Arreglo').click();
  await chip(page, 'Técnico').click();
  await expect(visibleTitles(page)).toHaveText(['A', 'T']);
  await expect.poll(() => storedFilters(page)).toEqual([['arreglo', 'tecnico']]);

  await page.reload();
  await expect(chip(page, 'Arreglo')).toHaveAttribute('aria-pressed', 'true');
  await expect(chip(page, 'Técnico')).toHaveAttribute('aria-pressed', 'true');
  await expect(visibleTitles(page)).toHaveText(['A', 'T']);

  await chip(page, 'Arreglo').click();
  await chip(page, 'Técnico').click();
  await expect(visibleTitles(page)).toHaveCount(4);
  await expect.poll(() => storedFilters(page)).toEqual([[]]);

  await page.reload();
  await expect(visibleTitles(page)).toHaveCount(4);
});
