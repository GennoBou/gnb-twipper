import { defineConfig, configDefaults } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    conditions: ['browser'],
  },
  test: {
    setupFiles: ['./vitest.setup.ts'],
    exclude: [...configDefaults.exclude, '**/*.bench.test.ts'],
  },
});
