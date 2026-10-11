import { expect, test, type Download, type Page } from '@playwright/test';

/** AC-037: se elimina `indexedDB` del navegador antes de que arranque la app. */
const removeIndexedDB = (page: Page) =>
  page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true });
  });

const projectList = (page: Page) => page.getByRole('region', { name: 'Proyectos', exact: true });
const warning = (page: Page) => page.getByRole('alert').filter({ hasText: 'Tus datos no se conservarán al cerrar' });

async function createProject(page: Page, name: string) {
  await page.getByRole('button', { name: 'Crear proyecto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  await dialog.getByLabel('Nombre').fill(name);
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog).toBeHidden();
  await expect(projectList(page).getByRole('button', { name, exact: true })).toBeVisible();
}

async function readDownload(download: Download): Promise<{
  formatVersion: number;
  kind: string;
  projects: { name: string; description: string }[];
  cards: { title: string; status: string }[];
}> {
  const stream: AsyncIterable<Uint8Array> = await download.createReadStream();
  const decoder = new TextDecoder();
  let text = '';
  for await (const chunk of stream) text += decoder.decode(chunk, { stream: true });
  text += decoder.decode();
  return JSON.parse(text);
}

test('AC-037: sin IndexedDB hay un aviso permanente y se puede crear, editar y exportar en memoria', async ({ page }) => {
  await removeIndexedDB(page);
  await page.goto('/');
  expect(await page.evaluate(() => typeof window.indexedDB)).toBe('undefined');
  await expect(warning(page)).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'No se pudieron guardar los cambios' })).toHaveCount(0);

  // Crear y editar un proyecto.
  await createProject(page, 'Mi app');
  await page.getByRole('button', { name: 'Editar Mi app' }).click();
  const editProject = page.getByRole('dialog', { name: 'Editar proyecto' });
  await editProject.getByLabel('Descripción').fill('Sin IndexedDB');
  await editProject.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(editProject).toBeHidden();
  await expect(warning(page)).toBeVisible();

  // Crear y editar una tarjeta en el tablero: el aviso sigue visible.
  await projectList(page).getByRole('button', { name: 'Mi app', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mi app' })).toBeVisible();
  await expect(warning(page)).toBeVisible();
  await page.getByRole('region', { name: 'Sin empezar' }).getByRole('button', { name: 'Añadir tarjeta' }).click();
  const addCard = page.getByRole('dialog', { name: 'Añadir tarjeta' });
  await addCard.getByLabel('Título').fill('Login');
  await addCard.getByRole('button', { name: 'Añadir' }).click();
  await expect(addCard).toBeHidden();

  await page.getByRole('region', { name: 'Sin empezar' }).getByRole('button', { name: 'Login' }).click();
  const editCard = page.getByRole('dialog', { name: 'Editar tarjeta' });
  await editCard.getByLabel('Título').fill('Login con Google');
  await editCard.getByLabel('Estado').selectOption({ label: 'En curso' });
  await editCard.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(editCard).toBeHidden();
  await expect(
    page.getByRole('region', { name: 'En curso' }).getByRole('listitem').filter({ hasText: 'Login con Google' }),
  ).toHaveCount(1);
  await expect(warning(page)).toBeVisible();

  // Exportar el proyecto y todo: los datos en memoria salen en el archivo.
  const projectDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar proyecto' }).click();
  const projectData = await readDownload(await projectDownload);
  expect(projectData).toMatchObject({
    kind: 'project',
    projects: [{ name: 'Mi app', description: 'Sin IndexedDB' }],
    cards: [{ title: 'Login con Google', status: 'en-curso' }],
  });

  await page.getByRole('link', { name: /volver a proyectos/i }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Proyectos' })).toBeVisible();
  await expect(warning(page)).toBeVisible();
  const fullDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar todo' }).click();
  const fullData = await readDownload(await fullDownload);
  expect(fullData.kind).toBe('full');
  expect(typeof fullData.formatVersion).toBe('number');
  expect(fullData.projects).toMatchObject([{ name: 'Mi app', description: 'Sin IndexedDB' }]);
  expect(fullData.cards).toMatchObject([{ title: 'Login con Google', status: 'en-curso' }]);
  await expect(page.getByRole('alert').filter({ hasText: 'No se pudieron guardar los cambios' })).toHaveCount(0);
});

test('AC-037: con IndexedDB disponible no hay aviso', async ({ page }) => {
  await page.goto('/');
  await createProject(page, 'Mi app');
  await expect(page.getByText('Tus datos no se conservarán al cerrar')).toHaveCount(0);
});
