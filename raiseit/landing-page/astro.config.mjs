// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://shigotoku.com',
  // shigotoku.com/raiseit/ に配置する(他アプリの LP と同じ)
  base: '/raiseit/',
  vite: {
    plugins: [tailwindcss()],
  },
});
