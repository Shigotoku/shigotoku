// 実施した施策を記録する(効果測定の起点)。レポートの「施策の効果」欄で、実施前後を比較する。
// 使い方: npm run action:add -- --url https://example.com/blog/x/ --note "titleを変更" [--date 2026-10-25] [--site tokunaga]
//   --url は対象ページ(サイト全体の施策は省略可)。記録は data/<site>/actions/YYYY-MM-DD.ndjson に追記される。
import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv, parseArgs, ensureDir, dataDir, ymd } from './lib.mjs';

loadEnv();
const a = parseArgs();
if (!a.note || a.note === true) {
  console.error('--note "実施内容" を指定してください');
  process.exit(2);
}
const date = typeof a.date === 'string' ? a.date : ymd(new Date());
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error('--date は YYYY-MM-DD 形式で指定してください');
  process.exit(2);
}
const row = { date, url: typeof a.url === 'string' ? a.url : '', note: String(a.note), recordedAt: new Date().toISOString() };
appendFileSync(join(ensureDir(dataDir('actions')), `${date}.ndjson`), JSON.stringify(row) + '\n');
console.log(`記録しました: ${date} ${row.url || '(サイト全体)'} / ${row.note}`);
