import { expect, test, type Page } from '@playwright/test';

/** AC-038: dos pestañas (páginas) del mismo contexto de navegador comparten IndexedDB. */

const projectList = (page: Page) => page.getByRole('region', { name: 'Proyectos', exact: true });
const column = (page: Page, name: string) => page.getByRole('region', { name });

async function createProject(page: Page, name: string) {
  await page.getByRole('button', { name: 'Crear proyecto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  await dialog.getByLabel('Nombre').fill(name);
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog).toBeHidden();
}

async function addCard(page: Page, columnName: string, title: string) {
  await column(page, columnName).getByRole('button', { name: 'Añadir tarjeta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Añadir tarjeta' });
  await dialog.getByLabel('Título').fill(title);
  await dialog.getByRole('button', { name: 'Añadir' }).click();
  await expect(dialog).toBeHidden();
}

async function openBoard(page: Page, name: string) {
  await projectList(page).getByRole('button', { name, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
}

test('AC-038: una tarjeta creada en A aparece en B sin recargar; con ediciones del título de la misma tarjeta gana el último guardado', async ({
  context,
}) => {
  const a = await context.newPage();
  const b = await context.newPage();
  await a.goto('/');
  await b.goto('/');

  // El proyecto creado en A también aparece en la lista de B sin recargar.
  await createProject(a, 'Mi app');
  await expect(projectList(b).getByRole('button', { name: 'Mi app', exact: true })).toBeVisible();
  await openBoard(a, 'Mi app');
  await openBoard(b, 'Mi app');

  // Crear una tarjeta en A: aparece en B sin recargar.
  await addCard(a, 'Sin empezar', 'Login');
  await expect(column(b, 'Sin empezar').getByRole('button', { name: 'Login', exact: true })).toBeVisible();

  // A y B abren la misma tarjeta. B empieza a escribir; A guarda primero y B después.
  await column(a, 'Sin empezar').getByRole('button', { name: 'Login', exact: true }).click();
  await column(b, 'Sin empezar').getByRole('button', { name: 'Login', exact: true }).click();
  const editA = a.getByRole('dialog', { name: 'Editar tarjeta' });
  const editB = b.getByRole('dialog', { name: 'Editar tarjeta' });
  await editB.getByLabel('Título').fill('Título B');
  await editA.getByLabel('Título').fill('Título A');
  await editA.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(editA).toBeHidden();
  // El cambio de A llega a B, pero no pisa lo que B está escribiendo.
  await expect(column(b, 'Sin empezar').getByRole('button', { name: 'Título A', exact: true })).toBeAttached();
  await expect(editB.getByLabel('Título')).toHaveValue('Título B');
  await editB.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(editB).toBeHidden();

  // El último cambio guardado (B) es el valor final en ambas pestañas…
  for (const page of [a, b]) {
    await expect(column(page, 'Sin empezar').getByRole('button', { name: 'Título B', exact: true })).toBeVisible();
    await expect(column(page, 'Sin empezar').getByRole('button', { name: 'Título A', exact: true })).toHaveCount(0);
  }

  // …y tras recargar.
  for (const page of [a, b]) {
    await page.reload();
    await expect(column(page, 'Sin empezar').getByRole('button', { name: 'Título B', exact: true })).toBeVisible();
    await expect(column(page, 'Sin empezar').getByRole('listitem')).toHaveCount(1);
  }
});

test('AC-038: si A guarda después que B, el valor final es el de A en ambas pestañas y tras recargar', async ({
  context,
}) => {
  const a = await context.newPage();
  const b = await context.newPage();
  await a.goto('/');
  await createProject(a, 'Mi app');
  await openBoard(a, 'Mi app');
  await addCard(a, 'Sin empezar', 'Login');
  await b.goto(a.url());
  await expect(column(b, 'Sin empezar').getByRole('button', { name: 'Login', exact: true })).toBeVisible();

  await column(b, 'Sin empezar').getByRole('button', { name: 'Login', exact: true }).click();
  const editB = b.getByRole('dialog', { name: 'Editar tarjeta' });
  await editB.getByLabel('Título').fill('Título B');
  await editB.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(editB).toBeHidden();
  await expect(column(a, 'Sin empezar').getByRole('button', { name: 'Título B', exact: true })).toBeVisible();

  await column(a, 'Sin empezar').getByRole('button', { name: 'Título B', exact: true }).click();
  const editA = a.getByRole('dialog', { name: 'Editar tarjeta' });
  await editA.getByLabel('Título').fill('Título A');
  await editA.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(editA).toBeHidden();

  for (const page of [a, b]) {
    await expect(column(page, 'Sin empezar').getByRole('button', { name: 'Título A', exact: true })).toBeVisible();
    await expect(column(page, 'Sin empezar').getByRole('button', { name: 'Título B', exact: true })).toHaveCount(0);
  }
  for (const page of [a, b]) {
    await page.reload();
    await expect(column(page, 'Sin empezar').getByRole('button', { name: 'Título A', exact: true })).toBeVisible();
  }
});
