import type { ManualStep } from '../types';
import { loadImageFromSrc, resolveImageDataUrl } from './imageDataUrl';

/** Word / 印刷 / PDF 本文の表示幅（px @96dpi ≒ A4 本文） */
const WORD_IMG_WIDTH_PX = 650;
/** 埋め込み画像の最大ピクセル幅（高画質 HTML 用） */
const EMBED_MAX_WIDTH_PX = 2000;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function downloadBlob(blob: Blob, filename: string): string {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return url;
}

function safeFilename(title: string) {
  return title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80) || 'manual';
}

/** エクスポート用にリサイズして JPEG 化 */
async function prepareEmbedImage(
  src: string,
  displayWidth: number,
): Promise<{ dataUrl: string; w: number; h: number }> {
  const raw = await resolveImageDataUrl(src);
  let img: HTMLImageElement;
  try {
    img = await loadImageFromSrc(raw);
  } catch {
    return { dataUrl: raw, w: displayWidth, h: Math.round(displayWidth * 0.6) };
  }

  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  const scale = Math.min(1, EMBED_MAX_WIDTH_PX / nw);
  const tw = Math.round(nw * scale);
  const th = Math.round(nh * scale);

  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { dataUrl: raw, w: displayWidth, h: Math.round((displayWidth * nh) / nw) };
  }
  ctx.drawImage(img, 0, 0, tw, th);
  const outW = displayWidth;
  const outH = Math.round(outW * (th / tw));
  try {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.93);
    return { dataUrl, w: outW, h: outH };
  } catch {
    return { dataUrl: raw, w: displayWidth, h: Math.round((displayWidth * nh) / nw) };
  }
}

function wordImageParagraph(dataUrl: string, widthPx: number, heightPx: number): string {
  return `<p class=MsoNormal align=center style='margin:6pt 0;text-align:center;line-height:normal'>
<span style='mso-no-proof:yes'><img width="${widthPx}" height="${heightPx}" src="${dataUrl}" alt="screenshot" style="width:${widthPx}px;height:${heightPx}px;display:block;margin:0 auto;"/></span></p>`;
}

function htmlImageBlock(dataUrl: string, widthPx: number, heightPx: number): string {
  return `<p class="step-image" style="margin:6pt 0;text-align:center;line-height:0">
<img src="${dataUrl}" width="${widthPx}" height="${heightPx}" alt="screenshot" style="display:block;width:${widthPx}px;max-width:100%;height:auto;margin:0 auto"/>
</p>`;
}

/** Word の自動番号リスト（黒丸）を避けるため h2 ではなく段落＋太字で見出しを付ける */
function stepTitleWord(n: number, title: string): string {
  return `<p class=MsoNormal style='margin:14pt 0 6pt;page-break-after:avoid;mso-outline-level:body-text'>
<b><span style='font-size:14pt;color:#c2410c'>${n}. ${escapeHtml(title)}</span></b></p>`;
}

function stepTitleHtml(n: number, title: string): string {
  return `<p class="step-title" style="margin:14pt 0 6pt;font-weight:bold;font-size:14pt;color:#c2410c">${n}. ${escapeHtml(title)}</p>`;
}

async function buildStepPartsWord(steps: ManualStep[], imgWidthPx: number): Promise<string[]> {
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  const parts: string[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i]!;
    const n = i + 1;
    const stepTitle = s.title || `手順 ${n}`;

    parts.push(stepTitleWord(n, stepTitle));

    if (s.textBeforeImage) {
      parts.push(
        `<p class=MsoNormal style='margin:0 0 8pt'>${escapeHtml(s.textBeforeImage).replace(/\n/g, '<br/>')}</p>`,
      );
    }

    if (s.screenshotUrl) {
      try {
        const { dataUrl, w, h } = await prepareEmbedImage(s.screenshotUrl, imgWidthPx);
        parts.push(wordImageParagraph(dataUrl, w, h));
      } catch {
        parts.push(`<p class=MsoNormal><a href="${escapeHtml(s.screenshotUrl)}">画像を表示</a></p>`);
      }
    }

    if (s.instruction) {
      parts.push(
        `<p class=MsoNormal style='margin:0 0 12pt'>${escapeHtml(s.instruction).replace(/\n/g, '<br/>')}</p>`,
      );
    }

    if (s.note) {
      parts.push(
        `<p class=MsoNormal style='margin:0 0 12pt;background:#fffbeb;padding:6pt'><i>注意: ${escapeHtml(s.note)}</i></p>`,
      );
    }
  }

  return parts;
}

async function buildStepPartsHtml(steps: ManualStep[], imgWidthPx: number): Promise<string[]> {
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  const parts: string[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i]!;
    const n = i + 1;
    const stepTitle = s.title || `手順 ${n}`;
    const inner: string[] = [stepTitleHtml(n, stepTitle)];

    if (s.textBeforeImage) {
      inner.push(`<p style="margin:0 0 8pt">${escapeHtml(s.textBeforeImage).replace(/\n/g, '<br/>')}</p>`);
    }

    if (s.screenshotUrl) {
      try {
        const { dataUrl, w, h } = await prepareEmbedImage(s.screenshotUrl, imgWidthPx);
        inner.push(htmlImageBlock(dataUrl, w, h));
      } catch {
        inner.push(`<p><a href="${escapeHtml(s.screenshotUrl)}">画像を表示</a></p>`);
      }
    }

    if (s.instruction) {
      inner.push(
        `<p style="margin:0 0 12pt;line-height:1.6">${escapeHtml(s.instruction).replace(/\n/g, '<br/>')}</p>`,
      );
    }

    if (s.note) {
      inner.push(
        `<p style="margin:0 0 12pt;padding:6pt 8pt;background:#fffbeb;font-style:italic">注意: ${escapeHtml(s.note)}</p>`,
      );
    }

    parts.push(`<section class="step" style="page-break-inside:avoid;margin-bottom:6pt">${inner.join('\n')}</section>`);
  }

  return parts;
}

async function buildWordHtml(title: string, steps: ManualStep[]): Promise<string> {
  const parts = await buildStepPartsWord(steps, WORD_IMG_WIDTH_PX);

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"
xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8"/>
<meta name=ProgId content=Word.Document>
<meta name=Generator content="ClipIt">
<!--[if gte mso 9]><xml>
<w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument>
<o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings>
</xml><![endif]-->
<style>
@page Section1 { size:595.3pt 841.9pt; margin:36pt 36pt 36pt 36pt; }
div.Section1 { page:Section1; }
body { font-family:"Yu Gothic UI","Meiryo",sans-serif; font-size:11pt; }
p.MsoNormal { margin:0; mso-style-name:Normal; }
p.step-title, h1 { font-family:"Yu Gothic UI","Meiryo",sans-serif; }
img { border:none; }
</style>
</head>
<body><div class=Section1>
<h1 style='font-size:18pt;border-bottom:2pt solid #f97316;padding-bottom:6pt;margin:0 0 12pt'>${escapeHtml(title)}</h1>
<p style='font-size:9pt;color:#64748b;margin-bottom:18pt'>クリッピットからエクスポート（${new Date().toLocaleDateString('ja-JP')}）</p>
${parts.join('\n')}
</div></body></html>`;
}

async function stepsToHtml(title: string, steps: ManualStep[], embedImages: boolean): Promise<string> {
  const imgWidth = embedImages ? WORD_IMG_WIDTH_PX : EMBED_MAX_WIDTH_PX;
  const parts = await buildStepPartsHtml(steps, imgWidth);

  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
<style>
@page { size: A4 portrait; margin: 12mm; }
body {
  font-family:"Yu Gothic UI","Meiryo",sans-serif;
  font-size:11pt;
  max-width:210mm;
  margin:0 auto;
  padding:12mm;
  color:#1e293b;
  background:#fff;
  box-sizing:border-box;
}
h1 {
  font-size:18pt;
  border-bottom:2pt solid #f97316;
  padding-bottom:6pt;
  margin:0 0 12pt;
}
.meta { font-size:9pt; color:#64748b; margin-bottom:18pt; }
.step { page-break-inside:avoid; break-inside:avoid; }
.step img { max-width:100%; height:auto; }
</style>
</head><body>
<h1>${escapeHtml(title)}</h1>
<p class="meta">クリッピットからエクスポート（${new Date().toLocaleDateString('ja-JP')}）</p>
${parts.join('\n')}
</body></html>`;
}

/** Word 用 HTML を iframe に載せて画像読み込み後に印刷 */
async function renderWordHtmlInIframe(html: string): Promise<HTMLIFrameElement> {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:0';
  iframe.setAttribute('title', 'ClipIt print');
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) throw new Error('印刷用フレームを作成できませんでした');

  doc.open();
  doc.write(html);
  doc.close();

  await new Promise<void>((resolve) => {
    iframe.onload = () => resolve();
    setTimeout(resolve, 5000);
  });

  const imgs = doc.querySelectorAll('img');
  await Promise.all(
    [...imgs].map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        }),
    ),
  );

  await new Promise((r) => setTimeout(r, 200));
  return iframe;
}

export async function printWordDocument(title: string, steps: ManualStep[]): Promise<void> {
  const html = await buildWordHtml(title, steps);
  const iframe = await renderWordHtmlInIframe(html);
  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();
  setTimeout(() => iframe.remove(), 60_000);
}

export async function downloadAsPdf(title: string, steps: ManualStep[]): Promise<{ filename: string }> {
  const html = await buildWordHtml(title, steps);
  const iframe = await renderWordHtmlInIframe(html);
  const target = iframe.contentDocument?.querySelector('.Section1') ?? iframe.contentDocument?.body;
  if (!target) {
    iframe.remove();
    throw new Error('PDF 用の本文を取得できませんでした');
  }

  try {
    const html2pdf = (await import('html2pdf.js')).default;
    const filename = `${safeFilename(title)}.pdf`;
    await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        // html2pdf.js の型定義が pagebreak を含まない
      } as never)
      .from(target as HTMLElement)
      .save();
    return { filename };
  } finally {
    iframe.remove();
  }
}

export async function downloadAsWordDoc(title: string, steps: ManualStep[]): Promise<{ filename: string; fallbackUrl: string }> {
  const html = await buildWordHtml(title, steps);
  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const filename = `${safeFilename(title)}.doc`;
  const fallbackUrl = downloadBlob(blob, filename);
  return { filename, fallbackUrl };
}

export async function downloadAsHtml(title: string, steps: ManualStep[]): Promise<{ filename: string; fallbackUrl: string }> {
  const html = await stepsToHtml(title, steps, true);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const filename = `${safeFilename(title)}.html`;
  const fallbackUrl = downloadBlob(blob, filename);
  return { filename, fallbackUrl };
}

export function buildExportHtml(title: string, steps: ManualStep[]): Promise<string> {
  return buildWordHtml(title, steps);
}

export function formatStepsForClipboard(title: string, steps: ManualStep[]): string {
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  const header = `# ${title}\n\n`;
  const body = sorted
    .map((s, i) => {
      const n = i + 1;
      return `## 手順 ${n}: ${s.title || `手順 ${n}`}\n${s.instruction || ''}\n${s.note ? `※ ${s.note}\n` : ''}${s.pageUrl ? `URL: ${s.pageUrl}\n` : ''}`;
    })
    .join('\n---\n\n');
  return header + body;
}

export function buildMarkdown(title: string, steps: ManualStep[]): string {
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  const lines = [`# ${title}`, '', `> クリッピットからエクスポート（${new Date().toLocaleDateString('ja-JP')}）`, ''];
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i]!;
    const n = i + 1;
    lines.push(`## ${n}. ${s.title || `手順 ${n}`}`);
    lines.push('');
    if (s.screenshotUrl) {
      lines.push(`![手順${n}](${s.screenshotUrl})`);
      lines.push('');
    }
    if (s.instruction) {
      lines.push(s.instruction);
      lines.push('');
    }
    if (s.note) {
      lines.push(`> **注意:** ${s.note}`);
      lines.push('');
    }
  }
  return lines.join('\n');
}

export async function downloadAsMarkdown(title: string, steps: ManualStep[]): Promise<{ filename: string; fallbackUrl: string }> {
  const md = buildMarkdown(title, steps);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const filename = `${safeFilename(title)}.md`;
  const fallbackUrl = downloadBlob(blob, filename);
  return { filename, fallbackUrl };
}
