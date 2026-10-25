// 機会抽出 + 月次レポート(HTML)生成。data/gsc, data/ga4 のNDJSONを読む。
// 使い方: npm run report [-- --days 28]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, ensureDir, parseArgs, loadEnv, dataDir, reportDir } from './lib.mjs';
import { buildInstructions, psiIssues, eventIssues, seoTodoIssues } from './issue-text.mjs';

loadEnv();
const args = parseArgs();
const SITE_HOST = (process.env.GSC_SITE_URL || '').replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
const N = Number(args.days || 28);

function readDir(dir) {
  const d = dataDir(dir);
  let files = [];
  try { files = readdirSync(d).filter((f) => f.endsWith('.ndjson')).sort(); } catch { return []; }
  const rows = [];
  for (const f of files) {
    for (const line of readFileSync(join(d, f), 'utf8').split('\n')) {
      if (line.trim()) rows.push(JSON.parse(line));
    }
  }
  return rows;
}

// URL表記ゆれ(www/クエリ/ハッシュ/末尾スラッシュ)を統一
const normUrl = (u) => {
  try {
    const x = new URL(u);
    let p = x.pathname;
    if (!/\.[a-z0-9]+$/i.test(p) && !p.endsWith('/')) p += '/';
    return `${x.protocol}//${x.hostname.replace(/^www\./, '')}${p}`;
  } catch { return u; }
};
const gsc = readDir('gsc').map((r) => ({ ...r, page: normUrl(r.page) }));
const ga4 = readDir('ga4');
const ga4src = readDir('ga4src');
const social = readDir('social');
if (!gsc.length) { console.error('data/gsc が空です。npm run fetch:gsc を先に実行してください'); process.exit(1); }

const latest = gsc.reduce((m, r) => (r.date > m ? r.date : m), '');
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const curFrom = addDays(latest, -(N - 1));
const prevTo = addDays(curFrom, -1);
const prevFrom = addDays(prevTo, -(N - 1));

const agg = (rows, keyFn) => {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    let a = m.get(k);
    if (!a) m.set(k, (a = { clicks: 0, impressions: 0, posW: 0 }));
    a.clicks += r.clicks; a.impressions += r.impressions; a.posW += r.position * r.impressions;
  }
  for (const a of m.values()) { a.ctr = a.impressions ? a.clicks / a.impressions : 0; a.position = a.impressions ? a.posW / a.impressions : 0; }
  return m;
};
const cur = gsc.filter((r) => r.date >= curFrom && r.date <= latest);
const prev = gsc.filter((r) => r.date >= prevFrom && r.date <= prevTo);

const pagePath = (u) => { try { return new URL(u).pathname; } catch { return u; } };
const sum = (rows, k) => rows.reduce((s, r) => s + r[k], 0);
const tot = (rows) => { const i = sum(rows, 'impressions'); return { clicks: sum(rows, 'clicks'), impressions: i, ctr: i ? sum(rows, 'clicks') / i : 0, position: i ? rows.reduce((s, r) => s + r.position * r.impressions, 0) / i : 0 }; };
// ページ別の合計(data/gsc-page)があれば、サイト合計とページ別の数値はそれを使う。
// クエリ別の行(data/gsc)は匿名化クエリが除外されクリックの一部しか含まないため、クエリ分析専用にする。
const gscPage = readDir('gsc-page').map((r) => ({ ...r, page: normUrl(r.page) }));
const curP = gscPage.filter((r) => r.date >= curFrom && r.date <= latest);
const prevP = gscPage.filter((r) => r.date >= prevFrom && r.date <= prevTo);
const hasPageTotals = curP.length > 0;
const T = tot(hasPageTotals ? curP : cur), P = tot(hasPageTotals ? prevP : prev);
if (hasPageTotals) console.log(`クエリ別で見えるクリック: ${(tot(cur).clicks / (T.clicks || 1) * 100).toFixed(0)}% (残りは匿名化クエリ)`);

const pages = agg(hasPageTotals ? curP : cur, (r) => r.page), pagesPrev = agg(hasPageTotals ? prevP : prev, (r) => r.page);
const pq = agg(cur, (r) => r.page + '\t' + r.query);
const queries = agg(cur, (r) => r.query);

// GA4: オーガニック閲覧数(同期間)
const ga4Cur = ga4.filter((r) => r.date >= curFrom && r.date <= latest && r.channel === 'Organic Search');
const ga4Pages = new Map();
for (const r of ga4Cur) ga4Pages.set(r.pagePath, (ga4Pages.get(r.pagePath) || 0) + r.views);

// 期待CTR(順位帯の目安)
const expCtr = (p) => (p <= 3 ? 0.10 : p <= 7 ? 0.04 : p <= 10 ? 0.02 : 0.01);

const lowCtr = [], striking = [];
for (const [k, a] of pq) {
  const [page, query] = k.split('\t');
  if (a.impressions >= 20 && a.position <= 10 && a.ctr < expCtr(a.position) * 0.6)
    lowCtr.push({ page, query, ...a, lost: Math.round(a.impressions * expCtr(a.position) - a.clicks) });
  if (a.impressions >= 15 && a.position > 7.5 && a.position <= 20)
    striking.push({ page, query, ...a });
}
lowCtr.sort((a, b) => b.lost - a.lost);
striking.sort((a, b) => b.impressions - a.impressions);

const drops = [];
for (const [page, p] of pagesPrev) {
  const c = pages.get(page) || { clicks: 0, impressions: 0, position: 0 };
  if (p.impressions >= 50 && c.impressions < p.impressions * 0.7)
    drops.push({ page, prevImp: p.impressions, curImp: c.impressions, prevClicks: p.clicks, curClicks: c.clicks, prevPos: p.position, curPos: c.position });
}
drops.sort((a, b) => (b.prevImp - b.curImp) - (a.prevImp - a.curImp));

const topPages = [...pages].sort((a, b) => b[1].impressions - a[1].impressions).slice(0, 15);
const topQueries = [...queries].sort((a, b) => b[1].impressions - a[1].impressions).slice(0, 15);

// ---- 今月やること(優先度付き) ----
const todos = [];
for (const o of lowCtr.slice(0, 5)) todos.push({ score: o.lost * 3, type: '低CTR', q: o.query, text: `「${o.query}」(${o.position.toFixed(1)}位 / 表示${o.impressions} / クリック${o.clicks})のtitle・descriptionを検索意図に合わせて見直す`, page: o.page });
for (const o of striking.slice(0, 5)) todos.push({ score: o.impressions * 1.5, type: '順位あと一押し', q: o.query, text: `「${o.query}」(${o.position.toFixed(1)}位 / 表示${o.impressions})の見出し・本文を強化し、関連ページから内部リンクを追加する`, page: o.page });
for (const o of drops.slice(0, 3)) todos.push({ score: (o.prevImp - o.curImp) * 2, type: '急落', text: `表示が${o.prevImp}→${o.curImp}に減少。内容の鮮度・インデックス状況を確認する`, page: o.page });
todos.sort((a, b) => b.score - a.score);

// ---- 流入元 ----
const srcCur = ga4src.filter((r) => r.date >= curFrom && r.date <= latest);
const srcPrev = ga4src.filter((r) => r.date >= prevFrom && r.date <= prevTo);
const groupSum = (rows, keyFn) => {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    const a = m.get(k) || { sessions: 0, engaged: 0, keyEvents: 0 };
    a.sessions += r.sessions; a.engaged += r.engagedSessions; a.keyEvents += r.keyEvents;
    m.set(k, a);
  }
  return m;
};
const chCur = groupSum(srcCur, (r) => r.channel), chPrev = groupSum(srcPrev, (r) => r.channel);
const smCur = groupSum(srcCur, (r) => `${r.source} / ${r.medium}`), smPrev = groupSum(srcPrev, (r) => `${r.source} / ${r.medium}`);
const lpCur = groupSum(srcCur, (r) => normUrl('https://' + SITE_HOST + r.landingPage));
const sortBy = (m) => [...m].sort((a, b) => b[1].sessions - a[1].sessions);
const srcTable = (cm, pm, n) => table(['流入元', 'セッション', '前期間比', 'エンゲージ率', 'キーイベント'],
  sortBy(cm).slice(0, n).map(([k, a]) => [esc(k), a.sessions, delta(a.sessions, pm.get(k)?.sessions || 0), pct(a.sessions ? a.engaged / a.sessions : 0), a.keyEvents]));

// ---- SNS ----
const socCur = social.filter((r) => r.date >= curFrom && r.date <= latest);
const socPrev = social.filter((r) => r.date >= prevFrom && r.date <= prevTo);
const socSum = (rows) => { const m = new Map(); for (const r of rows) { const a = m.get(r.platform) || { impressions: 0, views: 0, clicks: 0, likes: 0, followers: 0, last: '' }; a.impressions += r.impressions; a.views += r.views; a.clicks += r.clicks; a.likes += r.likes; if (r.date >= a.last) { a.last = r.date; a.followers = r.followers; } m.set(r.platform, a); } return m; };
const sc = socSum(socCur), sp = socSum(socPrev);

// ---- AI検索からの流入 ----
const AI_RE = /(chatgpt|chat\.openai|openai|perplexity|gemini\.google|bard\.google|copilot\.microsoft|claude\.ai|you\.com|phind|kagi|duckduckgo.*ai|meta\.ai|grok)/i;
const aiCur = srcCur.filter((r) => AI_RE.test(r.source));
const aiPrev = srcPrev.filter((r) => AI_RE.test(r.source));
const aiBy = groupSum(aiCur, (r) => r.source), aiByPrev = groupSum(aiPrev, (r) => r.source);
const aiTotal = sum(aiCur.map((r) => ({ s: r.sessions })), 's'), aiTotalPrev = sum(aiPrev.map((r) => ({ s: r.sessions })), 's');

// ---- 表示速度(PageSpeed Insights) ----
const psiAll = readDir('psi');
const psiLatestDate = psiAll.reduce((m, r) => (r.date > m ? r.date : m), '');
const psi = psiAll.filter((r) => r.date === psiLatestDate && (() => { try { return new URL(r.url).hostname.replace(/^www\./, '') === SITE_HOST; } catch { return false; } })()).sort((a, b) => a.perf - b.perf);
const lcpBad = (ms) => (ms > 4000 ? 'bad' : ms > 2500 ? 'warn' : 'good');

// ---- 計測イベントの診断 ----
const evAll = readDir('ga4ev').filter((r) => r.date >= curFrom && r.date <= latest);
const evSum = new Map();
for (const r of evAll) evSum.set(r.eventName, (evSum.get(r.eventName) || 0) + r.count);
const CV_RE = /(tel|phone|call|reserve|booking|book|appointment|form|lead|contact|submit|download|inquiry|signup|sign_up|purchase|cta|conversion|generate_lead)/i;
const cvEvents = [...evSum].filter(([k]) => CV_RE.test(k)).sort((a, b) => b[1] - a[1]);
const keyEventTotal = srcCur.reduce((s, r) => s + r.keyEvents, 0);

// ---- 施策の効果(実施前後の比較) ----
const actions = readDir('actions').sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 20);
const WIN = 14;
const actionEffects = actions.map((ac) => {
  const days = Math.floor((new Date(latest + 'T00:00:00Z') - new Date(ac.date + 'T00:00:00Z')) / 86400000);
  const target = ac.url ? normUrl(ac.url) : null;
  const pick = (from, to) => tot(gsc.filter((r) => r.date >= from && r.date <= to && (!target || r.page === target)));
  const afterDays = Math.min(WIN, days);
  const before = pick(addDays(ac.date, -WIN), addDays(ac.date, -1));
  const after = afterDays > 0 ? pick(ac.date, addDays(ac.date, afterDays - 1)) : null;
  return { ...ac, days, afterDays, before, after, enough: days >= 7 };
});

// ---- 改善依頼(コピペ用) ----
const siteName = (process.env.GSC_SITE_URL || '').replace(/^sc-domain:/, '') || SITE_HOST;
const ictx = { site: siteName, date: psiLatestDate || latest };
const rank = { high: 0, mid: 1, low: 2 };
const issues = [
  ...eventIssues({ keyEventTotal, cvEvents, evSumSize: evSum.size }),
  ...psiIssues(psi),
  ...seoTodoIssues(todos.slice(0, 8)),
].sort((a, b) => rank[a.severity] - rank[b.severity]).map((it, i) => ({ ...it, id: i, text: buildInstructions(it, ictx) }));

// ---- HTML ----
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (x) => (x * 100).toFixed(1) + '%';
const delta = (c, p) => (p ? ((c - p) / p * 100 >= 0 ? '+' : '') + ((c - p) / p * 100).toFixed(0) + '%' : '-');
const table = (head, rows) => `<table><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${head.length}" class="muted">該当なし</td></tr>`}</tbody></table>`;
const link = (u) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(pagePath(u))}</a>`;
const kpi = (label, v, d) => `<div class="kpi"><div class="l">${label}</div><div class="v">${v}</div><div class="d">前期間比 ${d}</div></div>`;

const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>レイジット (RaiseIt) 月次レポート ${latest}</title>
<style>body{font:14px/1.6 system-ui,'Yu Gothic',sans-serif;margin:0;background:#f5f7fa;color:#1f2937}main{max-width:1100px;margin:0 auto;padding:24px}h1{font-size:22px}h2{font-size:17px;margin-top:32px;border-left:4px solid #2563eb;padding-left:8px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}.kpi{background:#fff;border-radius:8px;padding:14px;box-shadow:0 1px 3px #0001}.kpi .l{color:#6b7280;font-size:12px}.kpi .v{font-size:26px;font-weight:700}.kpi .d{font-size:12px;color:#6b7280}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px #0001}th,td{padding:8px 10px;border-bottom:1px solid #eef0f3;text-align:left;vertical-align:top}th{background:#eef2ff;font-size:12px}td a{color:#2563eb;text-decoration:none;word-break:break-all}.muted{color:#9ca3af}
.issue{background:#fff;border-radius:8px;padding:12px 14px;margin:10px 0;box-shadow:0 1px 3px #0001}.ihead{margin-bottom:4px}.ifacts{color:#4b5563;font-size:13px;margin-bottom:8px}.sev{display:inline-block;padding:1px 8px;border-radius:99px;font-size:11px;color:#fff}.sev-high{background:#dc2626}.sev-mid{background:#d97706}.sev-low{background:#6b7280}
.cpbtn{border:1px solid #2563eb;background:#fff;color:#2563eb;border-radius:6px;padding:6px 12px;font-size:13px;cursor:pointer}.cpbtn:hover{background:#eff6ff}.cpbtn.ok{background:#16a34a;border-color:#16a34a;color:#fff}.bulk{margin:8px 0}details{margin-top:8px}summary{cursor:pointer;color:#2563eb;font-size:13px}.two{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px}.lbl{font-size:12px;color:#6b7280;margin-bottom:2px}pre{white-space:pre-wrap;word-break:break-word;background:#f9fafb;border:1px solid #eef0f3;border-radius:6px;padding:10px;font:12px/1.6 'Yu Gothic',system-ui,sans-serif;margin:0}@media(max-width:800px){.two{grid-template-columns:1fr}}
.tag{display:inline-block;padding:1px 8px;border-radius:99px;font-size:11px;background:#dbeafe;color:#1d4ed8;white-space:nowrap}.note{color:#6b7280;font-size:12px}</style></head><body><main>
<h1>レイジット (RaiseIt) 月次レポート <span class="note">${SITE_HOST} / ${curFrom} 〜 ${latest}(${N}日間) vs ${prevFrom} 〜 ${prevTo}</span></h1>
<div class="kpis">${kpi('検索クリック', T.clicks.toLocaleString(), delta(T.clicks, P.clicks))}${kpi('検索表示回数', T.impressions.toLocaleString(), delta(T.impressions, P.impressions))}${kpi('平均CTR', pct(T.ctr), delta(T.ctr, P.ctr))}${kpi('平均掲載順位', T.position.toFixed(1), (P.position - T.position >= 0 ? '改善 ' : '悪化 ') + Math.abs(P.position - T.position).toFixed(1))}${kpi('GA4 オーガニック閲覧', sum(ga4Cur, 'views').toLocaleString(), ga4Cur.length ? '' : 'GA4データなし')}</div>
<h2>今月やること(優先順)</h2>
${table(['#', '種類', '施策', 'ページ'], todos.slice(0, 10).map((t, i) => [i + 1, `<span class="tag">${t.type}</span>`, esc(t.text), link(t.page)]))}
<p class="note">提案のみです。canonical / noindex / robots は自動変更しません。反映は人が確認してから行います。</p>
<h2>改善依頼(コピーしてそのまま使えます)</h2>
<p class="note">制作会社に送る文章と、ChatGPT・Cursor などのAIに貼る指示を、問題ごとに用意しました。ボタンを押すとコピーされます。</p>
<div class="bulk"><button class="cpbtn" data-bulk="vendor">全件まとめて コピー(制作会社向け)</button> <button class="cpbtn" data-bulk="ai">全件まとめて コピー(AI向け)</button></div>
${issues.length ? issues.map((it) => `<div class="issue"><div class="ihead"><span class="sev sev-${it.severity}">優先度 ${{ high: '高', mid: '中', low: '低' }[it.severity]}</span> <b>${esc(it.title)}</b>${it.url ? ` <span class="note">${link(it.url)}</span>` : ''}</div><div class="ifacts">${esc(it.facts[0] ?? '')}</div><div class="iact"><button class="cpbtn" data-id="${it.id}" data-kind="vendor">制作会社向けをコピー</button> <button class="cpbtn" data-id="${it.id}" data-kind="ai">AI向けをコピー</button></div><details><summary>文面を見る</summary><div class="two"><div><div class="lbl">制作会社向け</div><pre>${esc(it.text.vendor)}</pre></div><div><div class="lbl">AI向け</div><pre>${esc(it.text.ai)}</pre></div></div></details></div>`).join('') : '<p class="muted">現在、依頼が必要な問題は見つかっていません。</p>'}
<script type="application/json" id="issues-data">${JSON.stringify(issues.map((i) => ({ id: i.id, title: i.title, vendor: i.text.vendor, ai: i.text.ai }))).replace(/</g, '\\u003c')}</script>
<script>
(function(){
  var data = JSON.parse(document.getElementById('issues-data').textContent);
  function copy(text, btn){
    function done(){ var o=btn.textContent; btn.textContent='コピーしました ✓'; btn.classList.add('ok'); setTimeout(function(){btn.textContent=o;btn.classList.remove('ok');},1800); }
    if (navigator.clipboard && window.isSecureContext !== false) { navigator.clipboard.writeText(text).then(done, fallback); } else { fallback(); }
    function fallback(){ var t=document.createElement('textarea'); t.value=text; t.style.position='fixed'; t.style.opacity='0'; document.body.appendChild(t); t.select(); try{document.execCommand('copy');done();}catch(e){alert('コピーに失敗しました。文面を開いて手動で選択してください。');} document.body.removeChild(t); }
  }
  document.addEventListener('click', function(e){
    var b = e.target.closest('.cpbtn'); if(!b) return;
    if (b.dataset.bulk) { var k=b.dataset.bulk; copy(data.map(function(d,i){return '━━━━━━ ('+(i+1)+'/'+data.length+') ━━━━━━\\n'+d[k];}).join('\\n\\n'), b); return; }
    var d = data.filter(function(x){return String(x.id)===b.dataset.id;})[0]; if(d) copy(d[b.dataset.kind], b);
  });
})();
</script>
<h2>施策の効果(実施前後の比較)</h2>
${actionEffects.length ? table(['実施日', '施策', '対象', '経過', '表示(前→後)', 'クリック(前→後)', '平均順位(前→後)', '判定'], actionEffects.map((e) => [e.date, esc(e.note), e.url ? link(e.url) : 'サイト全体', `${e.days}日`, e.after ? `${e.before.impressions} → ${e.after.impressions}` : '-', e.after ? `${e.before.clicks} → ${e.after.clicks}` : '-', e.after && e.before.impressions && e.after.impressions ? `${e.before.position.toFixed(1)} → ${e.after.position.toFixed(1)}` : '-', !e.enough ? '<span class="muted">経過日数が足りません(7日〜)</span>' : e.after && e.before.impressions < 20 ? '<span class="muted">実施前のデータが少なく判定不可</span>' : e.after.impressions > e.before.impressions * 1.15 ? '増加' : e.after.impressions < e.before.impressions * 0.85 ? '減少' : '大きな変化なし'])) + `<p class="note">実施前後${WIN}日間(同日数)の比較です。季節要因・他の施策・検索アルゴリズムの変動も影響するため、効果の確定ではなく目安として見てください。</p>` : '<p class="muted">記録された施策はありません。施策を実施したら <code>npm run action:add -- --url 対象URL --note "内容"</code> で記録すると、前後の変化がここに出ます。</p>'}
<h2>① 低CTR(順位は良いのにクリックされない)</h2>
${table(['キーワード', 'ページ', '順位', '表示', 'クリック', 'CTR', '取りこぼし目安'], lowCtr.slice(0, 15).map((o) => [esc(o.query), link(o.page), o.position.toFixed(1), o.impressions, o.clicks, pct(o.ctr), o.lost]))}
<h2>② あと一押し(8〜20位)</h2>
${table(['キーワード', 'ページ', '順位', '表示', 'クリック'], striking.slice(0, 15).map((o) => [esc(o.query), link(o.page), o.position.toFixed(1), o.impressions, o.clicks]))}
<h2>③ 表示が急落したページ</h2>
${table(['ページ', '表示(前→今)', 'クリック(前→今)', '順位(前→今)'], drops.slice(0, 10).map((o) => [link(o.page), `${o.prevImp} → ${o.curImp}`, `${o.prevClicks} → ${o.curClicks}`, `${o.prevPos.toFixed(1)} → ${o.curPos ? o.curPos.toFixed(1) : '-'}`]))}
<h2>どこから来ているか(流入元)</h2>
${ga4src.length ? `<h3>チャネル別</h3>${srcTable(chCur, chPrev, 10)}<h3>参照元 / メディア別 上位15</h3>${srcTable(smCur, smPrev, 15)}<h3>最初に見られたページ(ランディング) 上位10</h3>${table(['ページ', 'セッション', 'エンゲージ率'], sortBy(lpCur).slice(0, 10).map(([u, a]) => [link(u), a.sessions, pct(a.sessions ? a.engaged / a.sessions : 0)]))}` : '<p class="muted">流入元データなし。npm run fetch:src を実行してください。</p>'}
<h2>AI検索(ChatGPT・Gemini・Perplexity等)からの流入</h2>
${ga4src.length ? (aiTotal ? `<p>合計 <b>${aiTotal}</b> セッション(前期間比 ${delta(aiTotal, aiTotalPrev)})</p>${srcTable(aiBy, aiByPrev, 10)}` : '<p class="muted">この期間はAI検索からの流入は確認できませんでした(0件)。</p>') : '<p class="muted">流入元データなし</p>'}
<h2>成果(予約・問い合わせ)の計測状況</h2>
${evSum.size ? `<p>キーイベント(GA4で成果として設定済み)の期間合計: <b>${keyEventTotal}</b> 件 ${keyEventTotal === 0 ? '<span class="tag" style="background:#fee2e2;color:#b91c1c">成果が1件も計測されていません</span>' : ''}</p>${cvEvents.length ? table(['成果らしきイベント', '件数'], cvEvents.slice(0, 10).map(([k, v]) => [esc(k), v])) : '<p class="muted">電話・予約・フォーム送信などに該当するイベントが見つかりません。計測の設置が必要な可能性があります。</p>'}` : '<p class="muted">イベントデータなし。npm run fetch:events を実行してください。</p>'}
<h2>表示速度(モバイル / PageSpeed Insights ${psiLatestDate})</h2>
${(() => { const f = psi.find((r) => r.originField)?.originField; if (!f) return '<p class="note">実際の訪問者のデータ(CrUX)は、訪問数が少ないサイトでは取得できません。</p>'; const c = (ok) => (ok ? '#16a34a' : '#d97706'); return `<div class="kpis"><div class="kpi"><div class="l">実利用者 LCP(最大表示)</div><div class="v" style="color:${c(f.lcpMs <= 2500)}">${f.lcpMs != null ? (f.lcpMs / 1000).toFixed(1) + '秒' : '-'}</div><div class="d">目安 2.5秒以内</div></div><div class="kpi"><div class="l">実利用者 FCP(初表示)</div><div class="v" style="color:${c(f.fcpMs <= 1800)}">${f.fcpMs != null ? (f.fcpMs / 1000).toFixed(1) + '秒' : '-'}</div><div class="d">目安 1.8秒以内</div></div><div class="kpi"><div class="l">実利用者 CLS(ズレ)</div><div class="v" style="color:${c((f.cls ?? 0) <= 10)}">${f.cls ?? '-'}</div><div class="d">0.1以下(×100表記で10以下)</div></div><div class="kpi"><div class="l">Google判定(サイト全体)</div><div class="v">${esc(f.category ?? '-')}</div><div class="d">直近28日・75パーセンタイル</div></div></div><p class="note">下の表は「模擬回線での測定(ラボ)」です。点数が低くても、上の実利用者の数字が良ければ、実際の訪問者の体験は良好です。順位評価は実利用者データが重視されます。</p>`; })()}
${psi.length ? table(['ページ', '総合', 'LCP', 'CLS', 'TBT', 'SEO', 'アクセシビリティ'], psi.map((r) => [link(r.url), r.perf, `<span class="tag" style="background:${{ good: '#dcfce7', warn: '#fef9c3', bad: '#fee2e2' }[lcpBad(r.lcpMs)]};color:#111">${(r.lcpMs / 1000).toFixed(1)}s</span>`, r.cls, r.tbtMs + 'ms', r.seo, r.a11y])) + '<p class="note">LCPの目安: 2.5秒以内=良好 / 4秒超=要改善。ラボ計測(模擬回線)のため実ユーザーの値より厳しめに出ます。</p>' : '<p class="muted">速度データなし。npm run fetch:psi を実行してください。</p>'}
<h2>SNS(X / Instagram / YouTube など)</h2>
${sc.size ? table(['媒体', 'インプレッション', '前期間比', '閲覧数', 'クリック', 'いいね', 'フォロワー'], [...sc].map(([k, a]) => [esc(k), a.impressions, delta(a.impressions, sp.get(k)?.impressions || 0), a.views, a.clicks, a.likes, a.followers])) : '<p class="muted">SNSデータなし。data/social-import/ にCSVを置き npm run import:social を実行してください。</p>'}
<h2>表示回数の多いページ</h2>
${table(['ページ', '表示', 'クリック', 'CTR', '順位', 'GA4閲覧(自然検索)'], topPages.map(([u, a]) => [link(u), a.impressions, a.clicks, pct(a.ctr), a.position.toFixed(1), ga4Pages.get(pagePath(u)) ?? '-']))}
<h2>表示回数の多い検索キーワード</h2>
${table(['キーワード', '表示', 'クリック', 'CTR', '順位'], topQueries.map(([q, a]) => [esc(q), a.impressions, a.clicks, pct(a.ctr), a.position.toFixed(1)]))}
<p class="note">生成: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC / データ: Search Console, GA4</p>
</main></body></html>`;

const out = reportDir();
ensureDir(out);
const file = join(out, `report-${latest}.html`);
writeFileSync(file, html);
writeFileSync(join(out, 'latest.html'), html);
writeFileSync(join(out, 'issues.json'), JSON.stringify(issues.map((i) => ({ id: i.id, severity: i.severity, title: i.title, url: i.url || null, vendor: i.text.vendor, ai: i.text.ai })), null, 2));
console.log(`レポート生成: ${file}`);
console.log(`クリック ${T.clicks}(前 ${P.clicks}) / 表示 ${T.impressions}(前 ${P.impressions}) / 低CTR ${lowCtr.length}件 / あと一押し ${striking.length}件 / 急落 ${drops.length}件`);
todos.slice(0, 5).forEach((t, i) => console.log(`${i + 1}. [${t.type}] ${t.text} ${pagePath(t.page)}`));
