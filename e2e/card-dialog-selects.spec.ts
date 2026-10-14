import { expect, test, type Page } from '@playwright/test';
import { addCard, column, createProject, MODES, openProject, setMode, TOKENS, type Mode } from './support/redesign';
import { chooseOption, combobox, listbox } from './support/select';

// AC-059 (D-034): Tipo, Estado y Prioridad del diálogo "Editar tarjeta" son
// combobox del sistema de diseño con su propia lista (listbox).

const FIELDS = {
  Tipo: ['Novedad', 'Mejora', 'Arreglo', 'Técnico'],
  Estado: ['Sin empezar', 'En curso', 'En pausa', 'Finalizado'],
  Prioridad: ['Alta', 'Media', 'Baja', 'Sin prioridad'],
} as const;

const editDialog = (page: Page) => page.getByRole('dialog', { name: 'Editar tarjeta' });

/** Proyecto con la tarjeta "Login" en "En curso" (tipo Novedad, sin prioridad) y su diálogo abierto. */
async function openLogin(page: Page, mode?: Mode) {
  await createProject(page, 'Mi app');
  await openProject(page, 'Mi app');
  if (mode) await setMode(page, mode);
  await addCard(page, 'En curso', 'Login');
  await column(page, 'En curso').getByRole('button', { name: 'Login', exact: true }).click();
  await expect(editDialog(page)).toBeVisible();
  return editDialog(page);
}

test.describe('AC-059: selectores del diálogo "Editar tarjeta"', () => {
  test('(0)(1) combobox con el valor actual; cada lista tiene sus opciones en orden y solo la actual seleccionada', async ({
    page,
  }) => {
    const dialog = await openLogin(page);
    const current = { Tipo: 'Novedad', Estado: 'En curso', Prioridad: 'Sin prioridad' };

    for (const [name, options] of Object.entries(FIELDS)) {
      const field = combobox(dialog, name);
      await expect(field).toHaveText(current[name as keyof typeof current]);
      await expect(field).toHaveAttribute('aria-expanded', 'false');

      await field.click();
      await expect(field).toHaveAttribute('aria-expanded', 'true');
      const list = listbox(dialog, name);
      await expect(list).toBeVisible();
      await expect(list.getByRole('option')).toHaveText([...options]);
      for (const option of options) {
        const selected = option === current[name as keyof typeof current] ? 'true' : 'false';
        await expect(list.getByRole('option', { name: option, exact: true })).toHaveAttribute('aria-selected', selected);
      }
      await field.click();
      await expect(list).toBeHidden();
    }
  });

  test('(2) pulsar una opción cierra la lista, el combobox la muestra y "Guardar cambios" la guarda (AC-012)', async ({
    page,
  }) => {
    const dialog = await openLogin(page);

    await combobox(dialog, 'Tipo').click();
    await listbox(dialog, 'Tipo').getByRole('option', { name: 'Arreglo', exact: true }).click();
    await expect(listbox(dialog, 'Tipo')).toBeHidden();
    await expect(combobox(dialog, 'Tipo')).toHaveText('Arreglo');

    await chooseOption(dialog, 'Estado', 'En pausa');
    await chooseOption(dialog, 'Prioridad', 'Alta');
    await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(dialog).toBeHidden();

    // La tarjeta pasa a "En pausa" con tipo Arreglo y prioridad Alta, también tras recargar.
    await page.reload();
    const card = column(page, 'En pausa').getByRole('listitem', { name: 'Login', exact: true });
    await expect(card).toContainText('Arreglo');
    await expect(card).toContainText('Alta');
    await card.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(combobox(editDialog(page), 'Tipo')).toHaveText('Arreglo');
    await expect(combobox(editDialog(page), 'Estado')).toHaveText('En pausa');
    await expect(combobox(editDialog(page), 'Prioridad')).toHaveText('Alta');
  });

  test('(3) teclado: ↓ abre, ↓ ↑ mueven la opción activa, Intro elige; Escape cierra solo la lista', async ({
    page,
  }) => {
    const dialog = await openLogin(page);
    const field = combobox(dialog, 'Prioridad');
    const list = listbox(dialog, 'Prioridad');
    const option = (name: string) => list.getByRole('option', { name, exact: true });
    const expectActive = async (name: string) => {
      const id = await option(name).getAttribute('id');
      expect(id).toBeTruthy();
      await expect(field).toHaveAttribute('aria-activedescendant', id as string);
    };

    await field.focus();
    await page.keyboard.press('ArrowDown');
    await expect(list).toBeVisible();
    await expect(field).toBeFocused();
    await expectActive('Sin prioridad');

    await page.keyboard.press('ArrowUp');
    await expectActive('Baja');
    await page.keyboard.press('ArrowUp');
    await expectActive('Media');
    await page.keyboard.press('ArrowDown');
    await expectActive('Baja');

    await page.keyboard.press('Enter');
    await expect(list).toBeHidden();
    await expect(field).toHaveText('Baja');
    await expect(field).not.toHaveAttribute('aria-activedescendant');

    // Escape con la lista abierta: se cierra solo la lista y el valor no cambia.
    await page.keyboard.press('ArrowDown');
    await expect(list).toBeVisible();
    await page.keyboard.press('ArrowUp');
    await expectActive('Media');
    await page.keyboard.press('Escape');
    await expect(list).toBeHidden();
    await expect(dialog).toBeVisible();
    await expect(field).toHaveText('Baja');

    // Un segundo Escape cierra el diálogo.
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('(4) la lista de Prioridad se ve entera aunque el diálogo sea más pequeño', async ({ page }) => {
    const dialog = await openLogin(page);
    await combobox(dialog, 'Prioridad').click();
    const option = listbox(dialog, 'Prioridad').getByRole('option', { name: 'Sin prioridad', exact: true });
    await expect(option).toBeVisible();

    const box = await option.boundingBox();
    expect(box).not.toBeNull();
    const viewport = page.viewportSize() as { width: number; height: number };
    const x = box!.x + box!.width / 2;
    const y = box!.y + box!.height / 2;
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(viewport.width);
    expect(y).toBeLessThanOrEqual(viewport.height);

    const hit = await option.evaluate(
      (el, point) => {
        const found = document.elementFromPoint(point.x, point.y);
        return found !== null && el.contains(found);
      },
      { x, y },
    );
    expect(hit).toBe(true);
  });

  for (const mode of MODES) {
    test(`(5) lista con fondo surface.raised y opción elegida con action.tint (${mode})`, async ({ page }) => {
      const dialog = await openLogin(page, mode);
      await combobox(dialog, 'Tipo').click();
      const list = listbox(dialog, 'Tipo');
      await expect(list).toHaveCSS('background-color', TOKENS[mode].surfaceRaised);

      // Con el puntero sobre otra opción, la elegida ("Novedad") no es además la activa.
      await list.getByRole('option', { name: 'Técnico', exact: true }).hover();
      const chosen = list.getByRole('option', { name: 'Novedad', exact: true });
      await expect(chosen).toHaveAttribute('aria-selected', 'true');
      await expect(chosen).toHaveCSS('background-color', TOKENS[mode].actionTint);
    });
  }
});
