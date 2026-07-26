/**
 * web-assets/（単一の画像ソース）を各サイトの public/ へ同期する。
 * 用法: node deploy/scripts/sync-web-assets.mjs
 */
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = join(scriptDir, '../..');
const assetsRoot = join(root, 'web-assets');

function copyTree(src, dest) {
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(src)) {
    const from = join(src, name);
    const to = join(dest, name);
    if (statSync(from).isDirectory()) {
      copyTree(from, to);
    } else {
      mkdirSync(dirname(to), { recursive: true });
      cpSync(from, to);
    }
  }
}

function copyFile(src, dest) {
  if (!existsSync(src)) return;
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest);
}

const jobs = [
  {
    label: 'corporate-site brand',
    run: () => copyTree(join(assetsRoot, 'corporate/brand'), join(root, 'corporate-site/public/images/brand')),
  },
  {
    label: 'corporate-site site',
    run: () => copyTree(join(assetsRoot, 'corporate/site'), join(root, 'corporate-site/public/images/site')),
  },
  {
    label: 'corporate-site products',
    run: () => copyTree(join(assetsRoot, 'corporate/products'), join(root, 'corporate-site/public/images/products')),
  },
  {
    label: 'corporate-site clipit-icon (legacy root path)',
    run: () =>
      copyFile(
        join(assetsRoot, 'corporate/products/clipit-icon.png'),
        join(root, 'corporate-site/public/clipit-icon.png'),
      ),
  },
  {
    label: 'runwith landing-page',
    run: () => copyTree(join(assetsRoot, 'landing-pages/runwith'), join(root, 'runwith/landing-page/public')),
  },
  {
    label: 'runwith icon from corporate products',
    run: () =>
      copyFile(
        join(assetsRoot, 'corporate/products/runwith-logo.png'),
        join(root, 'runwith/landing-page/public/icon.png'),
      ),
  },
  {
    label: 'buzzit landing-page',
    run: () => copyTree(join(assetsRoot, 'landing-pages/buzzit'), join(root, 'buzzit/landing-page/public')),
  },
  {
    label: 'clipit landing-page',
    run: () => copyTree(join(assetsRoot, 'landing-pages/clipit'), join(root, 'clipit/landing-page/public')),
  },
  {
    label: 'clipit icon from corporate products',
    run: () =>
      copyFile(
        join(assetsRoot, 'corporate/products/clipit-icon.png'),
        join(root, 'clipit/landing-page/public/icon.png'),
      ),
  },
];

for (const job of jobs) {
  job.run();
  console.log(`✓ ${job.label}`);
}

console.log('Done: web-assets synced to project public folders.');
