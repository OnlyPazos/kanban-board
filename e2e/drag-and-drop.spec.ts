import { expect, test, type Locator, type Page } from '@playwright/test';
import { chooseOption } from './support/select';

async function openNewProject(page: Page, name: string) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Crear proyecto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  await dialog.getByLabel('Nombre').fill(name);
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('list').getByRole('button', { name, exact: true }).click();
}

async function addCard(page: Page, column: string, title: string, priority?: string) {
  await page.getByRole('region', { name: column }).getByRole('button', { name: 'Añadir tarjeta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Añadir tarjeta' });
  await dialog.getByLabel('Título').fill(title);
  await dialog.getByRole('button', { name: 'Añadir' }).click();
  await expect(dialog).toBeHidden();
  if (priority) {
    await page.getByRole('region', { name: column }).getByRole('button', { name: title, exact: true }).click();
    const edit = page.getByRole('dialog', { name: 'Editar tarjeta' });
    await chooseOption(edit, 'Prioridad', priority);
    await edit.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(edit).toBeHidden();
  }
  // Cada creación queda en un milisegundo distinto: el desempate por createdAt es determinista.
  await page.waitForTimeout(5);
}

const column = (page: Page, name: string) => page.getByRole('region', { name });
const titlesIn = (page: Page, name: string) => column(page, name).getByRole('heading', { level: 3 });
const cardIn = (page: Page, name: string, title: string) =>
  column(page, name).getByRole('listitem', { name: title, exact: true });
const dropZone = (page: Page, name: string) => column(page, name).getByRole('list', { name });

async function centreOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('El elemento no es visible');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
}

/**
 * Punto por el que se agarra una tarjeta: su borde superior (relleno de la tarjeta). El título es
 * el botón que abre la edición y `svelte-dnd-action` no inicia arrastres desde controles anidados.
 */
async function gripOf(card: Locator) {
  const { x, box } = await centreOf(card);
  return { x, y: box.y + 6 };
}

/**
 * Recorrido del dedo/puntero para que el centro de la tarjeta acabe en `to`: la librería decide
 * dónde cae la tarjeta por la posición de su centro, como el usuario al verla encima de la columna.
 */
async function dragPath(card: Locator, to: { x: number; y: number }) {
  const from = await gripOf(card);
  const centre = await centreOf(card);
  return { from, end: { x: from.x + to.x - centre.x, y: from.y + to.y - centre.y } };
}

/** Arrastre con ratón real: pulsar sobre la tarjeta, mover poco a poco y soltar con su centro en `to`. */
async function mouseDrag(
  page: Page,
  card: Locator,
  to: { x: number; y: number },
  beforeDrop?: () => Promise<void>,
) {
  const { from, end } = await dragPath(card, to);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 5, from.y + 5, { steps: 5 });
  await page.mouse.move(end.x, end.y, { steps: 25 });
  await page.waitForTimeout(150);
  await beforeDrop?.();
  await page.mouse.up();
}

/** Pulsa Tab hasta que el foco llegue a `target` (como haría un usuario de teclado mirando el foco). */
async function tabUntilFocused(page: Page, target: Locator, maxTabs = 40) {
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab');
    if ((await target.count()) === 1 && (await target.evaluate((el) => el === document.activeElement))) return;
  }
  throw new Error('El foco no llegó al elemento esperado con Tab');
}

// AC-015: al arrastrar una tarjeta de "Sin empezar" a "En pausa", su estado pasa a "En pausa",
// aparece en la posición del orden automático y tras recargar sigue en "En pausa".
test('AC-015: arrastrar con el ratón de "Sin empezar" a "En pausa" cambia el estado, respeta el orden y persiste', async ({
  page,
}) => {
  await openNewProject(page, 'Mi app');
  await addCard(page, 'En pausa', 'P-Alta', 'Alta');
  await addCard(page, 'En pausa', 'P-Baja', 'Baja');
  await addCard(page, 'Sin empezar', 'Mover', 'Media');
  await expect(titlesIn(page, 'En pausa')).toHaveText(['P-Alta', 'P-Baja']);

  // Se suelta al final de "En pausa" (debajo de P-Baja); por orden automático debe quedar en medio.
  const target = await centreOf(dropZone(page, 'En pausa'));
  await mouseDrag(
    page,
    cardIn(page, 'Sin empezar', 'Mover'),
    { x: target.x, y: target.box.y + target.box.height - 4 },
    async () => {
      // Mientras se arrastra, la tarjeta que sigue al puntero tiene el aspecto `dragging` de Card.
      await expect(page.locator('#dnd-action-dragged-el article')).toHaveClass(/ds-card--dragging/);
    },
  );

  await expect(titlesIn(page, 'En pausa')).toHaveText(['P-Alta', 'Mover', 'P-Baja']);
  await expect(titlesIn(page, 'Sin empezar')).toHaveCount(0);

  await page.reload();
  await expect(titlesIn(page, 'En pausa')).toHaveText(['P-Alta', 'Mover', 'P-Baja']);
  await expect(titlesIn(page, 'Sin empezar')).toHaveCount(0);
});

// AC-016: al arrastrar una tarjeta a otra posición dentro de su misma columna, al soltarla el
// orden sigue siendo el automático y su estado no cambia.
test('AC-016: soltar en otra posición de la misma columna mantiene el orden automático y el estado', async ({
  page,
}) => {
  await openNewProject(page, 'Mi app');
  await addCard(page, 'Sin empezar', 'T-Alta', 'Alta');
  await addCard(page, 'Sin empezar', 'T-Media', 'Media');
  await addCard(page, 'Sin empezar', 'T-Baja', 'Baja');
  await expect(titlesIn(page, 'Sin empezar')).toHaveText(['T-Alta', 'T-Media', 'T-Baja']);

  // T-Alta se arrastra por debajo de T-Baja, dentro de "Sin empezar".
  const last = await centreOf(cardIn(page, 'Sin empezar', 'T-Baja'));
  await mouseDrag(
    page,
    cardIn(page, 'Sin empezar', 'T-Alta'),
    { x: last.x, y: last.box.y + last.box.height - 4 },
    async () => {
      // Antes de soltar, el hueco de la tarjeta arrastrada ya está al final de la columna.
      await expect(column(page, 'Sin empezar').locator('li').last()).toHaveAttribute('data-dnd-shadow', 'true');
    },
  );

  await expect(titlesIn(page, 'Sin empezar')).toHaveText(['T-Alta', 'T-Media', 'T-Baja']);
  for (const other of ['En curso', 'En pausa', 'Finalizado']) {
    await expect(titlesIn(page, other)).toHaveCount(0);
  }

  await page.reload();
  await expect(titlesIn(page, 'Sin empezar')).toHaveText(['T-Alta', 'T-Media', 'T-Baja']);
});

// AC-017 (teclado): mover una tarjeta a otra columna usando solo el teclado.
test('AC-017: mover una tarjeta a otra columna solo con el teclado', async ({ page }) => {
  await openNewProject(page, 'Mi app');
  await addCard(page, 'Sin empezar', 'Teclado');
  await page.reload();
  await expect(cardIn(page, 'Sin empezar', 'Teclado')).toBeVisible();

  // Tab hasta la tarjeta y Espacio para cogerla. Con la tarjeta cogida, cada Tab que llega a una
  // columna la lleva a ella (el foco sigue en la tarjeta): se pulsa Tab hasta que está en "En pausa"
  // y Escape para soltarla.
  await tabUntilFocused(page, cardIn(page, 'Sin empezar', 'Teclado'));
  await page.keyboard.press('Space');
  await tabUntilFocused(page, cardIn(page, 'En pausa', 'Teclado'));
  await page.keyboard.press('Escape');

  await expect(titlesIn(page, 'En pausa')).toHaveText(['Teclado']);
  await expect(titlesIn(page, 'Sin empezar')).toHaveCount(0);

  await page.reload();
  await expect(titlesIn(page, 'En pausa')).toHaveText(['Teclado']);
  await expect(titlesIn(page, 'Sin empezar')).toHaveCount(0);
});

// AC-017 (táctil): mover una tarjeta a otra columna con gestos táctiles en un viewport móvil.
test.describe('AC-017 táctil', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('AC-017: mover una tarjeta a otra columna con un gesto táctil en móvil', async ({ page }) => {
    await openNewProject(page, 'Mi app');
    await addCard(page, 'Sin empezar', 'Tactil');

    const viewport = page.viewportSize();
    if (!viewport) throw new Error('Sin viewport');
    const card = cardIn(page, 'Sin empezar', 'Tactil');
    const from = await gripOf(card);
    const centre = await centreOf(card);
    // El dedo agarra la tarjeta por su borde superior; su centro va desplazado respecto al dedo.
    const offset = { x: centre.x - from.x, y: centre.y - from.y };

    // Playwright solo ofrece `tap`: el deslizamiento se emula con eventos táctiles reales del
    // navegador (CDP Input.dispatchTouchEvent): poner el dedo, deslizarlo y levantarlo.
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x: Math.round(x), y: Math.round(y) }],
      });
    const slide = async (a: { x: number; y: number }, b: { x: number; y: number }, steps = 25) => {
      for (let i = 1; i <= steps; i++) {
        await touch('touchMove', a.x + ((b.x - a.x) * i) / steps, a.y + ((b.y - a.y) * i) / steps);
      }
    };
    await touch('touchStart', from.x, from.y);

    // En móvil "En pausa" queda fuera de la pantalla (AC-020): se lleva la tarjeta junto al borde
    // derecho del tablero (dentro de él) y el tablero se desplaza solo hasta que la columna de
    // destino entra en la vista. El dedo oscila 1 px para que cada paso sea un movimiento real.
    const board = await page.getByTestId('board-columns').boundingBox();
    if (!board) throw new Error('Tablero no visible');
    const edge = { x: board.x + board.width - 10, y: from.y };
    await slide(from, edge);
    const zoneLocator = dropZone(page, 'En pausa');
    for (let i = 0; i < 200; i++) {
      const box = await zoneLocator.boundingBox();
      if (box && box.x + box.width / 2 < viewport.width - 60) break;
      await touch('touchMove', edge.x - (i % 2), edge.y);
      await page.waitForTimeout(20);
    }
    // Se aparta el dedo del borde de golpe para que el tablero deje de desplazarse.
    const rest = { x: viewport.width / 2, y: edge.y };
    await touch('touchMove', rest.x, rest.y);
    await page.waitForTimeout(150);
    const zone = await centreOf(zoneLocator);
    const to = { x: zone.x - offset.x, y: zone.y - offset.y };
    await slide(rest, to, 10);
    await page.waitForTimeout(150);
    await touch('touchEnd', to.x, to.y);

    await expect(titlesIn(page, 'En pausa')).toHaveText(['Tactil']);
    await expect(titlesIn(page, 'Sin empezar')).toHaveCount(0);

    await page.reload();
    await expect(titlesIn(page, 'En pausa')).toHaveText(['Tactil']);
  });
});
