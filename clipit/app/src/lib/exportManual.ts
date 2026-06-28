import type { ManualStep } from '../types';
import { loadImageFromSrc, resolveImageDataUrl } from './imageDataUrl';
import { buildTocItems, stepAnchorId } from './manualToc';
import { stepImageAlign, stepImageWidthPct, stepUsesFloatLayout } from './stepLayout';

const WORD_BODY_WIDTH_PX = 650;
const EMBED_MAX_WIDTH_PX = 2000;

export interface ManualExportOptions {
  description?: string;
  tocEnabled?: boolean;
}

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

function imageBorderStyle(step: ManualStep): string {
  const w = step.imageBorderWidth ?? 0;
  if (w <= 0) return '';
  const c = step.imageBorderColor || '#94a3b8';
  return `border:${w}px solid ${c};`;
}

function stepDisplayWidthPx(step: ManualStep, bodyWidth = WORD_BODY_WIDTH_PX): number {
  return Math.round(bodyWidth * (stepImageWidthPct(step) / 100));
}

function buildTocBlock(steps: ManualStep[], word = false): string {
  const items = buildTocItems(steps);
  if (!items.length) return '';
  const lines = items.map(
    (item) =>
      word
        ? `<p class=MsoNormal style='margin:2pt 0'><a href="#${item.anchor}">${item.order}. ${escapeHtml(item.title)}</a></p>`
        : `<li style="margin:4pt 0"><a href="#${item.anchor}" style="color:#c2410c;text-decoration:none">${item.order}. ${escapeHtml(item.title)}</a></li>`,
  );
  if (word) {
    return `<p class=MsoNormal style='margin:12pt 0 6pt'><b><span style='font-size:13pt'>目次</span></b></p>${lines.join('\n')}<p class=MsoNormal style='margin:12pt 0'>&nbsp;</p>`;
  }
  return `<nav class="toc" style="margin:12pt 0 18pt;padding:10pt 12pt;background:#f8fafc;border:1pt solid #e2e8f0;border-radius:4pt"><p style="margin:0 0 8pt;font-weight:bold;font-size:13pt">目次</p><ol style="margin:0;padding-left:18pt">${lines.join('\n')}</ol></nav>`;
}

function descriptionBlock(description: string | undefined, word = false): string {
  if (!description?.trim()) return '';
  const body = escapeHtml(description.trim()).replace(/\n/g, '<br/>');
  if (word) {
    return `<p class=MsoNormal style='margin:0 0 14pt;line-height:1.6'>${body}</p>`;
  }
  return `<div class="manual-description" style="margin:0 0 14pt;line-height:1.6">${body}</div>`;
}

function wordImageParagraph(dataUrl: string, widthPx: number, heightPx: number, borderStyle = ''): string {
  const style = borderStyle
    ? `${borderStyle}width:${widthPx}px;height:${heightPx}px;display:block;margin:0 auto;`
    : `width:${widthPx}px;height:${heightPx}px;display:block;margin:0 auto;`;
  return `<p class=MsoNormal align=center style='margin:6pt 0;text-align:center;line-height:normal'>
<span style='mso-no-proof:yes'><img width="${widthPx}" height="${heightPx}" src="${dataUrl}" alt="screenshot" style="${style}"/></span></p>`;
}

function htmlImageBlock(dataUrl: string, widthPx: number, heightPx: number, borderStyle = ''): string {
  const extra = borderStyle ? `${borderStyle}box-sizing:border-box;` : '';
  return `<p class="step-image" style="margin:6pt 0;text-align:center;line-height:0">
<img src="${dataUrl}" width="${widthPx}" height="${heightPx}" alt="screenshot" style="display:block;width:${widthPx}px;max-width:100%;height:auto;margin:0 auto;${extra}"/>
</p>`;
}

function stepTitleWord(n: number, title: string, anchor: string): string {
  return `<p id="${anchor}" class=MsoNormal style='margin:14pt 0 6pt;page-break-after:avoid'>
<b><span style='font-size:14pt;color:#c2410c'>${n}. ${escapeHtml(title)}</span></b></p>`;
}

function stepTitleHtml(n: number, title: string, anchor: string): string {
  return `<p id="${anchor}" class="step-title" style="margin:14pt 0 6pt;font-weight:bold;font-size:14pt;color:#c2410c">${n}. ${escapeHtml(title)}</p>`;
}

function warningBanner(text: string, word: boolean): string {
  if (word) {
    return `<p class=MsoNormal align=center style='margin:0 0 6pt;text-align:center;background:#f59e0b;color:white;padding:4pt;font-weight:bold'>${escapeHtml(text)}</p>`;
  }
  return `<p style="margin:0 0 6pt;text-align:center;background:#f59e0b;color:white;padding:4pt 8pt;font-weight:bold;border-radius:4pt">${escapeHtml(text)}</p>`;
}

async function renderStepImage(step: ManualStep, imgWidthPx: number, word: boolean): Promise<string> {
  if (!step.screenshotUrl) return '';
  const borderStyle = imageBorderStyle(step);
  try {
    const { dataUrl, w, h } = await prepareEmbedImage(step.screenshotUrl, imgWidthPx);
    return word ? wordImageParagraph(dataUrl, w, h, borderStyle) : htmlImageBlock(dataUrl, w, h, borderStyle);
  } catch {
    const link = `<a href="${escapeHtml(step.screenshotUrl)}">画像を表示</a>`;
    return word ? `<p class=MsoNormal>${link}</p>` : `<p>${link}</p>`;
  }
}

async function buildSingleStepContent(s: ManualStep, n: number, word: boolean): Promise<string[]> {
  const stepTitle = s.title || `手順 ${n}`;
  const anchor = stepAnchorId(s.order);
  const parts: string[] = [word ? stepTitleWord(n, stepTitle, anchor) : stepTitleHtml(n, stepTitle, anchor)];

  if (s.type === 'warning') parts.push(warningBanner('注意が必要な手順', word));
  if (s.type === 'ng_example') parts.push(warningBanner('NG例 — この操作はしないでください', word));

  if (s.textBeforeImage) {
    parts.push(
      word
        ? `<p class=MsoNormal style='margin:0 0 8pt'>${escapeHtml(s.textBeforeImage).replace(/\n/g, '<br/>')}</p>`
        : `<p style="margin:0 0 8pt">${escapeHtml(s.textBeforeImage).replace(/\n/g, '<br/>')}</p>`,
    );
  }

  const imgW = stepDisplayWidthPx(s);
  const sideBySide = Boolean(s.screenshotUrl) && stepUsesFloatLayout(s);
  const imgHtml = await renderStepImage(s, imgW, word);

  if (sideBySide) {
    const align = stepImageAlign(s);
    const textCell = s.instruction
      ? word
        ? `<p class=MsoNormal style='margin:0'>${escapeHtml(s.instruction).replace(/\n/g, '<br/>')}</p>`
        : `<p style="margin:0;line-height:1.6">${escapeHtml(s.instruction).replace(/\n/g, '<br/>')}</p>`
      : '';
    const pct = stepImageWidthPct(s);
    const imgFirst = align !== 'right';
    if (word) {
      parts.push(
        `<table border=0 cellspacing=0 cellpadding=6 width=100% style='margin:6pt 0'><tr>${
          imgFirst
            ? `<td width="${pct}%" valign=top>${imgHtml}</td><td valign=top>${textCell}</td>`
            : `<td valign=top>${textCell}</td><td width="${pct}%" valign=top>${imgHtml}</td>`
        }</tr></table>`,
      );
    } else {
      parts.push(
        `<table width="100%" style="margin:6pt 0;border-collapse:collapse"><tr>${
          imgFirst
            ? `<td width="${pct}%" valign="top">${imgHtml}</td><td valign="top">${textCell}</td>`
            : `<td valign="top">${textCell}</td><td width="${pct}%" valign="top">${imgHtml}</td>`
        }</tr></table>`,
      );
    }
  } else {
    if (imgHtml) parts.push(imgHtml);
    if (s.instruction) {
      parts.push(
        word
          ? `<p class=MsoNormal style='margin:0 0 12pt'>${escapeHtml(s.instruction).replace(/\n/g, '<br/>')}</p>`
          : `<p style="margin:0 0 12pt;line-height:1.6">${escapeHtml(s.instruction).replace(/\n/g, '<br/>')}</p>`,
      );
    }
  }

  if (s.note) {
    parts.push(
      word
        ? `<p class=MsoNormal style='margin:0 0 12pt;background:#fffbeb;padding:6pt'><i>注意: ${escapeHtml(s.note)}</i></p>`
        : `<p style="margin:0 0 12pt;padding:6pt 8pt;background:#fffbeb;font-style:italic">注意: ${escapeHtml(s.note)}</p>`,
    );
  }

  return parts;
}

async function buildStepPartsWord(steps: ManualStep[]): Promise<string[]> {
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    parts.push(...(await buildSingleStepContent(sorted[i]!, i + 1, true)));
  }
  return parts;
}

async function buildStepPartsHtml(steps: ManualStep[]): Promise<string[]> {
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const inner = await buildSingleStepContent(sorted[i]!, i + 1, false);
    parts.push(
      `<section class="step" id="${stepAnchorId(sorted[i]!.order)}" style="page-break-inside:avoid;margin-bottom:6pt">${inner.join('\n')}</section>`,
    );
  }
  return parts;
}

export async function buildWordHtml(
  title: string,
  steps: ManualStep[],
  options: ManualExportOptions = {},
): Promise<string> {
  const stepParts = await buildStepPartsWord(steps);
  const header = [
    descriptionBlock(options.description, true),
    options.tocEnabled ? buildTocBlock(steps, true) : '',
  ].filter(Boolean);

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
img { max-width:100%; height:auto; }
</style>
</head>
<body><div class=Section1>
<h1 style='font-size:18pt;border-bottom:2pt solid #f97316;padding-bottom:6pt;margin:0 0 12pt'>${escapeHtml(title)}</h1>
<p style='font-size:9pt;color:#64748b;margin-bottom:18pt'>クリッピットからエクスポート（${new Date().toLocaleDateString('ja-JP')}）</p>
${header.join('\n')}
${stepParts.join('\n')}
</div></body></html>`;
}

export async function buildPreviewHtml(
  title: string,
  steps: ManualStep[],
  options: ManualExportOptions = {},
): Promise<string> {
  const stepParts = await buildStepPartsHtml(steps);
  const header = [
    descriptionBlock(options.description, false),
    options.tocEnabled ? buildTocBlock(steps, false) : '',
  ].filter(Boolean);

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
a { color:#c2410c; }
</style>
</head><body>
<h1>${escapeHtml(title)}</h1>
<p class="meta">クリッピットからエクスポート（${new Date().toLocaleDateString('ja-JP')}）</p>
${header.join('\n')}
${stepParts.join('\n')}
</body></html>`;
}

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

export async function printWordDocument(
  title: string,
  steps: ManualStep[],
  options: ManualExportOptions = {},
): Promise<void> {
  const html = await buildWordHtml(title, steps, options);
  const iframe = await renderWordHtmlInIframe(html);
  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();
  setTimeout(() => iframe.remove(), 60_000);
}

export async function downloadAsPdf(
  title: string,
  steps: ManualStep[],
  options: ManualExportOptions = {},
): Promise<{ filename: string }> {
  const html = await buildWordHtml(title, steps, options);
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
      } as never)
      .from(target as HTMLElement)
      .save();
    return { filename };
  } finally {
    iframe.remove();
  }
}

export async function downloadAsWordDoc(
  title: string,
  steps: ManualStep[],
  options: ManualExportOptions = {},
): Promise<{ filename: string; fallbackUrl: string }> {
  const html = await buildWordHtml(title, steps, options);
  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const filename = `${safeFilename(title)}.doc`;
  const fallbackUrl = downloadBlob(blob, filename);
  return { filename, fallbackUrl };
}

export async function downloadAsHtml(
  title: string,
  steps: ManualStep[],
  options: ManualExportOptions = {},
): Promise<{ filename: string; fallbackUrl: string }> {
  const html = await buildPreviewHtml(title, steps, options);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const filename = `${safeFilename(title)}.html`;
  const fallbackUrl = downloadBlob(blob, filename);
  return { filename, fallbackUrl };
}

export function buildExportHtml(
  title: string,
  steps: ManualStep[],
  options: ManualExportOptions = {},
): Promise<string> {
  return buildWordHtml(title, steps, options);
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

export async function downloadAsMarkdown(
  title: string,
  steps: ManualStep[],
): Promise<{ filename: string; fallbackUrl: string }> {
  const md = buildMarkdown(title, steps);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const filename = `${safeFilename(title)}.md`;
  const fallbackUrl = downloadBlob(blob, filename);
  return { filename, fallbackUrl };
}
