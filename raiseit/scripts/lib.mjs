// 共通: .env 読み込み・認証・日付ユーティリティ（依存は google-auth-library のみ）
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleAuth } from 'google-auth-library';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function loadEnv() {
  const p = join(ROOT, '.env');
  if (existsSync(p)) {
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
      }
    }
  }
  applySite();
}

/**
 * 複数サイト対応。config/sites.json (例: config/sites.example.json) に対象サイトを列挙する。
 * 使い方: 各スクリプトに --site <id> を付ける。省略時は先頭のサイト。
 * sites.json が無い場合は .env の GSC_SITE_URL / GA4_PROPERTY_ID を単一サイト('default')として扱う。
 * データは data/<siteId>/ 、レポートは reports/<siteId>/ に分けて保存される。
 */
export function readSites() {
  // クラウド実行時は SITES_FILE(Firestore から書き出した一時ファイル)を優先する
  const p = process.env.SITES_FILE || join(ROOT, 'config', 'sites.json');
  if (!existsSync(p)) return [];
  return JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, '')).sites ?? [];
}

export function applySite() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--site');
  const wanted = i >= 0 ? argv[i + 1] : process.env.SITE_ID;
  const sites = readSites();
  if (sites.length) {
    const s = wanted ? sites.find((x) => x.id === wanted) : sites[0];
    if (!s) {
      console.error(`サイト '${wanted}' が config/sites.json にありません。候補: ${sites.map((x) => x.id).join(', ')}`);
      process.exit(1);
    }
    process.env.SITE_ID = s.id;
    process.env.SITE_NAME = s.name ?? s.id;
    process.env.GSC_SITE_URL = s.gscSite;
    if (s.ga4PropertyId) process.env.GA4_PROPERTY_ID = String(s.ga4PropertyId);
    else delete process.env.GA4_PROPERTY_ID;
    process.env.SITE_INDUSTRY = s.industry ?? '';
  } else {
    process.env.SITE_ID ||= 'default';
    process.env.SITE_NAME ||= process.env.SITE_ID;
  }
}

/** 現在のサイトのデータ保存先: data/<siteId>/<sub> */
// クラウド実行時は DATA_ROOT / REPORT_ROOT(一時領域)に切り替える。GCS との同期は scripts/cloud/run-job.mjs が行う。
export function dataDir(sub) {
  return join(process.env.DATA_ROOT || join(ROOT, 'data'), process.env.SITE_ID || 'default', sub);
}
export function reportDir() {
  return join(process.env.REPORT_ROOT || join(ROOT, 'reports'), process.env.SITE_ID || 'default');
}

export function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`環境変数 ${name} が未設定です（.env を確認してください）`);
    process.exit(1);
  }
  return v;
}

/**
 * 認証クライアントを返す。
 * - 既定（推奨）: 鍵ファイルなし。`gcloud auth application-default login --impersonate-service-account=...`
 *   で作った Application Default Credentials を使う（組織ポリシーで鍵作成が禁止でも動く）。
 * - 鍵ファイルを使える環境のみ: GOOGLE_APPLICATION_CREDENTIALS にパスを指定。
 */
export function authClient(scopes) {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath) {
    const keyFile = resolve(ROOT, keyPath);
    if (!existsSync(keyFile)) {
      console.error(`認証キーが見つかりません: ${keyFile}（鍵なしで使う場合は .env の GOOGLE_APPLICATION_CREDENTIALS を空にしてください）`);
      process.exit(1);
    }
    return new GoogleAuth({ keyFile, scopes });
  }
  return new GoogleAuth({ scopes });
}

export function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
  return dir;
}

export const ymd = (d) => d.toISOString().slice(0, 10);

export function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

/** --days 7 / --from 2026-01-01 / --to 2026-01-31 のような引数を読む */
export function parseArgs(argv = process.argv.slice(2)) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1]?.startsWith('--') ? true : argv[++i] ?? true;
  }
  return out;
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
