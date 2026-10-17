import { expect, test, type Locator, type Page } from '@playwright/test';
import { addCard, createProject, expectDecorativeIcon, MODES, openProject, setMode, TOKENS } from './support/redesign';

// AC-062 (D-038): los enlaces de navegación siguen siendo enlaces, pero con
// el aspecto de `Button href` (a.ds-btn) tamaño sm.

type NavLink = { name: string; variant: 'ghost' | 'secondary'; icon: 'arrow-left' | 'archive' };
type View = { name: string; url: string; heading: string; links: NavLink[] };

const BACK = (name: string): NavLink => ({ name, variant: 'ghost', icon: 'arrow-left' });
const ARCHIVE = (name: string): NavLink => ({ name, variant: 'secondary', icon: 'archive' });

async function setup(page: Page): Promise<View[]> {
  await createProject(page, 'Viejo');
  await openProject(page, 'Viejo');
  const readOnlyBoard = page.url();
  await page.getByRole('link', { name: 'Volver a proyectos', exact: true }).click();
  await page.getByRole('button', { name: 'Archivar Viejo', exact: true }).click();
  // Sin recargar (`createProject` hace `goto('/')`), para no cortar el guardado del archivado.
  await page.getByRole('button', { name: 'Crear proyecto' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Crear proyecto' });
  await dialog.getByLabel('Nombre').fill('Mi app');
  await dialog.getByRole('button', { name: 'Crear', exact: true }).click();
  await expect(dialog).toBeHidden();
  await openProject(page, 'Mi app');
  await addCard(page, 'Sin empezar', 'Login');
  const board = page.url();
  const origin = new URL(board).origin;

  return [
    { name: 'lista de proyectos', url: '/#/', heading: 'Proyectos', links: [ARCHIVE('Proyectos archivados')] },
    {
      name: 'tablero',
      url: board,
      heading: 'Mi app',
      links: [BACK('Volver a proyectos'), ARCHIVE('Tarjetas archivadas')],
    },
    {
      name: 'tablero de solo lectura',
      url: readOnlyBoard,
      heading: 'Viejo',
      links: [BACK('Volver a proyectos archivados')],
    },
    { name: 'tarjetas archivadas', url: `${board}/archived`, heading: 'Tarjetas archivadas', links: [BACK('Volver al tablero')] },
    { name: 'proyectos archivados', url: '/#/archived', heading: 'Proyectos archivados', links: [BACK('Volver a proyectos')] },
    {
      name: 'página no encontrada',
      url: `${origin}/#/project/no-existe`,
      heading: 'Proyecto no encontrado',
      links: [BACK('Volver a proyectos')],
    },
  ];
}

async function gotoView(page: Page, view: View) {
  await page.goto(view.url);
  await expect(page.getByRole('heading', { level: 1, name: view.heading })).toBeVisible();
}

/** ¿`elementFromPoint` a 3,5 px fuera del borde visible cae en el enlace o un descendiente? (D-033) */
async function hitsOutside(link: Locator) {
  await link.scrollIntoViewIfNeeded();
  return link.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const d = 3.5;
    const points = {
      arriba: [cx, r.top - d],
      abajo: [cx, r.bottom + d],
      izquierda: [r.left - d, cy],
      derecha: [r.right + d, cy],
    } as const;
    return Object.fromEntries(
      Object.entries(points).map(([side, [x, y]]) => {
        const hit = document.elementFromPoint(x, y);
        return [side, hit !== null && el.contains(hit)];
      }),
    );
  });
}

/** Pulsa Tab desde el principio del documento hasta que `target` tiene el foco. */
async function tabTo(page: Page, target: Locator) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error('No se alcanzó el enlace con Tab');
}

test.describe('AC-062: enlaces de navegación con aspecto de botón', () => {
  for (const mode of MODES) {
    test(`aspecto, foco, Intro y área de pulsación (${mode})`, async ({ page }) => {
      const views = await setup(page);
      await setMode(page, mode);

      for (const view of views) {
        for (const nav of view.links) {
          await gotoView(page, view);
          const link = page.getByRole('link', { name: nav.name, exact: true });
          const where = `${view.name} · ${nav.name}`;
          await expect(link, where).toHaveCount(1);

          // Sigue siendo un enlace con el icono de AC-055, ahora `a.ds-btn` sm de su variante.
          await expect(link, where).toHaveClass(/(^|\s)ds-btn(\s|$)/);
          await expect(link, where).toHaveClass(new RegExp(`ds-btn--${nav.variant}`));
          await expect(link, where).toHaveClass(/ds-btn--sm/);
          await expectDecorativeIcon(link, nav.icon);

          // (1) Sin subrayado y al menos 36 px de alto.
          await expect(link, where).toHaveCSS('text-decoration-line', 'none');
          const box = await link.boundingBox();
          expect(box, where).not.toBeNull();
          expect(box!.height, `${where}: altura`).toBeGreaterThanOrEqual(36);

          // (2) Los secondary: fondo surface.raised y borde de 1 px.
          if (nav.variant === 'secondary') {
            await expect(link, where).toHaveCSS('background-color', TOKENS[mode].surfaceRaised);
            for (const side of ['top', 'right', 'bottom', 'left']) {
              await expect(link, where).toHaveCSS(`border-${side}-width`, '1px');
            }
          }

          // (4) Área de pulsación de 44 × 44 (D-039): arriba y abajo a 3,5 px fuera del borde,
          // como AC-057 (3); en horizontal, el ancho visible ya llega a 44 px.
          const hits = await hitsOutside(link);
          expect(hits.arriba, `${where}: 3,5 px por arriba`).toBe(true);
          expect(hits.abajo, `${where}: 3,5 px por abajo`).toBe(true);
          expect(box!.width, `${where}: ancho`).toBeGreaterThanOrEqual(44);

          // (3) Se alcanza con Tab, muestra el anillo de foco e Intro navega a su destino.
          const href = await link.getAttribute('href');
          expect(href, where).toBeTruthy();
          const destination = new URL(href as string, page.url()).href;
          await tabTo(page, link);
          await expect(link, where).toBeFocused();
          await expect(link, where).not.toHaveCSS('outline-style', 'none');
          await page.keyboard.press('Enter');
          await expect(page, where).toHaveURL(destination);
        }
      }
    });
  }
});
