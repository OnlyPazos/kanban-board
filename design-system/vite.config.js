import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

/* Solo para la página de demo (demo/). Los componentes no se compilan aquí:
   los compila la app que los importa. */
export default defineConfig({
  root: 'demo',
  plugins: [svelte()],
  build: {
    outDir: '../dist-demo',
    emptyOutDir: true,
  },
});
