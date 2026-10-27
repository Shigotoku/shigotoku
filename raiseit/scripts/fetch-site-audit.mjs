// 公開中ページの技術・安全性監査。Search Console で流入のある上位ページを実際に取得し、
// タイトル/説明/見出し/canonical/noindex/構造化データを確認し、医療広告チェック(block 相当)も本文にかける。
// 保存: data/<site>/audit/YYYY-MM-DD.ndjson(1行=1ページ)。読み取り専用(サイトは一切変更しない)。
// 使い方: npm run fetch:audit [-- --site meditoku] [-- --limit 25]
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv, parseArgs, ensureDir, dataDir, ymd } from './lib.mjs';
import { checkText } from './medical-ad-check.mjs';

loadEnv();
const args = parseArgs();
const LIMIT = Number(args.limit ?? 25);

function topPages() {
  const dir = dataDir('gsc-page');
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter((f) => f.endsWith('.ndjson')).sort().slice(-28);
  const clicks = new Map();
  for (const f of files) {
    for (const line of readFileSync(join(dir, f), 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const r = JSON.parse(line);
      clicks.set(r.page, (clicks.get(r.page) ?? 0) + (r.clicks ?? 0));
    }
  }
  return [...clicks.entries()].sort((a, b) => b[1] - a[1]).slice(0, LIMIT).map(([page, c]) => ({ page, clicks: c }));
}

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const first = (re, html) => {
  const m = re.exec(html);
  return m ? decode(m[1].replace(/<[^>]+>/g, '').trim()) : '';
};

/**
 * 計測タグの有無を検出する(GA4 の測定ID・GTM コンテナ)。
 * dns-prefetch / preconnect だけでは計測されないため、実際に読み込む script と設定呼び出しだけを見る。
 */
export function detectAnalytics(html) {
  const ga4Ids = new Set();
  for (const m of html.matchAll(/googletagmanager\.com\/gtag\/js\?id=(G-[A-Z0-9]+)/g)) ga4Ids.add(m[1]);
  for (const m of html.matchAll(/gtag\(\s*['"]config['"]\s*,\s*['"](G-[A-Z0-9]+)['"]/g)) ga4Ids.add(m[1]);
  const gtmIds = new Set();
  for (const m of html.matchAll(/googletagmanager\.com\/(?:gtm\.js|ns\.html)\?id=(GTM-[A-Z0-9]+)/g)) gtmIds.add(m[1]);
  const ga4 = [...ga4Ids];
  const gtm = [...gtmIds];
  return { ga4Ids: ga4, gtmIds: gtm, hasAnalytics: ga4.length > 0 || gtm.length > 0 };
}

export function auditHtml(html) {
  const head = html.slice(0, 200000);
  const title = first(/<title[^>]*>([\s\S]*?)<\/title>/i, head);
  const desc = (/<meta[^>]+name=["']description["'][^>]*>/i.exec(head)?.[0] ?? '').match(/content=["']([^"']*)["']/i)?.[1] ?? '';
  const robots = (/<meta[^>]+name=["']robots["'][^>]*>/i.exec(head)?.[0] ?? '').match(/content=["']([^"']*)["']/i)?.[1] ?? '';
  const canonical = (/<link[^>]+rel=["']canonical["'][^>]*>/i.exec(head)?.[0] ?? '').match(/href=["']([^"']*)["']/i)?.[1] ?? '';
  const ogTitle = /<meta[^>]+property=["']og:title["']/i.test(head);
  const h1Count = (html.match(/<h1[\s>]/gi) ?? []).length;
  const jsonldTypes = [];
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (o) => {
        if (Array.isArray(o)) return o.forEach(walk);
        if (o && typeof o === 'object') {
          if (o['@type']) jsonldTypes.push(...[].concat(o['@type']));
          Object.values(o).forEach(walk);
        }
      };
      walk(JSON.parse(m[1]));
    } catch {
      jsonldTypes.push('INVALID_JSON');
    }
  }
  const body = (/<body[\s\S]*<\/body>/i.exec(html)?.[0] ?? html)
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  const text = decode(body).replace(/\s+/g, ' ');
  const blocks = checkText(text).findings.filter((f) => f.severity === 'block').slice(0, 5).map((f) => ({ label: f.label, match: f.match, advice: f.advice }));
  return { title, desc, robots, canonical, ogTitle, h1Count, jsonldTypes: [...new Set(jsonldTypes)], textLength: text.length, blocks, ...detectAnalytics(html) };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  const pages = topPages();
  if (!pages.length) {
    console.log('gsc-page データがないため監査をスキップします');
    process.exit(0);
  }
  const rows = [];
  for (const { page, clicks } of pages) {
    const row = { date: ymd(new Date()), page, clicks };
    try {
      const res = await fetch(page, { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'RaiseItAuditBot/1.0 (+read-only)' } });
      row.status = res.status;
      row.finalUrl = res.url;
      row.xRobots = res.headers.get('x-robots-tag') ?? '';
      if (res.ok && /html/i.test(res.headers.get('content-type') ?? '')) Object.assign(row, auditHtml(await res.text()));
    } catch (e) {
      row.status = 0;
      row.error = String(e.message ?? e).slice(0, 120);
    }
    rows.push(row);
    await new Promise((r) => setTimeout(r, 400));
  }
  const out = join(ensureDir(dataDir('audit')), `${ymd(new Date())}.ndjson`);
  writeFileSync(out, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  console.log(`監査 ${rows.length} ページ → ${out}(要確認 ${rows.filter((r) => r.status !== 200 || r.blocks?.length).length})`);
}
