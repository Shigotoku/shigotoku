/**
 * clipit LP の dist を緊急修復（アイコン巨大化・黒背景）
 */
import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const deployDir = join(scriptDir, '..');
const root = join(deployDir, '..');
const lpOut = join(deployDir, 'dist', 'web', 'clipit');
const iconSrc = join(root, 'corporate-site', 'public', 'clipit-icon.png');
const iconDest = join(lpOut, 'icon.png');
const ICON_URL = '/clipit/icon.png?v=4';

const ICON_CSS = `
.clipit-brand-icon{border-radius:22%;background:#fff9f5}
.clipit-icon-frame{display:inline-flex;flex-shrink:0;align-items:center;justify-content:center;border-radius:22%;background:#fff9f5;padding:.25rem;box-shadow:0 4px 14px rgba(249,115,22,.15);overflow:hidden}
.clipit-icon-frame--header{width:2.25rem;height:2.25rem}
.clipit-icon-frame--footer{width:2.5rem;height:2.5rem}
.clipit-icon-frame--badge{width:2rem;height:2rem}
.clipit-icon-frame--hero{width:6.5rem;height:6.5rem}
@media(min-width:40rem){.clipit-icon-frame--hero{width:8rem;height:8rem}}
@media(min-width:64rem){.clipit-icon-frame--hero{width:9rem;height:9rem}}
.clipit-icon-frame img,.clipit-brand-icon{width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain}
.clipit-compare-table{display:none}
.clipit-compare-cards{display:block}
@media(min-width:768px){.clipit-compare-table{display:block}.clipit-compare-cards{display:none}}
`;

const HEADER_FRAME =
  '<span class="clipit-icon-frame clipit-icon-frame--header"><img src="' +
  ICON_URL +
  '" alt="クリッピット" class="clipit-brand-icon" width="36" height="36"></span>';

if (!existsSync(lpOut)) {
  console.error('clipit LP dist not found:', lpOut);
  process.exit(1);
}
if (!existsSync(iconSrc)) {
  console.error('transparent icon not found:', iconSrc);
  process.exit(1);
}

copyFileSync(iconSrc, iconDest);
console.log('✓', iconDest);

function patchHtml(file) {
  let html = readFileSync(file, 'utf8');

  // 巨大化の原因: h-9 / h-full 等が CSS に無い → 固定フレームに差し替え
  html = html.replace(
    /<span class="clipit-icon-frame[^"]*">[\s\S]*?<\/span>\s*(?=<span class="text-base font-bold)/,
    HEADER_FRAME + ' ',
  );
  html = html.replace(
    /<img src="\/clipit\/icon\.png[^"]*" alt="クリッピット" class="[^"]*">/g,
    `<img src="${ICON_URL}" alt="クリッピット" class="clipit-brand-icon" width="36" height="36" style="width:36px;height:36px;object-fit:contain">`,
  );

  // ヒーロー直上の巨大アイコン塊を削除（mock だけ残す）
  html = html.replace(
    /<div class="mb-6 flex flex-col items-center">[\s\S]*?<\/div>\s*(?=<div class="clipit-hero-mock)/,
    '',
  );

  html = html.replaceAll(/\/clipit\/icon\.png(\?v=\d+)?/g, ICON_URL);
  html = html.replaceAll('/clipit/icon.png?v=4?v=4', ICON_URL);

  writeFileSync(file, html);
  console.log('✓ patched', file);
}

const htmlTargets = ['index.html', 'pricing/index.html'];
let patchedAny = false;
for (const name of htmlTargets) {
  const file = join(lpOut, name);
  if (existsSync(file)) {
    patchHtml(file);
    patchedAny = true;
  }
}
if (!patchedAny) {
  console.error('clipit LP index.html not found — build clipit-landing before deploy');
  process.exit(1);
}

const astroDir = join(lpOut, '_astro');
if (existsSync(astroDir)) {
  for (const css of readdirSync(astroDir).filter((f) => f.endsWith('.css'))) {
    const cssPath = join(astroDir, css);
    let cssText = readFileSync(cssPath, 'utf8');
    cssText = cssText.replace(/\n\.clipit-brand-icon[\s\S]*$/m, '');
    writeFileSync(cssPath, cssText + ICON_CSS);
    console.log('✓ css', cssPath);
  }
}

console.log('Done patch-clipit-lp-dist');
