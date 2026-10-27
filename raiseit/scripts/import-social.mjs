// SNS(X / Instagram / YouTube 等)の数値を取り込む。
// data/social-import/*.csv を読み、data/social/YYYY-MM-DD.ndjson に正規化して保存する。
// CSV 列(ヘッダー必須): platform,date,impressions,views,clicks,likes,followers,note
//   platform: x | instagram | youtube | その他任意
//   各プラットフォームの管理画面(アナリティクス)のエクスポートを、この形に整えて置けばよい。
// API 自動取得は platform ごとにアダプタを追加する(要: 各社のアカウント連携)。
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ensureDir, dataDir, loadEnv } from './lib.mjs';

loadEnv();

const IN = ensureDir(dataDir('social-import'));
const OUT = ensureDir(dataDir('social'));
const files = readdirSync(IN).filter((f) => f.endsWith('.csv'));
if (!files.length) { console.log(`取り込むCSVがありません: ${IN}\n列: platform,date,impressions,views,clicks,likes,followers,note`); process.exit(0); }

const num = (v) => (v === undefined || v === '' ? 0 : Number(String(v).replace(/,/g, '')) || 0);
const byDate = new Map();
for (const f of files) {
  const lines = readFileSync(join(IN, f), 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const head = lines.shift().split(',').map((h) => h.trim());
  for (const line of lines) {
    const c = line.split(',');
    const o = Object.fromEntries(head.map((h, i) => [h, (c[i] ?? '').trim()]));
    const date = (o.date || '').replace(/\//g, '-').slice(0, 10);
    if (!o.platform || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const row = { date, platform: o.platform.toLowerCase(), impressions: num(o.impressions), views: num(o.views), clicks: num(o.clicks), likes: num(o.likes), followers: num(o.followers), note: o.note || '' };
    if (!byDate.has(date)) byDate.set(date, new Map());
    byDate.get(date).set(row.platform, row); // 同日同platformは後勝ち(再取込で上書き)
  }
}
for (const [date, m] of byDate) writeFileSync(join(OUT, `${date}.ndjson`), [...m.values()].map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log(`取り込み完了: ${byDate.size} 日分 → ${OUT}`);
