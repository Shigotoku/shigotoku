// 競合サイトの定点観測(週次)。公開情報のみ・低頻度・robots.txt 遵守・本文は保存しない。
// 見るもの: トップページのタイトル/説明/見出し/構造化データ、サイトマップの URL 数と新規・削除ページ(新規は題名と説明のみ)。
// 保存: data/<site>/competitors/YYYY-MM-DD.ndjson(結果) と state-<id>.json(前回のURL一覧)。
// 対象は sites の competitors: [{id,name,url}](環境変数 SITE_COMPETITORS に JSON)。
// 使い方: npm run fetch:competitors [-- --force]
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv, parseArgs, ensureDir, dataDir, ymd } from './lib.mjs';
import { auditHtml } from './fetch-site-audit.mjs';

const UA = 'RaiseItBot/1.0 (+read-only; low-frequency competitor snapshot)';
const MAX_SITEMAP_URLS = 5000;
const MAX_NEW_FETCH = 12;
const DELAY_MS = 1500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, accept) {
  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'User-Agent': UA, ...(accept ? { Accept: accept } : {}) } });
  return res;
}

// robots.txt の * グループの Disallow を取り出す(簡易)。Sitemap 行も返す
export function parseRobots(text) {
  const disallow = [];
  const sitemaps = [];
  let applies = false;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!m) continue;
    const k = m[1].toLowerCase();
    const v = m[2].trim();
    if (k === 'user-agent') applies = v === '*' || /raiseit/i.test(v);
    else if (k === 'disallow' && applies && v) disallow.push(v);
    else if (k === 'sitemap' && v) sitemaps.push(v);
  }
  return { disallow, sitemaps };
}
export const allowed = (robots, path) => !robots.disallow.some((d) => path.startsWith(d.replace(/\*.*$/, '')));

export function parseSitemap(xml) {
  const locs = [...String(xml).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1].replace(/&amp;/g, '&'));
  return { isIndex: /<sitemapindex/i.test(xml), locs };
}

async function collectUrls(origin, robots) {
  const seeds = robots.sitemaps.length ? robots.sitemaps : [`${origin}/sitemap.xml`];
  const urls = new Set();
  const queue = seeds.slice(0, 3);
  let fetched = 0;
  while (queue.length && fetched < 8 && urls.size < MAX_SITEMAP_URLS) {
    const u = queue.shift();
    fetched++;
    try {
      const res = await get(u);
      if (!res.ok) continue;
      const { isIndex, locs } = parseSitemap(await res.text());
      if (isIndex) queue.push(...locs.slice(0, 6));
      else for (const l of locs) if (urls.size < MAX_SITEMAP_URLS) urls.add(l.split('#')[0]);
    } catch { /* 取得失敗は無視 */ }
    await sleep(DELAY_MS);
  }
  return [...urls];
}

async function snapshot(c, dir, today) {
  const row = { date: today, id: c.id, name: c.name, url: c.url };
  let origin;
  try {
    origin = new URL(c.url).origin;
  } catch {
    return { ...row, ok: false, note: 'URLが不正です' };
  }
  let robots = { disallow: [], sitemaps: [] };
  try {
    const r = await get(`${origin}/robots.txt`);
    if (r.ok) robots = parseRobots(await r.text());
  } catch { /* robots なし扱い */ }
  const startPath = new URL(c.url).pathname || '/';
  if (!allowed(robots, startPath)) return { ...row, ok: false, note: '相手サイトの robots.txt が取得を許可していないため観測しません' };

  try {
    const res = await get(c.url);
    row.status = res.status;
    if (res.ok && /html/i.test(res.headers.get('content-type') ?? '')) {
      const a = auditHtml(await res.text());
      row.home = { title: a.title, desc: a.desc, h1Count: a.h1Count, jsonldTypes: a.jsonldTypes };
    }
  } catch (e) {
    return { ...row, ok: false, note: `取得失敗: ${String(e.message ?? e).slice(0, 80)}` };
  }
  await sleep(DELAY_MS);

  const urls = await collectUrls(origin, robots);
  const stateFile = join(dir, `state-${c.id}.json`);
  const prev = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : null;
  row.sitemapCount = urls.length;
  row.baseline = !prev;
  row.newUrls = [];
  row.removedCount = 0;
  if (prev && urls.length) {
    const before = new Set(prev.urls);
    const now = new Set(urls);
    const added = urls.filter((u) => !before.has(u));
    row.removedCount = prev.urls.filter((u) => !now.has(u)).length;
    row.newCount = added.length;
    for (const u of added.slice(0, MAX_NEW_FETCH)) {
      const item = { url: u };
      try {
        if (allowed(robots, new URL(u).pathname)) {
          const r = await get(u);
          if (r.ok && /html/i.test(r.headers.get('content-type') ?? '')) {
            const a = auditHtml(await r.text());
            item.title = a.title;
            item.desc = a.desc.slice(0, 160);
          }
        }
      } catch { /* 無視 */ }
      row.newUrls.push(item);
      await sleep(DELAY_MS);
    }
  }
  if (urls.length) writeFileSync(stateFile, JSON.stringify({ date: today, urls }));
  row.ok = true;
  if (!urls.length) row.note = 'サイトマップを取得できませんでした(ページ数・新規ページは不明)';
  return row;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  loadEnv();
  const args = parseArgs();
  let list = [];
  try {
    list = JSON.parse(process.env.SITE_COMPETITORS || '[]');
  } catch { /* 空扱い */ }
  list = list.filter((c) => c?.id && c?.url && /^https?:\/\//.test(c.url)).slice(0, 10);
  if (!list.length) {
    console.log('競合が未登録のためスキップします');
    process.exit(0);
  }
  const dir = ensureDir(dataDir('competitors'));
  const today = ymd(new Date());
  const last = readdirSync(dir).filter((f) => f.endsWith('.ndjson')).sort().pop()?.slice(0, 10);
  if (last && !args.force && (Date.parse(today) - Date.parse(last)) / 86400000 < 6) {
    console.log(`前回(${last})から6日未満のためスキップします(週次)`);
    process.exit(0);
  }
  const rows = [];
  for (const c of list) {
    const r = await snapshot(c, dir, today);
    rows.push(r);
    console.log(`${c.name}: ${r.ok ? `サイトマップ${r.sitemapCount ?? '-'}件 / 新規${r.newCount ?? 0}件` : r.note}`);
  }
  writeFileSync(join(dir, `${today}.ndjson`), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
}
