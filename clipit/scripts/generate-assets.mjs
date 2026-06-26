import { createRequire } from 'node:module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(scriptDir, '..', '..');
const require = createRequire(path.join(root, 'clipit/api/package.json'));
const sharp = require('sharp');
const svg = fs.readFileSync(path.join(root, 'clipit/app/public/favicon.svg'));

for (const d of [
  'clipit/app/public/icon.png',
  'clipit/landing-page/public/icon.png',
  'clipit/extension/icon.png',
]) {
  const p = path.join(root, d);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  await sharp(svg).resize(512, 512).png().toFile(p);
  console.log('created', d);
}

// hero-bg.png は 1 枚写真（clipit/landing-page/scripts/generate-collages.mjs）で生成する
