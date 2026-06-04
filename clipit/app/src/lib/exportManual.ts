import type { ManualStep } from '../types';
import { loadImageFromSrc, resolveImageDataUrl } from './imageDataUrl';

/** Word 本文の表示幅（px @96dpi ≒ A4） */
const WORD_IMG_WIDTH_PX = 650;
/** 埋め込み画像の最大ピクセル幅（高画質） */
const EMBED_MAX_WIDTH_PX = 2000;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
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
  const dataUrl = canvas.toDataURL('image/jpeg', 0.93);
  return { dataUrl, w: outW, h: outH };
}

function wordImageParagraph(dataUrl: string, widthPx: number, heightPx: number): string {
  return `<p class=MsoNormal align=center style='margin:6pt 0;text-align:center;line-height:normal'>
<span style='mso-no-proof:yes'><img width="${widthPx}" height="${heightPx}" src="${dataUrl}" alt="screenshot" style="width:${widthPx}px;height:${heightPx}px;display:block;margin:0 auto;"/></span></p>`;
}

async function buildWordHtml(title: string, steps: ManualStep[]): Promise<string> {
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  const parts: string[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i]!;
    const n = i + 1;
    parts.push(`<h2 style='margin:14pt 0 6pt;font-size:14pt;color:#c2410c;page-break-after:avoid'>${n}. ${escapeHtml(s.title || `手順 ${n}`)}</h2>`);
    if (s.screenshotUrl) {
      try {
        const { dataUrl, w, h } = await prepareEmbedImage(s.screenshotUrl, WORD_IMG_WIDTH_PX);
        parts.push(wordImageParagraph(dataUrl, w, h));
      } catch {
        parts.push(`<p class=MsoNormal><a href="${escapeHtml(s.screenshotUrl)}">画像を表示</a></p>`);
      }
    }
    if (s.instruction) {
      parts.push(`<p class=MsoNormal style='margin:0 0 12pt'>${escapeHtml(s.instruction).replace(/\n/g, '<br/>')}</p>`);
    }
    if (s.note) {
      parts.push(`<p class=MsoNormal style='margin:0 0 12pt;background:#fffbeb;padding:6pt'><i>注意: ${escapeHtml(s.note)}</i></p>`);
    }
  }

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
p.MsoNormal, h1, h2 { font-family:"Yu Gothic UI","Meiryo",sans-serif; }
img { border:none; }
</style>
</head>
<body><div class=Section1>
<h1 style='font-size:18pt;border-bottom:2pt solid #f97316;padding-bottom:6pt'>${escapeHtml(title)}</h1>
<p style='font-size:9pt;color:#64748b;margin-bottom:18pt'>クリッピットからエクスポート（${new Date().toLocaleDateString('ja-JP')}）</p>
${parts.join('\n')}
</div></body></html>`;
}

async function stepsToHtml(title: string, steps: ManualStep[], embedImages: boolean): Promise<string> {
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  const parts: string[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i]!;
    const n = i + 1;
    let imgBlock = '';
    if (s.screenshotUrl) {
      let src = s.screenshotUrl;
      if (embedImages) {
        try {
          src = (await prepareEmbedImage(s.screenshotUrl, EMBED_MAX_WIDTH_PX)).dataUrl;
        } catch {
          /* URL のまま */
        }
      }
      const safeSrc = src.startsWith('data:') ? src : escapeHtml(src);
      imgBlock = `<div style="margin:0 0 10px;line-height:0"><img src="${safeSrc}" style="display:block;width:100%;max-width:${EMBED_MAX_WIDTH_PX}px;height:auto;margin:0 auto" alt="手順${n}"/></div>`;
    }
    parts.push(`<section style="margin-bottom:24px;page-break-inside:avoid">
<h2 style="font-size:14pt;color:#c2410c;margin:0 0 8px">${n}. ${escapeHtml(s.title || `手順 ${n}`)}</h2>
${imgBlock}
<p style="margin:0 0 8px">${escapeHtml(s.instruction || '').replace(/\n/g, '<br/>')}</p>
${s.note ? `<p style="margin:0;padding:8px 12px;background:#fffbeb;font-size:10pt">注意: ${escapeHtml(s.note)}</p>` : ''}
</section>`);
  }

  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
<style>body{font-family:"Yu Gothic UI","Meiryo",sans-serif;font-size:11pt;max-width:${EMBED_MAX_WIDTH_PX}px;margin:24px auto;color:#1e293b}img{max-width:100%;height:auto}</style>
</head><body><h1>${escapeHtml(title)}</h1><p style="color:#64748b;font-size:9pt">クリッピット</p>${parts.join('')}</body></html>`;
}

export async function downloadAsWordDoc(title: string, steps: ManualStep[]) {
  const html = await buildWordHtml(title, steps);
  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  downloadBlob(blob, `${safeFilename(title)}.doc`);
}

export async function downloadAsHtml(title: string, steps: ManualStep[]) {
  const html = await stepsToHtml(title, steps, true);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  downloadBlob(blob, `${safeFilename(title)}.html`);
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
