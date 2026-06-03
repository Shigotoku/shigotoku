import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { cpSync } from 'node:fs';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background.ts'),
        content: resolve(__dirname, 'src/content.ts'),
        recorder: resolve(__dirname, 'src/recorder.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        format: 'es',
      },
    },
  },
  plugins: [
    {
      name: 'copy-manifest',
      closeBundle() {
        cpSync(resolve(__dirname, 'manifest.json'), resolve(__dirname, 'dist/manifest.json'));
        cpSync(resolve(__dirname, 'popup.html'), resolve(__dirname, 'dist/popup.html'));
      },
    },
  ],
});
