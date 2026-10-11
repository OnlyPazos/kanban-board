import { expect, test } from '@playwright/test';

// AC-001: al abrir la app por primera vez (sin datos guardados), la pantalla
// inicial muestra un estado vacío con "Crear proyecto" e "Importar".
test('AC-001: con almacenamiento limpio se ven "Crear proyecto" e "Importar"', async ({ page }) => {
  // Cada test de Playwright usa un contexto de navegador nuevo: almacenamiento limpio.
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Crear proyecto' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Importar' })).toBeVisible();
});
