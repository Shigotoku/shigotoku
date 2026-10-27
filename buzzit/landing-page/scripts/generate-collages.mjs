/**
 * BuzzIt LP 用コラージュ画像を生成する。
 * モノクロ主体 + 日常カラーアクセント、四角写真をランダム余白で配置。
 *
 * Usage: node scripts/generate-collages.mjs
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../../../web-assets/landing-pages/buzzit/images');
const STRIP_DIR = path.join(OUT_DIR, 'strip');

const BG = { r: 245, g: 244, b: 240 };

/** Unsplash ソース（404 のものは差し替え済み） */
const SOURCES = {
  salon: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=85',
  cafe: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=85',
  beauty: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=85',
  spa: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=85',
  restaurant: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=85',
  workspace: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=85',
  flowers: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1200&q=85',
  retail: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=85',
  team: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=85',
  coffee: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=85',
  lifestyle: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=85',
  plant: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=1200&q=85',
};

const cache = new Map();

async function fetchSource(key, url) {
  if (cache.has(key)) return cache.get(key);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${key}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  cache.set(key, buf);
  return buf;
}

async function squareTile(sourceKey, size, { color = false, contrast = 1.02, saturation = 0.92 } = {}) {
  const buf = await fetchSource(sourceKey, SOURCES[sourceKey]);
  let img = sharp(buf).resize(size, size, { fit: 'cover', position: 'centre' });

  if (color) {
    img = img.modulate({ saturation, brightness: 1.02 }).linear(contrast);
  } else {
    img = img.grayscale().modulate({ brightness: 1.03 }).linear(contrast);
  }

  return img.png().toBuffer();
}

async function buildHeroCollage() {
  const width = 2400;
  const height = 1600;

  /** 全幅背景向け — 左〜右までランダム風余白で散らす */
  const placements = [
    { key: 'salon', size: 440, x: 40, y: 56, color: false },
    { key: 'cafe', size: 280, x: 520, y: 32, color: true },
    { key: 'beauty', size: 240, x: 840, y: 88, color: true },
    { key: 'spa', size: 320, x: 1120, y: 48, color: false },
    { key: 'flowers', size: 260, x: 1480, y: 72, color: true },
    { key: 'restaurant', size: 380, x: 1780, y: 40, color: false },
    { key: 'workspace', size: 220, x: 64, y: 540, color: false },
    { key: 'coffee', size: 260, x: 320, y: 620, color: true },
    { key: 'retail', size: 300, x: 620, y: 480, color: false },
    { key: 'team', size: 340, x: 960, y: 560, color: false },
    { key: 'lifestyle', size: 280, x: 1340, y: 520, color: true },
    { key: 'plant', size: 240, x: 1660, y: 640, color: true },
    { key: 'cafe', size: 200, x: 1960, y: 480, color: false },
    { key: 'spa', size: 260, x: 420, y: 920, color: false },
    { key: 'salon', size: 300, x: 720, y: 1040, color: false },
    { key: 'flowers', size: 220, x: 1060, y: 980, color: true },
    { key: 'restaurant', size: 320, x: 1320, y: 1080, color: false },
    { key: 'beauty', size: 260, x: 1680, y: 960, color: false },
    { key: 'coffee', size: 200, x: 1980, y: 1120, color: true },
  ];

  const composites = await Promise.all(
    placements.map(async (p) => ({
      input: await squareTile(p.key, p.size, { color: p.color }),
      left: p.x,
      top: p.y,
    })),
  );

  const out = path.join(OUT_DIR, 'hero-collage.webp');
  await sharp({
    create: { width, height, channels: 3, background: BG },
  })
    .composite(composites)
    .webp({ quality: 84, effort: 6 })
    .toFile(out);

  console.log(`✓ ${out}`);
}

/** ストリップ用タイル — 余白なし（写真を隙間なく並べる） */
const STRIP_TILES = [
  { key: 'salon', color: false },
  { key: 'cafe', color: true },
  { key: 'spa', color: false },
  { key: 'restaurant', color: false },
  { key: 'workspace', color: false },
  { key: 'flowers', color: true },
  { key: 'retail', color: false },
  { key: 'team', color: false },
];

async function buildStripTile(index, tile) {
  const tileW = 720;
  const tileH = 560;
  const buf = await fetchSource(tile.key, SOURCES[tile.key]);
  let img = sharp(buf).resize(tileW, tileH, { fit: 'cover', position: 'centre' });

  if (tile.color) {
    img = img.modulate({ saturation: 0.92, brightness: 1.02 }).linear(1.02);
  } else {
    img = img.grayscale().modulate({ brightness: 1.03 }).linear(1.02);
  }

  const out = path.join(STRIP_DIR, `strip-${String(index + 1).padStart(2, '0')}.webp`);
  await img.webp({ quality: 82, effort: 6 }).toFile(out);

  console.log(`✓ ${out}`);
}

async function main() {
  await mkdir(STRIP_DIR, { recursive: true });
  await buildHeroCollage();
  for (let i = 0; i < STRIP_TILES.length; i++) {
    await buildStripTile(i, STRIP_TILES[i]);
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
