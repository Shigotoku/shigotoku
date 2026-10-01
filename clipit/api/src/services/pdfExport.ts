import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import sharp from 'sharp';
import { getStorage } from 'firebase-admin/storage';
import { assertManualAccess } from './manuals.js';
import { applyMasksToBuffer, type MaskRect } from './imageMasks.js';
import { fetchImageBuffer, savePdfObject } from '../lib/storageImage.js';

interface StepRow {
  order: number;
  title: string;
  instruction: string;
  note: string;
  screenshotUrl?: string;
  masks?: MaskRect[];
}

const FONT_URL =
  'https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@main/Sans/OTF/Japanese/NotoSansCJKjp-Regular.otf';

let cachedFont: Uint8Array | null = null;

async function loadJapaneseFont(): Promise<Uint8Array> {
  if (cachedFont) return cachedFont;
  const res = await fetch(FONT_URL);
  if (!res.ok) throw Object.assign(new Error('日本語フォントの読み込みに失敗しました'), { status: 500 });
  cachedFont = new Uint8Array(await res.arrayBuffer());
  return cachedFont;
}

function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const ch of text) {
    if (cur.length >= maxChars && ch !== '\n') {
      lines.push(cur);
      cur = ch;
    } else {
      cur += ch;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

export async function generateManualPdf(
  manualId: string,
  uid: string,
): Promise<{ pdfUrl: string; pageCount: number }> {
  const { manualRef, manual } = await assertManualAccess(manualId, uid);
  const title = (manual.title as string) || 'マニュアル';

  const stepsSnap = await manualRef.collection('steps').orderBy('order').get();
  const steps: StepRow[] = stepsSnap.docs.map((d) => {
    const s = d.data();
    return {
      order: s.order as number,
      title: (s.title as string) || '',
      instruction: (s.instruction as string) || '',
      note: (s.note as string) || '',
      screenshotUrl: s.screenshotUrl as string | undefined,
      masks: s.masks as MaskRect[] | undefined,
    };
  });

  const fontBytes = await loadJapaneseFont();
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes);

  const pageW = 595;
  const pageH = 842;
  const margin = 48;
  const contentW = pageW - margin * 2;
  let pageCount = 0;

  const addPage = () => {
    pdf.addPage([pageW, pageH]);
    pageCount += 1;
    return pdf.getPages()[pageCount - 1]!;
  };

  let page = addPage();
  let y = pageH - margin;

  const drawLine = (text: string, size: number, color = rgb(0, 0, 0), bold = false) => {
    const maxChars = Math.floor(contentW / (size * 0.55));
    for (const line of wrapText(text, maxChars)) {
      if (y < margin + size * 2) {
        page = addPage();
        y = pageH - margin;
      }
      page.drawText(line, { x: margin, y: y - size, size, font, color });
      y -= size * 1.45;
    }
  };

  drawLine(title, 16, rgb(0.1, 0.1, 0.1));
  drawLine(`クリッピット · ${new Date().toLocaleDateString('ja-JP')}`, 8, rgb(0.4, 0.45, 0.5));
  y -= 8;

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]!;
    const n = i + 1;

    if (y < margin + 200) {
      page = addPage();
      y = pageH - margin;
    }

    drawLine(`${n}. ${s.title || `手順 ${n}`}`, 12, rgb(0.76, 0.25, 0.05));
    y -= 4;

    if (s.screenshotUrl) {
      try {
        let imgBuf = await fetchImageBuffer(s.screenshotUrl);
        if (s.masks?.length) imgBuf = await applyMasksToBuffer(imgBuf, s.masks);
        const jpgBuf = await sharp(imgBuf).jpeg({ quality: 90 }).toBuffer();
        const embedded = await pdf.embedJpg(jpgBuf);
        const dims = embedded.scale(1);
        const maxImgW = contentW;
        const maxImgH = 240;
        const scale = Math.min(maxImgW / dims.width, maxImgH / dims.height, 1);
        const w = dims.width * scale;
        const h = dims.height * scale;

        if (y - h < margin) {
          page = addPage();
          y = pageH - margin;
        }
        page.drawImage(embedded, {
          x: margin + (contentW - w) / 2,
          y: y - h,
          width: w,
          height: h,
        });
        y -= h + 10;
      } catch {
        drawLine('（画像を表示できませんでした）', 8, rgb(0.6, 0.6, 0.6));
      }
    }

    if (s.instruction) drawLine(s.instruction, 10);
    if (s.note) drawLine(`注意: ${s.note}`, 9, rgb(0.57, 0.25, 0.05));
    y -= 12;
  }

  const pdfBuffer = Buffer.from(await pdf.save());
  const bucket = getStorage().bucket();
  const pdfUrl = await savePdfObject(bucket, `clipit/manuals/${manualId}/export-${Date.now()}`, pdfBuffer);
  return { pdfUrl, pageCount };
}
