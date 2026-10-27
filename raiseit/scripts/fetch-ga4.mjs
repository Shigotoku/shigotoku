// GA4 の閲覧数などを日次で取得して data/ga4/YYYY-MM-DD.ndjson に保存する。
// 使い方: npm run fetch:ga4 [-- --days 30] [-- --from 2026-10-01 --to 2026-10-20]
// 個人情報は取得しない（ページ単位の集計のみ）。
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv, requireEnv, authClient, ensureDir, parseArgs, ymd, daysAgo, ROOT, dataDir, reportDir } from './lib.mjs';

loadEnv();
const args = parseArgs();
const propertyId = requireEnv('GA4_PROPERTY_ID');
const OUT = ensureDir(dataDir('ga4'));

const to = args.to ?? ymd(daysAgo(1));
const from = args.from ?? ymd(daysAgo(Number(args.days ?? 7)));

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
      dimensions: [{ name: 'date' }, { name: 'pagePath' }, { name: 'sessionDefaultChannelGroup' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'sessions' },
        { name: 'engagedSessions' },
        { name: 'userEngagementDuration' },
      ],
      limit: LIMIT,
      offset,
    },
  });
  const rows = res.data.rows ?? [];
  for (const r of rows) {
    const [d, pagePath, channel] = r.dimensionValues.map((x) => x.value);
    const date = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
    const [views, sessions, engaged, duration] = r.metricValues.map((x) => Number(x.value));
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push({ date, pagePath, channel, views, sessions, engagedSessions: engaged, engagementSeconds: duration });
  }
  if (rows.length < LIMIT) break;
}

for (const [date, rows] of byDate) {
  writeFileSync(join(OUT, `${date}.ndjson`), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
}
const total = [...byDate.values()].reduce((a, r) => a + r.length, 0);
console.log(`完了: ${from} 〜 ${to} / ${byDate.size} 日分・${total} 行 → ${OUT}`);
