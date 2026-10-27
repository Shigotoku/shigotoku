// GA4 のコンバージョン系イベントを「チャネル × ランディングページ」別に日次取得し、
// data/<site>/ga4conv/YYYY-MM-DD.ndjson に保存する(流入元別の成果・ページ別CVR・フォーム離脱の分析用)。
// 使い方: npm run fetch:conv [-- --days 30] [-- --from 2026-10-01 --to 2026-10-20]
// 対象イベントは config/sites.json の conversionEvents(未指定は form_start / generate_lead / lead_submit)。
// 個人情報は取得しない(イベント件数のみ)。
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv, requireEnv, authClient, ensureDir, parseArgs, ymd, daysAgo, dataDir } from './lib.mjs';

loadEnv();
const args = parseArgs();
const propertyId = requireEnv('GA4_PROPERTY_ID');
const OUT = ensureDir(dataDir('ga4conv'));
const to = args.to ?? ymd(daysAgo(1));
const from = args.from ?? ymd(daysAgo(Number(args.days ?? 7)));
const configured = (process.env.SITE_CONVERSION_EVENTS || '').split(',').map((s) => s.trim()).filter(Boolean);
const events = [...new Set([...(configured.length ? configured : ['generate_lead', 'lead_submit']), process.env.SITE_FORM_START_EVENT || 'form_start'])];

const client = await authClient(['https://www.googleapis.com/auth/analytics.readonly']).getClient();
const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
const LIMIT = 100000;
const byDate = new Map();
for (let offset = 0; ; offset += LIMIT) {
  const res = await client.request({
    url,
    method: 'POST',
    data: {
      dateRanges: [{ startDate: from, endDate: to }],
      dimensions: [{ name: 'date' }, { name: 'sessionDefaultChannelGroup' }, { name: 'landingPage' }, { name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: events } } },
      limit: LIMIT,
      offset,
    },
  });
  const rows = res.data.rows ?? [];
  for (const r of rows) {
    const [d, channel, landingPage, eventName] = r.dimensionValues.map((x) => x.value);
    const date = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push({ date, channel, landingPage, eventName, count: Number(r.metricValues[0].value) });
  }
  if (rows.length < LIMIT) break;
}
for (const [date, rows] of byDate) writeFileSync(join(OUT, `${date}.ndjson`), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
const total = [...byDate.values()].reduce((a, r) => a + r.length, 0);
console.log(`完了: ${from} → ${to} / イベント ${events.join(',')} / ${byDate.size} 日分・${total} 行 → ${OUT}`);
