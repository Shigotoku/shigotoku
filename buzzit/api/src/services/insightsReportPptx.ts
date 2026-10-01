/**
 * SNS解析レポート PowerPoint（.pptx）— SocialDog レポート相当
 */
import PptxGenJS from 'pptxgenjs';
import type { InsightsDashboard } from './insightsDashboard';

const PLATFORM_LABEL: Record<string, string> = {
  x: 'X',
  instagram: 'Instagram',
  facebook: 'Facebook',
  threads: 'Threads',
  line: 'LINE',
};

export function reportFileBaseName(platform: string, date = new Date()): string {
  const d = date.toISOString().slice(0, 10);
  return `buzzit-sns-report-${platform}-${d}`;
}

export async function buildInsightsPptxBuffer(
  dashboard: InsightsDashboard,
  opts: { businessName?: string } = {},
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.author = 'Buzzit';
  pptx.title = opts.businessName ? `${opts.businessName} SNS解析` : 'Buzzit SNS解析レポート';
  pptx.layout = 'LAYOUT_16x9';

  const title = opts.businessName ?? 'SNS解析レポート';
  const generated = new Date().toLocaleString('ja-JP');

  // --- 1. 表紙 + KPI ---
  const s1 = pptx.addSlide();
  s1.addText(title, { x: 0.6, y: 0.8, w: 8.8, h: 0.9, fontSize: 32, bold: true, color: '171717' });
  s1.addText(`直近 ${dashboard.periodDays} 日 · 生成 ${generated}`, {
    x: 0.6,
    y: 1.7,
    w: 8.8,
    fontSize: 14,
    color: '737373',
  });
  if (dashboard.aiPowered) {
    s1.addText('AIサマリー付き', { x: 0.6, y: 2.2, fontSize: 12, color: '7C3AED' });
  }

  s1.addTable(
    [
      [
        { text: '指標', options: { bold: true, fill: { color: 'F5F4F0' } } },
        { text: '値', options: { bold: true, fill: { color: 'F5F4F0' } } },
      ],
      [
        { text: '表示（インプレッション）' },
        { text: dashboard.totals.impressions.toLocaleString() },
      ],
      [{ text: 'リーチ' }, { text: dashboard.totals.reach.toLocaleString() }],
      [
        { text: 'エンゲージメント' },
        { text: dashboard.totals.engagements.toLocaleString() },
      ],
      [{ text: '投稿数' }, { text: String(dashboard.totals.postCount) }],
      [{ text: 'クリック' }, { text: String(dashboard.totals.clicks) }],
      [{ text: 'LINE追加' }, { text: String(dashboard.totals.lineSignups) }],
      [
        { text: '売上寄与' },
        { text: `¥${dashboard.totals.revenue.toLocaleString()}` },
      ],
    ],
    { x: 0.6, y: 2.8, w: 8.8, colW: [4, 4.8], fontSize: 13, border: { type: 'solid', color: 'E5E5E5' } },
  );

  // --- 2. 媒体別 ---
  const s2 = pptx.addSlide();
  s2.addText('媒体別パフォーマンス', { x: 0.6, y: 0.5, w: 8.8, fontSize: 22, bold: true });
  const platformRows: PptxGenJS.TableRow[] = [
    [
      { text: '媒体', options: { bold: true, fill: { color: 'F5F4F0' } } },
      { text: '表示', options: { bold: true, fill: { color: 'F5F4F0' } } },
      { text: 'リーチ', options: { bold: true, fill: { color: 'F5F4F0' } } },
      { text: '反応', options: { bold: true, fill: { color: 'F5F4F0' } } },
      { text: '投稿', options: { bold: true, fill: { color: 'F5F4F0' } } },
    ],
  ];
  for (const [key, v] of Object.entries(dashboard.byPlatform)) {
    platformRows.push([
      { text: PLATFORM_LABEL[key] ?? key },
      { text: v.impressions.toLocaleString() },
      { text: v.reach.toLocaleString() },
      { text: v.engagements.toLocaleString() },
      { text: String(v.postCount) },
    ]);
  }
  if (platformRows.length === 1) {
    platformRows.push([
      { text: '—' },
      { text: '—' },
      { text: '—' },
      { text: '—' },
      { text: '—' },
    ]);
  }
  s2.addTable(platformRows, {
    x: 0.6,
    y: 1.3,
    w: 8.8,
    fontSize: 12,
    border: { type: 'solid', color: 'E5E5E5' },
  });

  // 簡易棒グラフ（表示数）
  const chartData = Object.entries(dashboard.byPlatform).map(([key, v]) => ({
    name: PLATFORM_LABEL[key] ?? key,
    labels: [PLATFORM_LABEL[key] ?? key],
    values: [v.impressions],
  }));
  if (chartData.length > 0) {
    s2.addChart(pptx.ChartType.bar, chartData, {
      x: 0.6,
      y: 3.8,
      w: 8.8,
      h: 2.0,
      showTitle: true,
      title: '媒体別インプレッション',
      showLegend: false,
    });
  }

  // --- 3. 投稿ランキング ---
  const s3 = pptx.addSlide();
  s3.addText('投稿ランキング TOP10', { x: 0.6, y: 0.5, w: 8.8, fontSize: 22, bold: true });
  const rankRows: PptxGenJS.TableRow[] = [
    [
      { text: '#', options: { bold: true, fill: { color: 'F5F4F0' } } },
      { text: '媒体', options: { bold: true, fill: { color: 'F5F4F0' } } },
      { text: '内容', options: { bold: true, fill: { color: 'F5F4F0' } } },
      { text: '表示', options: { bold: true, fill: { color: 'F5F4F0' } } },
      { text: '反応', options: { bold: true, fill: { color: 'F5F4F0' } } },
    ],
  ];
  for (const [i, p] of dashboard.topPosts.slice(0, 10).entries()) {
    rankRows.push([
      { text: String(i + 1) },
      { text: PLATFORM_LABEL[p.platform] ?? p.platform },
      { text: p.preview.slice(0, 40) + (p.preview.length > 40 ? '…' : '') },
      { text: p.impressions.toLocaleString() },
      { text: String(p.engagement) },
    ]);
  }
  if (rankRows.length === 1) {
    rankRows.push([
      { text: '—' },
      { text: '—' },
      { text: 'データなし' },
      { text: '—' },
      { text: '—' },
    ]);
  }
  s3.addTable(rankRows, {
    x: 0.6,
    y: 1.2,
    w: 8.8,
    colW: [0.5, 1.2, 4.5, 1.3, 1.3],
    fontSize: 11,
    border: { type: 'solid', color: 'E5E5E5' },
  });

  // --- 4. 次にやること ---
  const s4 = pptx.addSlide();
  s4.addText('次にやること', { x: 0.6, y: 0.5, w: 8.8, fontSize: 22, bold: true });
  let y = 1.2;
  for (const t of dashboard.takeaways.slice(0, 5)) {
    const color = t.type === 'success' ? '059669' : t.type === 'warning' ? 'D97706' : '7C3AED';
    s4.addText(t.title, { x: 0.6, y, w: 8.8, fontSize: 14, bold: true, color });
    s4.addText(t.body, { x: 0.6, y: y + 0.35, w: 8.8, fontSize: 12, color: '525252' });
    y += 1.0;
  }
  if (dashboard.takeaways.length === 0) {
    s4.addText('おすすめアクションはありません', { x: 0.6, y: 1.2, fontSize: 12, color: '737373' });
  }

  s4.addText('Powered by Buzzit', {
    x: 0.6,
    y: 5.0,
    w: 8.8,
    fontSize: 10,
    color: 'A3A3A3',
    align: 'right',
  });

  const out = await pptx.write({ outputType: 'nodebuffer' });
  return Buffer.from(out as ArrayBuffer);
}
