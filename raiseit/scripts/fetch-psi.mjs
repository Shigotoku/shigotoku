// PageSpeed Insights(Core Web Vitals等)を取得して data/psi/YYYY-MM-DD.ndjson に保存。
// 対象: ホーム + GSCで表示回数の多い上位ページ(--top N, 既定8)。--url で個別指定も可。
// 使い方: npm run fetch:psi [-- --top 8] [-- --url https://example.com/]
// 任意: PSI_API_KEY を .env に入れると上限が緩和される。キー無しでも少量なら動く。
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv, ensureDir, parseArgs, ymd, sleep, ROOT, authClient, dataDir, reportDir } from './lib.mjs';

loadEnv();
const args = parseArgs();
const key = process.env.PSI_API_KEY;
const OUT = ensureDir(dataDir('psi'));
const site = (process.env.GSC_SITE_URL || '').replace(/^sc-domain:/, 'https://');

function topPages(n) {
  const dir = dataDir('gsc');
  const files = readdirSync(dir).filter((f) => f.endsWith('.ndjson')).sort().slice(-28);
  const m = new Map();
  for (const f of files) for (const l of readFileSync(join(dir, f), 'utf8').split('\n')) {
    if (!l.trim()) continue;
    const r = JSON.parse(l);
    const pg = r.page.split('#')[0];
    m.set(pg, (m.get(pg) || 0) + r.impressions);
  }
  return [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([u]) => u);
}

const urls = args.url ? [args.url] : [...new Set([site + '/', ...topPages(Number(args.top ?? 8))])];
const today = ymd(new Date());
// 改善依頼文の材料にする監査項目(スコアが低いものだけ保存)
const ADVICE_IDS = new Set(['render-blocking-insight','image-delivery-insight','unused-javascript','unused-css-rules','cache-insight','lcp-discovery-insight','legacy-javascript-insight','unminified-css','unminified-javascript','network-dependency-tree-insight','font-display-insight','third-parties-insight','dom-size-insight','forced-reflow-insight','lcp-breakdown-insight']);
// キー無しは429になりやすいので、認証(ADC/サービスアカウント)で呼ぶ。PSI_API_KEY があればそちら優先。
const gclient = key ? null : await authClient(['https://www.googleapis.com/auth/cloud-platform']).getClient();
const rows = [];
for (const url of urls) {
  for (const strategy of ['mobile']) {
    const q = new URLSearchParams({ url, strategy });
    for (const c of ['performance', 'seo', 'accessibility', 'best-practices']) q.append('category', c);
    q.set('locale', 'ja');
    q.set('locale', 'ja');
    if (key) q.set('key', key);
    try {
      const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${q}`;
      let j;
      if (gclient) {
        try { j = (await gclient.request({ url: endpoint })).data; }
        catch (e) { console.warn(`  失敗 ${e.response?.status ?? ''} ${e.message.slice(0, 120)}: ${url}`); await sleep(3000); continue; }
      } else {
        const res = await fetch(endpoint);
        if (!res.ok) { console.warn(`  失敗 ${res.status}: ${url}`); await sleep(3000); continue; }
        j = await res.json();
      }
      const lh = j.lighthouseResult, a = lh.audits, cat = lh.categories;
      const field = j.loadingExperience?.metrics || {};
      rows.push({
        date: today, url, strategy,
        perf: Math.round((cat.performance?.score ?? 0) * 100),
        seo: Math.round((cat.seo?.score ?? 0) * 100),
        a11y: Math.round((cat.accessibility?.score ?? 0) * 100),
        bestPractices: Math.round((cat['best-practices']?.score ?? 0) * 100),
        lcpMs: Math.round(a['largest-contentful-paint']?.numericValue ?? 0),
        cls: Number((a['cumulative-layout-shift']?.numericValue ?? 0).toFixed(3)),
        tbtMs: Math.round(a['total-blocking-time']?.numericValue ?? 0),
        fieldLcpMs: field.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? null,
        fieldInpMs: field.INTERACTION_TO_NEXT_PAINT?.percentile ?? null,
        fieldCls: field.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile ?? null,
        // 実際の訪問者の計測(CrUX・直近28日・75パーセンタイル)。サイト全体(origin)の値
        originField: j.originLoadingExperience?.metrics
          ? {
              category: j.originLoadingExperience.overall_category ?? null,
              lcpMs: j.originLoadingExperience.metrics.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? null,
              fcpMs: j.originLoadingExperience.metrics.FIRST_CONTENTFUL_PAINT_MS?.percentile ?? null,
              inpMs: j.originLoadingExperience.metrics.INTERACTION_TO_NEXT_PAINT?.percentile ?? null,
              cls: (j.originLoadingExperience.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile ?? null),
              ttfbMs: j.originLoadingExperience.metrics.EXPERIMENTAL_TIME_TO_FIRST_BYTE?.percentile ?? null,
            }
          : null,
        audits: Object.entries(a)
          .filter(([id, x]) => ADVICE_IDS.has(id) && x.score !== null && x.score < 0.9 && id !== 'lcp-breakdown-insight')
          .map(([id, x]) => ({ id, title: x.title, display: x.displayValue ?? '', savingsMs: Math.round(x.details?.overallSavingsMs ?? 0), savingsBytes: Math.round(x.details?.overallSavingsBytes ?? 0) })),
        flags: [
          ...((a['network-requests']?.details?.items ?? []).some((i) => /cdn\.tailwindcss\.com/.test(i.url)) ? ['tailwind-cdn'] : []),
          ...((a['network-requests']?.details?.items ?? []).some((i) => /images\.unsplash\.com/.test(i.url)) ? ['external-hero-image'] : []),
        ],
        lcpElement: a['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.snippet ?? a['lcp-breakdown-insight']?.details?.items?.[1]?.snippet ?? '',
      });
      console.log(`  OK perf=${rows.at(-1).perf} LCP=${rows.at(-1).lcpMs}ms ${url}`);
    } catch (e) { console.warn(`  エラー ${url}: ${e.message}`); }
    await sleep(key ? 500 : 4000);
  }
}
if (rows.length) {
  // 同日の既存ファイルがあれば、同じURL+strategyだけ入れ替えて他は残す(個別実行で消さない)
  const file = join(OUT, `${today}.ndjson`);
  const keep = existsSync(file)
    ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((o) => !rows.some((r) => r.url === o.url && r.strategy === o.strategy))
    : [];
  writeFileSync(file, [...keep, ...rows].map((r) => JSON.stringify(r)).join('\n') + '\n');
}
console.log(`完了: ${rows.length}/${urls.length} ページ → ${OUT}`);
