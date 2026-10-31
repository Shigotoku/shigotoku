// GEO カードのチャット画像を書き出す。使い方: node design/render-geo-chat.mjs
// Edge か Chrome(ヘッドレス)で design/geo-chat.html を撮影し、sharp で webp にする。
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = pathToFileURL(join(root, 'design', 'geo-chat.html')).href;
const candidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];
const browser = candidates.find(existsSync);
if (!browser) throw new Error('Edge / Chrome が見つかりません');

const variants = [
  { name: 'portrait', w: 1000, h: 1060 },
  { name: 'landscape', w: 1250, h: 940 },
];
const tmp = mkdtempSync(join(tmpdir(), 'geo-chat-'));
for (const v of variants) {
  const png = join(tmp, `${v.name}.png`);
  execFileSync(browser, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${v.w},${v.h}`, `--screenshot=${png}`, `${html}#${v.name}`,
  ], { stdio: 'ignore' });
  const out = join(root, 'public', 'images', `geo-chat-${v.name}.webp`);
  const info = await sharp(png).webp({ quality: 88 }).toFile(out);
  console.log(`${v.name}: ${info.width}x${info.height} ${Math.round(info.size / 1024)}KB`);
}
rmSync(tmp, { recursive: true, force: true });
