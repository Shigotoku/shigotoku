// Search Console の検索パフォーマンスを日次で取得して data/gsc/YYYY-MM-DD.ndjson に保存する。
// 使い方:
//   npm run fetch:gsc                         # 直近（3日前まで）から遡って7日分を更新
//   npm run fetch:gsc -- --days 480           # 初回: 約16か月分をまとめて保存（Search Consoleの保持上限）
//   npm run fetch:gsc -- --from 2026-10-01 --to 2026-10-20
// 注意: 最新2〜3日分は未確定のことがあるため、毎回直近を上書き取得する運用にする。
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv, requireEnv, authClient, ensureDir, ymd, daysAgo, parseArgs, sleep, ROOT, dataDir, reportDir } from './lib.mjs';

loadEnv();
const args = parseArgs();
const site = requireEnv('GSC_SITE_URL');
const OUT = ensureDir(dataDir('gsc'));
const ROW_LIMIT = 25000; // API の1リクエスト上限

const to = args.to ? new Date(args.to) : daysAgo(2);
const from = args.from ? new Date(args.from) : daysAgo(2 + Number(args.days ?? 7) - 1);

const client = await authClient(['https://www.googleapis.com/auth/webmasters.readonly']).getClient();
const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;

async function fetchDay(date) {
  const rows = [];
  for (let startRow = 0; ; startRow += ROW_LIMIT) {
    const res = await client.request({
      url: endpoint,
      method: 'POST',
      data: {
        startDate: date,
        endDate: date,
        dimensions: ['date', 'page', 'query', 'device'],
        rowLimit: ROW_LIMIT,
        startRow,
        dataState: 'final',
      },
    });
    const batch = res.data.rows ?? [];
    for (const r of batch) {
      const [d, page, query, device] = r.keys;
      rows.push({ date: d, page, query, device, clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position });
    }
    if (batch.length < ROW_LIMIT) break;
  }
  return rows;
}

// ページ別の合計(クエリ次元なし)。クエリ別の行は匿名化クエリが除外されるためクリックの大半が欠ける
// (メディトクで実測: クリックの約27%しか見えない)。ページ単位の正確な合計はこちらを使う。
const PAGE_OUT = ensureDir(dataDir('gsc-page'));
async function fetchPageDay(date) {
  const rows = [];
  for (let startRow = 0; ; startRow += ROW_LIMIT) {
    const res = await client.request({
      url: endpoint,
      method: 'POST',
      data: { startDate: date, endDate: date, dimensions: ['date', 'page'], rowLimit: ROW_LIMIT, startRow, dataState: 'final' },
    });
    const batch = res.data.rows ?? [];
    for (const r of batch) {
      const [d, page] = r.keys;
      rows.push({ date: d, page, clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position });
    }
    if (batch.length < ROW_LIMIT) break;
  }
  return rows;
}

let day = new Date(from);
let total = 0;
while (day <= to) {
  const date = ymd(day);
  try {
    const pageRows = await fetchPageDay(date);
    writeFileSync(join(PAGE_OUT, `${date}.ndjson`), pageRows.map((r) => JSON.stringify(r)).join('\n') + (pageRows.length ? '\n' : ''));
    const rows = await fetchDay(date);
    writeFileSync(join(OUT, `${date}.ndjson`), rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
    total += rows.length;
    console.log(`${date}: ${rows.length} 行`);
  } catch (e) {
    console.error(`${date}: エラー`, e?.response?.data?.error?.message ?? e.message);
    process.exitCode = 1;
  }
  day.setUTCDate(day.getUTCDate() + 1);
  await sleep(200); // クォータ配慮
}
console.log(`完了: ${ymd(from)} 〜 ${ymd(to)} / 合計 ${total} 行 → ${OUT}`);
