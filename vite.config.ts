/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    // design-system se enlaza como file: (symlink) y trae su propio node_modules
    // con svelte y @lucide/svelte: forzamos una única instancia de cada uno en la app.
    dedupe: ['svelte', '@lucide/svelte'],
    // En tests (Vitest), usar la build de navegador de svelte (mount/DOM) en vez de la
    // de servidor. Fuera de Vitest se mantienen las condiciones por defecto de Vite.
    ...(process.env.VITEST ? { conditions: ['browser'] } : {}),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test-setup.ts'],
    server: {
      deps: {
        // Compilar los .svelte de design-system con el plugin de la app.
        inline: ['design-system'],
      },
    },
  },
});
