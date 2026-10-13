import { expect, test, type Page } from '@playwright/test';

async function createProject(page: Page, name: string) {
  await page.getByRole('button', { name: 'Crear proyecto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  await dialog.getByLabel('Nombre').fill(name);
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog).toBeHidden();
}

async function addCard(page: Page, column: string, title: string) {
  await page.getByRole('region', { name: column }).getByRole('button', { name: 'Añadir tarjeta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Añadir tarjeta' });
  await dialog.getByLabel('Título').fill(title);
  await dialog.getByRole('button', { name: 'Añadir' }).click();
  await expect(dialog).toBeHidden();
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

// AC-012: editar título, tipo, estado, descripción multilínea y prioridad → se refleja en el
// tablero (cambia de columna) y tras recargar; updatedAt cambia, createdAt no; fechas no editables.
test('AC-012: editar una tarjeta → cambia de columna, persiste tras recargar y solo cambia updatedAt', async ({ page }) => {
  await page.goto('/');
  await createProject(page, 'Mi app');
  await page.getByRole('list').getByRole('button', { name: 'Mi app', exact: true }).click();
  await addCard(page, 'Sin empezar', 'Login');
  const [before] = await stored(page, 'cards');
  const [projectBefore] = await stored(page, 'projects');

  await page.getByRole('region', { name: 'Sin empezar' }).getByRole('button', { name: 'Login', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Editar tarjeta' });
  await expect(dialog.getByLabel('Título')).toHaveValue('Login');
  // Las fechas se muestran en solo lectura: no hay campos para editarlas.
  await expect(dialog.getByTestId('card-created-at')).toHaveAttribute('datetime', before.createdAt as string);
  await expect(dialog.getByTestId('card-updated-at')).toBeVisible();
  await expect(dialog.locator('input, select, textarea')).toHaveCount(5);

  await dialog.getByLabel('Título').fill('Login con Google');
  await dialog.getByLabel('Tipo').selectOption({ label: 'Arreglo' });
  await dialog.getByLabel('Estado').selectOption({ label: 'En pausa' });
  await dialog.getByLabel('Descripción').fill('Primera línea\nSegunda línea');
  await dialog.getByLabel('Prioridad').selectOption({ label: 'Alta' });
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(dialog).toBeHidden();

  const enPausa = page.getByRole('region', { name: 'En pausa' });
  const check = async () => {
    const card = enPausa.getByRole('listitem').filter({ hasText: 'Login con Google' });
    await expect(card).toHaveCount(1);
    await expect(card).toHaveAttribute('data-type', 'arreglo');
    await expect(card).toHaveAttribute('data-priority', 'alta');
    await expect(card).toContainText('Arreglo');
    await expect(card).toContainText('Alta');
    await expect(card).toContainText('Primera línea');
    await expect(page.getByRole('region', { name: 'Sin empezar' }).getByRole('listitem')).toHaveCount(0);
  };
  await check();

  await page.reload();
  await check();

  const cards = await stored(page, 'cards');
  expect(cards).toHaveLength(1);
  const after = cards[0];
  expect(after).toMatchObject({
    id: before.id,
    title: 'Login con Google',
    type: 'arreglo',
    status: 'en-pausa',
    description: 'Primera línea\nSegunda línea',
    priority: 'alta',
    createdAt: before.createdAt,
  });
  expect((after.updatedAt as string) > (before.updatedAt as string)).toBe(true);
  const [projectAfter] = await stored(page, 'projects');
  expect(projectAfter.updatedAt).toBe(after.updatedAt);
  expect((projectAfter.updatedAt as string) > (projectBefore.updatedAt as string)).toBe(true);

  // El editor reabierto conserva la descripción multilínea y muestra la nueva fecha de modificación.
  await enPausa.getByRole('button', { name: 'Login con Google', exact: true }).click();
  await expect(dialog.getByLabel('Descripción')).toHaveValue('Primera línea\nSegunda línea');
  await expect(dialog.getByTestId('card-updated-at')).toHaveAttribute('datetime', after.updatedAt as string);
});

// AC-013: cada tarjeta muestra su tipo como etiqueta de texto con un color distinto por tipo,
// y su prioridad solo cuando la tiene.
test('AC-013: etiqueta de tipo con color distinto por tipo y prioridad solo cuando existe', async ({ page }) => {
  await page.goto('/');
  await createProject(page, 'Mi app');
  await page.getByRole('list').getByRole('button', { name: 'Mi app', exact: true }).click();

  const specs = [
    { title: 'T-nov', type: 'Novedad', priority: 'Alta' },
    { title: 'T-mej', type: 'Mejora', priority: 'Media' },
    { title: 'T-arr', type: 'Arreglo', priority: 'Baja' },
    { title: 'T-tec', type: 'Técnico', priority: 'Sin prioridad' },
  ];
  const column = page.getByRole('region', { name: 'Sin empezar' });
  const dialog = page.getByRole('dialog', { name: 'Editar tarjeta' });
  for (const s of specs) {
    await addCard(page, 'Sin empezar', s.title);
    await column.getByRole('button', { name: s.title, exact: true }).click();
    await dialog.getByLabel('Tipo').selectOption({ label: s.type });
    await dialog.getByLabel('Prioridad').selectOption({ label: s.priority });
    await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(dialog).toBeHidden();
  }

  const colors: string[] = [];
  for (const s of specs) {
    const badges = column.getByRole('listitem').filter({ hasText: s.title }).locator('.ds-badge');
    await expect(badges.first()).toHaveText(s.type);
    colors.push(await badges.first().evaluate((el) => getComputedStyle(el).backgroundColor));
    if (s.priority === 'Sin prioridad') {
      await expect(badges).toHaveCount(1);
    } else {
      await expect(badges).toHaveCount(2);
      await expect(badges.nth(1)).toHaveText(s.priority);
    }
  }
  expect(new Set(colors).size).toBe(4);
});
