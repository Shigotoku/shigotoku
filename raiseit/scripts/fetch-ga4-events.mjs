// GA4 のイベント別件数を日次で取得し data/ga4ev/YYYY-MM-DD.ndjson に保存(計測漏れ診断用)。
// 使い方: npm run fetch:events [-- --days 30]
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv, requireEnv, authClient, ensureDir, parseArgs, ymd, daysAgo, ROOT, dataDir, reportDir } from './lib.mjs';

loadEnv();
const args = parseArgs();
const propertyId = requireEnv('GA4_PROPERTY_ID');
const OUT = ensureDir(dataDir('ga4ev'));
const to = args.to ?? ymd(daysAgo(1));
const from = args.from ?? ymd(daysAgo(Number(args.days ?? 7)));
const client = await authClient(['https://www.googleapis.com/auth/analytics.readonly']).getClient();
const res = await client.request({
  url: `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, method: 'POST',
  data: { dateRanges: [{ startDate: from, endDate: to }], dimensions: [{ name: 'date' }, { name: 'eventName' }], metrics: [{ name: 'eventCount' }], limit: 100000 },
});
const byDate = new Map();
for (const r of res.data.rows ?? []) {
  const [d, eventName] = r.dimensionValues.map((x) => x.value);
  const date = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  if (!byDate.has(date)) byDate.set(date, []);
  byDate.get(date).push({ date, eventName, count: Number(r.metricValues[0].value) });
}
for (const [date, rows] of byDate) writeFileSync(join(OUT, `${date}.ndjson`), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log(`完了: ${from} 〜 ${to} / ${byDate.size} 日分 → ${OUT}`);
