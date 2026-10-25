// 取得済みデータから summary.json(管理画面の正本)を生成する。
// 使い方: npm run summary -- --site meditoku        → reports/<site>/summary.json
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv, readSites, dataDir, reportDir, ensureDir, ymd } from '../lib.mjs';
import { buildSummary } from './insights.mjs';

loadEnv();

function readDir(sub) {
  const d = dataDir(sub);
  let files = [];
  try {
    files = readdirSync(d).filter((f) => f.endsWith('.ndjson')).sort();
  } catch {
    return [];
  }
  const rows = [];
  for (const f of files) for (const line of readFileSync(join(d, f), 'utf8').split('\n')) if (line.trim()) rows.push(JSON.parse(line));
  return rows;
}

const id = process.env.SITE_ID;
const site = readSites().find((s) => s.id === id) ?? { id, name: process.env.SITE_NAME || id, industry: process.env.SITE_INDUSTRY || '' };
const summary = buildSummary({
  site,
  today: ymd(new Date()),
  gscPage: readDir('gsc-page'),
  gscQuery: readDir('gsc'),
  ga4src: readDir('ga4src'),
  ga4ev: readDir('ga4ev'),
  ga4conv: readDir('ga4conv'),
  psi: readDir('psi'),
  actions: readDir('actions'),
});
const out = ensureDir(reportDir());
writeFileSync(join(out, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(`summary.json: 成果 ${summary.northStar.cur}件(前期間 ${summary.northStar.prev}) / アクション ${summary.actions.length}件 / 今週 ${summary.thisWeek.join(', ') || '-'} → ${out}`);
