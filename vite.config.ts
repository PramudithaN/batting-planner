import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string };

function stampSwVersionPlugin(version: string): Plugin {
  return {
    name: 'stamp-sw-version',
    closeBundle() {
      const swPath = resolve('docs', 'sw.js');
      try {
        const content = readFileSync(swPath, 'utf-8');
        const updated = content.replace(/slc-bp-v[^'"]+/, `slc-bp-v${version}`);
        writeFileSync(swPath, updated, 'utf-8');
      } catch {
        // Ignore if docs/sw.js is not present
      }
    },
  };
}

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react(), tailwindcss(), stampSwVersionPlugin(pkg.version)],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          exceljs: ['exceljs'],
        },
      },
    },
  },
});
