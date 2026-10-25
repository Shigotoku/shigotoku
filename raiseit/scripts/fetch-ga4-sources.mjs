// GA4 の流入元(source/medium/チャネル/ランディングページ)を日次で取得し data/ga4src/YYYY-MM-DD.ndjson に保存。
// 使い方: npm run fetch:src [-- --days 90]
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv, requireEnv, authClient, ensureDir, parseArgs, ymd, daysAgo, ROOT, dataDir, reportDir } from './lib.mjs';

loadEnv();
const args = parseArgs();
const propertyId = requireEnv('GA4_PROPERTY_ID');
const OUT = ensureDir(dataDir('ga4src'));
const to = args.to ?? ymd(daysAgo(1));
const from = args.from ?? ymd(daysAgo(Number(args.days ?? 7)));

const client = await authClient(['https://www.googleapis.com/auth/analytics.readonly']).getClient();
const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
const LIMIT = 100000;
const byDate = new Map();
for (let offset = 0; ; offset += LIMIT) {
  const res = await client.request({
    url, method: 'POST',
    data: {
      dateRanges: [{ startDate: from, endDate: to }],
      dimensions: [{ name: 'date' }, { name: 'sessionSource' }, { name: 'sessionMedium' }, { name: 'sessionDefaultChannelGroup' }, { name: 'landingPage' }],
      metrics: [{ name: 'sessions' }, { name: 'engagedSessions' }, { name: 'keyEvents' }],
      limit: LIMIT, offset,
    },
  });
  const rows = res.data.rows ?? [];
  for (const r of rows) {
    const [d, source, medium, channel, landingPage] = r.dimensionValues.map((x) => x.value);
    const date = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
    const [sessions, engagedSessions, keyEvents] = r.metricValues.map((x) => Number(x.value));
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push({ date, source, medium, channel, landingPage, sessions, engagedSessions, keyEvents });
  }
  if (rows.length < LIMIT) break;
}
for (const [date, rows] of byDate) writeFileSync(join(OUT, `${date}.ndjson`), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log(`完了: ${from} 〜 ${to} / ${byDate.size} 日分 → ${OUT}`);
