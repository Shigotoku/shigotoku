// 詳細データ(detail.json)。画面の「詳細データ」で並べ替え・絞り込みできるよう、
// 日次推移 / 検索語 / ページ / 流入元 / 端末 / 閲覧ページ を現在期間(28日)と前期間で集計する。
import { addDays, pathOf } from './insights.mjs';

const norm = (p) => String(p ?? '').split('?')[0].replace(/(.)\/$/, '$1');
const sum = (rows, k) => rows.reduce((n, r) => n + (r[k] ?? 0), 0);
const r2 = (n, d = 2) => (Number.isFinite(n) ? Math.round(n * 10 ** d) / 10 ** d : 0);
const maxDate = (rows) => rows.reduce((m, r) => (r.date > m ? r.date : m), '');

function groupBy(rows, keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
}

// GSC 行を集計(順位は表示回数で加重平均)
function gscAgg(rows) {
  const impressions = sum(rows, 'impressions');
  const clicks = sum(rows, 'clicks');
  const pos = impressions ? rows.reduce((n, r) => n + (r.position ?? 0) * (r.impressions ?? 0), 0) / impressions : 0;
  return { clicks, impressions, ctrPct: impressions ? r2((clicks / impressions) * 100) : 0, position: r2(pos, 1) };
}

export function buildDetail(input, opts = {}) {
  const N = opts.days ?? 28;
  const { gscPage = [], gscQuery = [], ga4 = [], ga4src = [], ga4ev = [], ga4conv = [], leadEvent = '', formEvent = 'form_start' } = input;
  const latest = [maxDate(gscPage) || maxDate(gscQuery), maxDate(ga4src) || maxDate(ga4ev)].filter(Boolean).sort()[0] || input.today;
  const curFrom = addDays(latest, -(N - 1));
  const prevTo = addDays(curFrom, -1);
  const prevFrom = addDays(prevTo, -(N - 1));
  const cur = (r) => r.date >= curFrom && r.date <= latest;
  const prev = (r) => r.date >= prevFrom && r.date <= prevTo;

  // ---- 日次(90日) ----
  const from90 = addDays(latest, -89);
  const days = [];
  const idx = {};
  for (let d = from90; d <= latest; d = addDays(d, 1)) {
    idx[d] = { date: d, clicks: 0, impressions: 0, posW: 0, sessions: 0, engaged: 0, leads: 0, formStart: 0 };
    days.push(idx[d]);
  }
  for (const r of gscPage) if (idx[r.date]) { idx[r.date].clicks += r.clicks ?? 0; idx[r.date].impressions += r.impressions ?? 0; idx[r.date].posW += (r.position ?? 0) * (r.impressions ?? 0); }
  for (const r of ga4src) if (idx[r.date]) { idx[r.date].sessions += r.sessions ?? 0; idx[r.date].engaged += r.engagedSessions ?? 0; }
  for (const r of ga4ev) if (idx[r.date]) { if (r.eventName === leadEvent) idx[r.date].leads += r.count ?? 0; if (r.eventName === formEvent) idx[r.date].formStart += r.count ?? 0; }
  const daily = days.map((d) => ({ date: d.date, clicks: d.clicks, impressions: d.impressions, position: d.impressions ? r2(d.posW / d.impressions, 1) : 0, sessions: d.sessions, engaged: d.engaged, leads: d.leads, formStart: d.formStart }));

  // ---- 検索語(匿名化クエリは含まれない) ----
  const qMap = groupBy(gscQuery.filter((r) => r.query), (r) => r.query);
  const queries = [...qMap.entries()].map(([query, rows]) => {
    const c = gscAgg(rows.filter(cur));
    const p = gscAgg(rows.filter(prev));
    const pages = [...groupBy(rows.filter(cur), (r) => pathOf(r.page)).entries()].sort((a, b) => sum(b[1], 'impressions') - sum(a[1], 'impressions'))[0]?.[0] ?? '';
    return { query, ...c, prevClicks: p.clicks, prevImpressions: p.impressions, prevPosition: p.position, topPage: pages };
  }).filter((q) => q.impressions > 0).sort((a, b) => b.impressions - a.impressions).slice(0, 400);

  // ---- ページ(検索 + 入口セッション + 成果) ----
  const landCur = groupBy(ga4src.filter(cur), (r) => norm(r.landingPage));
  const convCur = ga4conv.filter(cur);
  const pMap = groupBy(gscPage, (r) => pathOf(r.page));
  const pages = [...pMap.entries()].map(([path, rows]) => {
    const c = gscAgg(rows.filter(cur));
    const p = gscAgg(rows.filter(prev));
    const sessions = sum(landCur.get(norm(path)) ?? [], 'sessions');
    const leads = sum(convCur.filter((r) => norm(r.landingPage) === norm(path) && r.eventName === leadEvent), 'count');
    return { path, ...c, prevClicks: p.clicks, prevImpressions: p.impressions, prevPosition: p.position, sessions, leads, cvrPct: sessions ? r2((leads / sessions) * 100) : 0 };
  }).filter((p) => p.impressions > 0 || p.sessions > 0).sort((a, b) => b.impressions - a.impressions).slice(0, 300);

  // ---- 流入元(source / medium) ----
  const sMap = groupBy(ga4src.filter((r) => cur(r) || prev(r)), (r) => `${r.source} / ${r.medium}`);
  const sources = [...sMap.entries()].map(([name, rows]) => {
    const c = rows.filter(cur);
    const p = rows.filter(prev);
    return { name, channel: rows[0].channel, sessions: sum(c, 'sessions'), prevSessions: sum(p, 'sessions'), engaged: sum(c, 'engagedSessions'), engagedPct: sum(c, 'sessions') ? r2((sum(c, 'engagedSessions') / sum(c, 'sessions')) * 100, 1) : 0 };
  }).filter((s) => s.sessions || s.prevSessions).sort((a, b) => b.sessions - a.sessions).slice(0, 100);

  // ---- 端末(検索語データ由来。匿名化分を含まない) ----
  const devices = [...groupBy(gscQuery.filter(cur), (r) => r.device || 'UNKNOWN').entries()].map(([device, rows]) => {
    const p = gscAgg(gscQuery.filter((r) => prev(r) && (r.device || 'UNKNOWN') === device));
    return { device, ...gscAgg(rows), prevClicks: p.clicks };
  }).sort((a, b) => b.impressions - a.impressions);

  // ---- 閲覧ページ(GA4 ページ別) ----
  const vMap = groupBy(ga4.filter((r) => cur(r) || prev(r)), (r) => norm(r.pagePath));
  const views = [...vMap.entries()].map(([path, rows]) => {
    const c = rows.filter(cur);
    const p = rows.filter(prev);
    const sess = sum(c, 'sessions');
    return { path, views: sum(c, 'views'), prevViews: sum(p, 'views'), sessions: sess, avgEngageSec: sess ? Math.round(sum(c, 'engagementSeconds') / sess) : 0, engagedPct: sess ? r2((sum(c, 'engagedSessions') / sess) * 100, 1) : 0 };
  }).filter((v) => v.views || v.prevViews).sort((a, b) => b.views - a.views).slice(0, 200);

  // ---- 曜日別(直近90日の平均) ----
  const dow = Array.from({ length: 7 }, () => ({ n: 0, sessions: 0, leads: 0, clicks: 0 }));
  for (const d of daily) {
    const w = new Date(`${d.date}T00:00:00Z`).getUTCDay();
    dow[w].n++; dow[w].sessions += d.sessions; dow[w].leads += d.leads; dow[w].clicks += d.clicks;
  }
  const weekdays = dow.map((x, i) => ({ dow: '日月火水木金土'[i], sessions: x.n ? r2(x.sessions / x.n, 1) : 0, leads: x.n ? r2(x.leads / x.n, 2) : 0, clicks: x.n ? r2(x.clicks / x.n, 1) : 0 }));

  return {
    schema: 1,
    period: { from: curFrom, to: latest, prevFrom, prevTo, days: N },
    notes: { queries: '検索語は Google が匿名化したものを含みません(全クリックの一部のみ)。ページ別は全体を反映します。', devices: '端末別は検索語データ由来のため、匿名化分を含みません。' },
    daily, queries, pages, sources, devices, views, weekdays,
  };
}
