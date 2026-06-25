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

const w = 1920;
const h = 800;
const heroSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#fff9f5"/><stop offset="50%" stop-color="#ffedd5"/><stop offset="100%" stop-color="#fff7ed"/>
  </linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <circle cx="1600" cy="200" r="280" fill="#fed7aa" opacity="0.35"/>
  <circle cx="300" cy="600" r="220" fill="#fdba74" opacity="0.25"/>
</svg>`;
await sharp(Buffer.from(heroSvg)).png().toFile(path.join(root, 'clipit/landing-page/public/hero-bg.png'));
console.log('created hero-bg.png');
