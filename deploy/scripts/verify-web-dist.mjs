/**
 * shigotoku-web デプロイ前に LP が揃っているか確認する。
 * Firebase Hosting はアップロード対象以外を削除するため、欠けていると 404 になる。
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const deployDir = dirname(fileURLToPath(import.meta.url));
const webOut = join(deployDir, '..', 'dist', 'web');

const required = [
  'index.html',
  'runwith/index.html',
  'buzzit/index.html',
  'clipit/index.html',
  'sitemap.xml',
  'robots.txt',
];

const missing = required.filter((rel) => !existsSync(join(webOut, rel)));

if (missing.length > 0) {
  console.error('shigotoku-web deploy blocked: dist/web is incomplete.');
  for (const rel of missing) console.error(`  missing: dist/web/${rel}`);
  process.exit(1);
}

console.log('✓ dist/web ready for shigotoku-web deploy');
