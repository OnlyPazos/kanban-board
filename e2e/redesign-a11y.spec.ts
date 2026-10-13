import { expect, test, type Locator, type Page } from '@playwright/test';
import { addCard, column, createProject, MODES, openProject, setMode } from './support/redesign';

// AC-057: accesibilidad y adaptación del rediseño (verificación transversal de AC-047 … AC-056).

type View = { name: string; url: string; heading: string };

/**
 * Datos para que cada vista tenga todos sus controles: "Mi app" (activo) con "Login" en el tablero y
 * "Vieja" archivada, y "Viejo" (archivado) con una tarjeta. Devuelve las vistas de AC-047 más el
 * tablero de solo lectura.
 */
async function setup(page: Page): Promise<View[]> {
  await createProject(page, 'Viejo');
  await openProject(page, 'Viejo');
  await addCard(page, 'En curso', 'Antigua', { priority: 'Alta' });
  const oldBoard = page.url();
  await page.getByRole('link', { name: 'Volver a proyectos', exact: true }).click();
  await page.getByRole('button', { name: 'Archivar Viejo', exact: true }).click();

  await page.getByRole('button', { name: 'Crear proyecto' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  await dialog.getByLabel('Nombre').fill('Mi app');
  await dialog.getByRole('button', { name: 'Crear', exact: true }).click();
  await expect(dialog).toBeHidden();
  await openProject(page, 'Mi app');
  await addCard(page, 'Sin empezar', 'Login', { type: 'Arreglo', priority: 'Media' });
  await addCard(page, 'En pausa', 'Vieja');
  await column(page, 'En pausa').getByRole('button', { name: 'Archivar Vieja', exact: true }).click();
  const board = page.url();

  return [
    { name: 'lista de proyectos', url: '/#/', heading: 'Proyectos' },
    { name: 'tablero', url: board, heading: 'Mi app' },
    { name: 'tablero de solo lectura', url: oldBoard, heading: 'Viejo' },
    { name: 'tarjetas archivadas', url: `${board}/archived`, heading: 'Tarjetas archivadas' },
    { name: 'proyectos archivados', url: '/#/archived', heading: 'Proyectos archivados' },
  ];
}

async function gotoView(page: Page, view: View) {
  await page.goto(view.url);
  await expect(page.getByRole('heading', { level: 1, name: view.heading })).toBeVisible();
}

test.describe('AC-057 (1): botones de solo icono con nombre e iconos ocultos a lectores de pantalla', () => {
  test('en todas las vistas, en claro y en oscuro', async ({ page }) => {
    const views = await setup(page);
    for (const view of views) {
      await gotoView(page, view);
      for (const mode of MODES) {
        await setMode(page, mode);

        const buttons = await page.getByRole('button').all();
        let iconOnly = 0;
        for (const button of buttons) {
          if ((await button.innerText()).trim() !== '') continue;
          iconOnly++;
          await expect(button, `${view.name} (${mode}): botón sin texto visible`).toHaveAccessibleName(/\S/);
        }
        if (view.name === 'tablero') expect(iconOnly, 'el tablero tiene botones de solo icono').toBeGreaterThan(0);

        const exposed = await page.locator('svg.lucide').evaluateAll((icons) =>
          icons.filter((icon) => !icon.closest('[aria-hidden="true"]')).map((icon) => icon.getAttribute('class')),
        );
        expect(exposed, `${view.name} (${mode}): svg.lucide expuestos`).toEqual([]);
      }
    }
  });
});

test.describe('AC-057 (2): 375 px sin desplazamiento horizontal', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('ninguna vista se desplaza en horizontal y las 4 columnas se alcanzan dentro del tablero', async ({ page }) => {
    const views = await setup(page);
    for (const view of views) {
      await gotoView(page, view);
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(width, `${view.name}: scrollWidth`).toBeLessThanOrEqual(375);
    }

    await gotoView(page, views[1]);
    const board = page.getByTestId('board-columns');
    for (const name of ['Sin empezar', 'En curso', 'En pausa', 'Finalizado']) {
      const region = column(page, name);
      await region.scrollIntoViewIfNeeded();
      const box = await region.boundingBox();
      if (!box) throw new Error(`Columna ${name} no visible`);
      expect(box.x, `${name}: dentro de la pantalla`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `${name}: dentro de la pantalla`).toBeLessThanOrEqual(375);
      expect(await page.evaluate(() => window.scrollX)).toBe(0);
    }
    expect(await board.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  });
});

/** Puntos a 4 px fuera del borde visible del botón (arriba, abajo, izquierda, derecha). */
async function hitsOutside(button: Locator) {
  await button.scrollIntoViewIfNeeded();
  return button.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const points = {
      arriba: [cx, r.top - 4],
      abajo: [cx, r.bottom + 4],
      izquierda: [r.left - 4, cy],
      derecha: [r.right + 4, cy],
    } as const;
    return {
      size: [r.width, r.height],
      hits: Object.fromEntries(
        Object.entries(points).map(([side, [x, y]]) => [side, document.elementFromPoint(x, y) === el]),
      ),
    };
  });
}

test.describe('AC-057 (3): área de pulsación de 44 × 44 en los botones de solo icono', () => {
  test('"Añadir tarjeta en …" y "Archivar {título}" responden a 4 px fuera de su borde visible', async ({ page }) => {
    // La zona ampliada del `::after` mide exactamente 44 × 44 (de −4 a +40 px sobre el botón de 36 px):
    // hasta 3,99 px responde por los 4 lados, pero a 4,0 px exactos abajo y derecha caen en su borde
    // exclusivo. Según WI-AC-057 no se ajusta el umbral por cuenta propia: pendiente de spec-writer.
    test.fixme(true, 'AC-057 (3): medida a 4,0 px exactos en el límite de la zona; pendiente de precisar en la spec');
    await createProject(page, 'Mi app');
    await openProject(page, 'Mi app');
    await addCard(page, 'Sin empezar', 'Login');

    const buttons = [
      ...['Sin empezar', 'En curso', 'En pausa', 'Finalizado'].map((name) =>
        page.getByRole('button', { name: `Añadir tarjeta en ${name}`, exact: true }),
      ),
      page.getByRole('button', { name: 'Archivar Login', exact: true }),
    ];
    for (const button of buttons) {
      const { size, hits } = await hitsOutside(button);
      const label = await button.getAttribute('aria-label');
      expect(hits, `${label} (${size.join('×')} px)`).toEqual({ arriba: true, abajo: true, izquierda: true, derecha: true });
    }
  });
});

test.describe('AC-057 (4): AC-015 con prefers-reduced-motion: reduce', () => {
  test.use({ reducedMotion: 'reduce' });

  test('arrastrar con el ratón de "Sin empezar" a "En pausa" cambia el estado, respeta el orden y persiste', async ({
    page,
  }) => {
    await createProject(page, 'Mi app');
    await openProject(page, 'Mi app');
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
    await addCard(page, 'En pausa', 'P-Alta', { priority: 'Alta' });
    await addCard(page, 'En pausa', 'P-Baja', { priority: 'Baja' });
    await addCard(page, 'Sin empezar', 'Mover', { priority: 'Media' });
    const titles = (name: string) => column(page, name).getByRole('heading', { level: 3 });
    await expect(titles('En pausa')).toHaveText(['P-Alta', 'P-Baja']);

    // Igual que el e2e de AC-015: se coge la tarjeta por su borde superior y se suelta con su centro
    // al final de la zona de "En pausa"; por orden automático debe quedar en medio.
    const card = column(page, 'Sin empezar').getByRole('listitem', { name: 'Mover', exact: true });
    const cardBox = await card.boundingBox();
    const zoneBox = await column(page, 'En pausa').getByRole('list', { name: 'En pausa' }).boundingBox();
    if (!cardBox || !zoneBox) throw new Error('Tarjeta o columna no visibles');
    const from = { x: cardBox.x + cardBox.width / 2, y: cardBox.y + 6 };
    const to = { x: zoneBox.x + zoneBox.width / 2, y: zoneBox.y + zoneBox.height - 4 };
    const end = { x: to.x, y: to.y - (cardBox.height / 2 - 6) };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 5, from.y + 5, { steps: 5 });
    await page.mouse.move(end.x, end.y, { steps: 25 });
    await page.waitForTimeout(150);
    await page.mouse.up();

    await expect(titles('En pausa')).toHaveText(['P-Alta', 'Mover', 'P-Baja']);
    await expect(titles('Sin empezar')).toHaveCount(0);
    await page.reload();
    await expect(titles('En pausa')).toHaveText(['P-Alta', 'Mover', 'P-Baja']);
    await expect(titles('Sin empezar')).toHaveCount(0);
  });
});
