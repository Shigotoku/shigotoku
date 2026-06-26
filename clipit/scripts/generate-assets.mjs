import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(scriptDir, '..', '..');
const src = path.join(root, 'clipit/extension/public/icon.png');

if (!fs.existsSync(src)) {
  console.error('Source icon not found:', src);
  process.exit(1);
}

for (const d of [
  'clipit/app/public/icon.png',
  'clipit/landing-page/public/icon.png',
  'corporate-site/public/clipit-icon.png',
]) {
  const p = path.join(root, d);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.copyFileSync(src, p);
  console.log('copied ->', d);
}

// hero-bg.png は 1 枚写真（clipit/landing-page/scripts/generate-collages.mjs）で生成する
