// Cloud Run Job 用の日次実行。既存の fetch / report スクリプトはそのまま使い、
// 保存先だけ GCS に載せ替える(下記の同期方式)。
//
//   1. Firestore の raiseit_organizations/{TENANT_ID}/sites から対象サイトを読む
//      (無ければ config/sites.json)
//   2. gs://<bucket>/tenants/<tenant>/<site>/data|reports → /tmp にダウンロード
//   3. 既存スクリプトを DATA_ROOT / REPORT_ROOT 付きで実行
//   4. 今回更新したファイルだけ GCS へアップロード、実行結果を Firestore に記録
//
// 環境変数: TENANT_ID(既定 meditoku) / GCS_BUCKET(必須) / GOOGLE_CLOUD_PROJECT
//          JOB_DAYS(既定 7) / JOB_SKIP_FIRESTORE=1(ローカル検証用)
// ローカル検証: node scripts/cloud/run-job.mjs --dry-run  (同期と実行をせず対象だけ表示)
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { ROOT, readSites } from '../lib.mjs';

const dryRun = process.argv.includes('--dry-run');
const tenant = process.env.TENANT_ID || 'meditoku';
const bucketName = process.env.GCS_BUCKET;
const days = String(process.env.JOB_DAYS || 7);
const useFirestore = process.env.JOB_SKIP_FIRESTORE !== '1';
const startedAt = Date.now();

if (!bucketName && !dryRun) {
  console.error('GCS_BUCKET が未設定です');
  process.exit(1);
}

initializeApp({ storageBucket: bucketName });
const db = useFirestore ? getFirestore() : null;
const bucket = bucketName ? getStorage().bucket() : null;

async function loadSites() {
  if (db) {
    const snap = await db.collection(`raiseit_organizations/${tenant}/sites`).get();
    const sites = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((s) => s.active !== false);
    if (sites.length) return sites;
  }
  return readSites();
}

async function download(prefix, dest) {
  const [files] = await bucket.getFiles({ prefix });
  for (const f of files) {
    if (f.name.endsWith('/')) continue;
    const local = join(dest, f.name.slice(prefix.length));
    mkdirSync(join(local, '..'), { recursive: true });
    await f.download({ destination: local });
  }
  return files.length;
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

async function upload(localDir, prefix, since) {
  let n = 0;
  for (const file of walk(localDir)) {
    if (statSync(file).mtimeMs < since) continue;
    const rel = relative(localDir, file).split(sep).join('/');
    await bucket.upload(file, { destination: `${prefix}${rel}` });
    n++;
  }
  return n;
}

function run(script, site, extra = []) {
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts', script), '--site', site.id, ...extra], {
    stdio: 'inherit',
    env: process.env,
  });
  return r.status === 0;
}

function steps(site) {
  const list = [['fetch-search-console.mjs', ['--days', days]]];
  if (site.ga4PropertyId) {
    list.push(
      ['fetch-ga4.mjs', ['--days', days]],
      ['fetch-ga4-sources.mjs', ['--days', days]],
      ['fetch-ga4-events.mjs', ['--days', days]],
      ['fetch-ga4-conversions.mjs', ['--days', days]],
    );
  }
  if (new Date().getUTCDay() === 1 && process.env.PSI_API_KEY) list.push(['fetch-psi.mjs', []]);
  list.push(['analyze.mjs', []]);
  list.push(['engine/build-summary.mjs', []]);
  return list.filter(([s]) => !(s === 'fetch-search-console.mjs' && !site.gscSite));
}

const sites = await loadSites();
console.log(`tenant=${tenant} sites=${sites.map((s) => s.id).join(',') || '(なし)'}`);
if (dryRun) {
  for (const s of sites) console.log(s.id, steps(s).map(([x]) => x).join(' → '));
  process.exit(0);
}

const work = join(tmpdir(), `aw-${Date.now()}`);
const sitesFile = join(work, 'sites.json');
mkdirSync(work, { recursive: true });
writeFileSync(sitesFile, JSON.stringify({ sites }));
process.env.SITES_FILE = sitesFile;
process.env.DATA_ROOT = join(work, 'data');
process.env.REPORT_ROOT = join(work, 'reports');

let failed = 0;
for (const site of sites) {
  const base = `tenants/${tenant}/${site.id}`;
  const siteStart = Date.now();
  const results = {};
  console.log(`=== ${site.id} ===`);
  await download(`${base}/data/`, join(process.env.DATA_ROOT, site.id));
  for (const [script, extra] of steps(site)) {
    const ok = run(script, site, extra);
    results[script] = ok;
    if (!ok) failed++;
  }
  const up =
    (await upload(join(process.env.DATA_ROOT, site.id), `${base}/data/`, siteStart)) +
    (await upload(join(process.env.REPORT_ROOT, site.id), `${base}/reports/`, siteStart));
  console.log(`${site.id}: アップロード ${up} 件`);
  if (db) {
    await db.doc(`raiseit_organizations/${tenant}/runs/${new Date().toISOString().slice(0, 10)}_${site.id}`).set({
      tenantId: tenant,
      siteId: site.id,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      results,
      ok: Object.values(results).every(Boolean),
    });
  }
}
process.exit(failed ? 1 : 0);
