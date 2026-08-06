import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.json' with { type: 'json' };

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    crx({ manifest }),
  ],
  build: {
    emptyOutDir: true,
    outDir: 'dist',
    modulePreload: false, // Fix "cross-world extension resource mismatch" warning in Chrome Extensions
  },
});
