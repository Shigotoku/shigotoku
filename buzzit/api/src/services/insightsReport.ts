/**
 * SNS解析レポート（SocialDog PowerPoint 相当の HTML 版）
 */
import type { InsightsDashboard } from './insightsDashboard';

const PLATFORM_LABEL: Record<string, string> = {
  x: 'X',
  instagram: 'Instagram',
  facebook: 'Facebook',
  threads: 'Threads',
  line: 'LINE',
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildInsightsHtmlReport(
  dashboard: InsightsDashboard,
  opts: { businessName?: string } = {},
): string {
  const title = opts.businessName
    ? `${opts.businessName} — SNS解析レポート`
    : 'Buzzit SNS解析レポート';
  const generated = new Date().toLocaleString('ja-JP');
  const period = `直近 ${dashboard.periodDays} 日`;

  const platformRows = Object.entries(dashboard.byPlatform)
    .map(
      ([key, v]) => `
      <tr>
        <td>${esc(PLATFORM_LABEL[key] ?? key)}</td>
        <td class="num">${v.impressions.toLocaleString()}</td>
        <td class="num">${v.reach.toLocaleString()}</td>
        <td class="num">${v.engagements.toLocaleString()}</td>
        <td class="num">${v.postCount}</td>
      </tr>`,
    )
    .join('');

  const topRows = dashboard.topPosts
    .slice(0, 10)
    .map(
      (p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${esc(PLATFORM_LABEL[p.platform] ?? p.platform)}</td>
        <td>${esc(p.preview.slice(0, 60))}${p.preview.length > 60 ? '…' : ''}</td>
        <td class="num">${p.impressions.toLocaleString()}</td>
        <td class="num">${p.engagement}</td>
      </tr>`,
    )
    .join('');

  const takeawayBlocks = dashboard.takeaways
    .map(
      (t) => `
      <div class="takeaway ${t.type}">
        <strong>${esc(t.title)}</strong>
        <p>${esc(t.body)}</p>
      </div>`,
    )
    .join('');

  const maxDaily = Math.max(1, ...dashboard.dailySeries.map((d) => d.impressions));
  const dailyBars = dashboard.dailySeries
    .map((d) => {
      const h = Math.round((d.impressions / maxDaily) * 80);
      const label = d.date.slice(5).replace('-', '/');
      return `<div class="bar-wrap" title="${d.date}: ${d.impressions.toLocaleString()}">
        <div class="bar" style="height:${h}px"></div>
        <span>${label}</span>
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: "Hiragino Sans", "Yu Gothic", sans-serif; margin: 0; padding: 32px; color: #171717; background: #f5f4f0; }
    .page { max-width: 900px; margin: 0 auto; background: #fff; padding: 40px; border: 1px solid #e5e5e5; }
    h1 { font-size: 24px; margin: 0 0 8px; }
    .meta { color: #737373; font-size: 13px; margin-bottom: 32px; }
    h2 { font-size: 16px; border-bottom: 2px solid #171717; padding-bottom: 6px; margin: 28px 0 12px; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .kpi { background: #f5f4f0; padding: 16px; }
    .kpi label { font-size: 11px; color: #737373; display: block; }
    .kpi strong { font-size: 22px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #e5e5e5; padding: 8px 10px; text-align: left; }
    th { background: #f5f4f0; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .chart { display: flex; align-items: flex-end; gap: 4px; height: 100px; margin: 16px 0; }
    .bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; font-size: 9px; color: #737373; }
    .bar { width: 100%; max-width: 24px; background: #171717; min-height: 2px; }
    .takeaway { border-left: 4px solid #737373; padding: 10px 14px; margin: 10px 0; background: #fafafa; }
    .takeaway.success { border-color: #059669; }
    .takeaway.warning { border-color: #d97706; }
    .takeaway.tip { border-color: #7c3aed; }
    .takeaway p { margin: 4px 0 0; font-size: 13px; color: #525252; }
    @media print { body { background: #fff; padding: 0; } .page { border: none; } }
  </style>
</head>
<body>
  <div class="page">
    <h1>${esc(title)}</h1>
    <p class="meta">${esc(period)} · 生成 ${esc(generated)}${dashboard.aiPowered ? ' · AIサマリー付き' : ''}</p>

    <h2>サマリー</h2>
    <div class="kpis">
      <div class="kpi"><label>表示</label><strong>${dashboard.totals.impressions.toLocaleString()}</strong></div>
      <div class="kpi"><label>リーチ</label><strong>${dashboard.totals.reach.toLocaleString()}</strong></div>
      <div class="kpi"><label>反応</label><strong>${dashboard.totals.engagements.toLocaleString()}</strong></div>
      <div class="kpi"><label>投稿数</label><strong>${dashboard.totals.postCount}</strong></div>
    </div>

    <h2>表示数の推移</h2>
    <div class="chart">${dailyBars}</div>

    <h2>媒体別</h2>
    <table>
      <thead><tr><th>媒体</th><th>表示</th><th>リーチ</th><th>反応</th><th>投稿</th></tr></thead>
      <tbody>${platformRows || '<tr><td colspan="5">データなし</td></tr>'}</tbody>
    </table>

    <h2>投稿ランキング</h2>
    <table>
      <thead><tr><th>#</th><th>媒体</th><th>内容</th><th>表示</th><th>反応</th></tr></thead>
      <tbody>${topRows || '<tr><td colspan="5">データなし</td></tr>'}</tbody>
    </table>

    <h2>次にやること</h2>
    ${takeawayBlocks || '<p>おすすめアクションはありません</p>'}

    <p class="meta" style="margin-top:40px">Powered by Buzzit · buzzit.app</p>
  </div>
</body>
</html>`;
}
