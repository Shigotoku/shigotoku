/**
 * SNS解析レポート PDF（日本語フォント対応）
 */
import PDFDocument from 'pdfkit';
import type { InsightsDashboard } from './insightsDashboard';

const PLATFORM_LABEL: Record<string, string> = {
  x: 'X',
  instagram: 'Instagram',
  facebook: 'Facebook',
  threads: 'Threads',
  line: 'LINE',
};

const NOTO_FONT_URL =
  'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.2.5/files/noto-sans-jp-japanese-400-normal.ttf';

let cachedFont: Buffer | null = null;

async function loadJapaneseFont(): Promise<Buffer> {
  if (cachedFont) return cachedFont;
  const res = await fetch(NOTO_FONT_URL);
  if (!res.ok) throw new Error('日本語フォントの取得に失敗しました');
  cachedFont = Buffer.from(await res.arrayBuffer());
  return cachedFont;
}

function collectPdfBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

export async function buildInsightsPdfBuffer(
  dashboard: InsightsDashboard,
  opts: { businessName?: string } = {},
): Promise<Buffer> {
  const font = await loadJapaneseFont();
  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  const done = collectPdfBuffer(doc);

  doc.registerFont('Noto', font);
  doc.font('Noto');

  const title = opts.businessName ?? 'SNS解析レポート';
  const generated = new Date().toLocaleString('ja-JP');

  doc.fontSize(22).text(title, { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor('#737373').text(`直近 ${dashboard.periodDays} 日 · 生成 ${generated}`);
  if (dashboard.aiPowered) {
    doc.text('AIサマリー付き');
  }
  doc.fillColor('#000000');
  doc.moveDown(1);

  doc.fontSize(14).text('サマリー', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  const kpis = [
    `表示: ${dashboard.totals.impressions.toLocaleString()}`,
    `リーチ: ${dashboard.totals.reach.toLocaleString()}`,
    `エンゲージメント: ${dashboard.totals.engagements.toLocaleString()}`,
    `投稿数: ${dashboard.totals.postCount}`,
    `クリック: ${dashboard.totals.clicks}`,
    `LINE追加: ${dashboard.totals.lineSignups}`,
    `売上寄与: ¥${dashboard.totals.revenue.toLocaleString()}`,
  ];
  for (const line of kpis) doc.text(line);
  doc.moveDown(1);

  doc.fontSize(14).text('媒体別', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10);
  for (const [key, v] of Object.entries(dashboard.byPlatform)) {
    doc.text(
      `${PLATFORM_LABEL[key] ?? key}: 表示 ${v.impressions.toLocaleString()} / リーチ ${v.reach.toLocaleString()} / 反応 ${v.engagements.toLocaleString()} / 投稿 ${v.postCount}`,
    );
  }
  if (Object.keys(dashboard.byPlatform).length === 0) {
    doc.text('データなし');
  }
  doc.moveDown(1);

  doc.fontSize(14).text('投稿ランキング', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10);
  for (const [i, p] of dashboard.topPosts.slice(0, 8).entries()) {
    const preview = p.preview.slice(0, 50) + (p.preview.length > 50 ? '…' : '');
    doc.text(
      `${i + 1}. [${PLATFORM_LABEL[p.platform] ?? p.platform}] ${preview} — 表示 ${p.impressions.toLocaleString()} / 反応 ${p.engagement}`,
    );
  }
  if (dashboard.topPosts.length === 0) doc.text('データなし');
  doc.moveDown(1);

  doc.fontSize(14).text('次にやること', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10);
  for (const t of dashboard.takeaways.slice(0, 5)) {
    doc.text(`• ${t.title}`);
    doc.text(`  ${t.body}`, { indent: 12 });
    doc.moveDown(0.3);
  }
  if (dashboard.takeaways.length === 0) doc.text('おすすめアクションはありません');

  doc.moveDown(2);
  doc.fontSize(9).fillColor('#A3A3A3').text('Powered by Buzzit', { align: 'right' });

  doc.end();
  return done;
}
