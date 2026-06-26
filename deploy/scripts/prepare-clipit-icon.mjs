/**
 * clipit/extension/public/icon.png の四隅などの黒背景を透過にし、各配置先へコピーする。
 * 角からつながる黒のみ透明化（アイコン内の濃い色は残す）。
 */
import { createRequire } from 'node:module';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = join(scriptDir, '../..');
const src = join(root, 'clipit', 'extension', 'public', 'icon.png');

const require = createRequire(join(root, 'clipit/api/package.json'));
const sharp = require('sharp');

const BLACK_THRESHOLD = 55;

function isBlack(r, g, b) {
  return r <= BLACK_THRESHOLD && g <= BLACK_THRESHOLD && b <= BLACK_THRESHOLD;
}

function floodClearBlackCorners(data, width, height) {
  const visited = new Uint8Array(width * height);
  const queue = [0, width - 1, (height - 1) * width, height * width - 1];

  while (queue.length > 0) {
    const idx = queue.pop();
    if (idx === undefined || visited[idx]) continue;
    const o = idx * 4;
    if (!isBlack(data[o], data[o + 1], data[o + 2])) continue;

    visited[idx] = 1;
    data[o + 3] = 0;

    const x = idx % width;
    const y = (idx / width) | 0;
    if (x > 0) queue.push(idx - 1);
    if (x < width - 1) queue.push(idx + 1);
    if (y > 0) queue.push(idx - width);
    if (y < height - 1) queue.push(idx + width);
  }
}

async function stripBlackBackground(inputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  floodClearBlackCorners(data, info.width, info.height);

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png();
}

const outputs = [
  join(root, 'corporate-site/public/clipit-icon.png'),
  join(root, 'clipit/app/public/icon.png'),
  join(root, 'clipit/landing-page/public/icon.png'),
].filter((p) => existsSync(dirname(p)));

if (!existsSync(src)) {
  console.error('Source icon not found:', src);
  process.exit(1);
}

const buffer = await (await stripBlackBackground(src)).toBuffer();
const tempPath = join(root, 'deploy', '.cache', 'clipit-icon-transparent.png');
mkdirSync(dirname(tempPath), { recursive: true });
await sharp(buffer).toFile(tempPath);

let ok = 0;
for (const dest of outputs) {
  mkdirSync(dirname(dest), { recursive: true });
  try {
    copyFileSync(tempPath, dest);
    ok += 1;
    console.log('✓', dest.replace(root + '\\', '').replace(root + '/', ''));
  } catch (err) {
    console.warn('⚠ skip (close the file in IDE?):', dest);
  }
}

if (ok === 0) {
  console.error('No icon files were written.');
  process.exit(1);
}

console.log('Done: corner black removed (transparent PNG).');
