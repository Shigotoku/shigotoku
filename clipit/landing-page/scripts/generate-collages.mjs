/**
 * ClipIt LP ヒーロー背景（1枚の写真）を生成する。
 *
 * Usage: node scripts/generate-collages.mjs
 * （sharp は clipit/api の node_modules を利用）
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..', '..');
const require = createRequire(path.join(root, 'clipit/api/package.json'));
const sharp = require('sharp');
const OUT_DIR = path.join(__dirname, '../public');

/** 研修・オフィスでの説明シーン（1枚写真） */
const HERO_SOURCE =
  'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=2400&h=960&q=85';

async function buildHeroPhoto() {
  const width = 2400;
  const height = 960;

  const res = await fetch(HERO_SOURCE);
  if (!res.ok) throw new Error(`Failed to fetch hero photo: ${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());
  const out = path.join(OUT_DIR, 'hero-bg.png');

  await sharp(buf)
    .resize(width, height, { fit: 'cover', position: 'center' })
    .modulate({ brightness: 1.04, saturation: 0.9 })
    .linear(1.02)
    .png({ compressionLevel: 9 })
    .toFile(out);

  console.log(`✓ ${out}`);
}

buildHeroPhoto().catch((err) => {
  console.error(err);
  process.exit(1);
});
