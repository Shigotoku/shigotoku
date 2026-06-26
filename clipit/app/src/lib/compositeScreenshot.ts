import type { MaskRect, MaskStyle, StepAnnotation } from '../types';
import { fontFamilyCss, textCompositePx, textStyleOf } from './annotationTextStyle';
import { loadImageFromSrc, resolveImageDataUrl } from './imageDataUrl';

function drawMask(ctx: CanvasRenderingContext2D, m: MaskRect, w: number, h: number) {
  const isPct = m.x <= 100 && m.y <= 100 && m.width <= 100 && m.height <= 100;
  const x = isPct ? (m.x / 100) * w : m.x;
  const y = isPct ? (m.y / 100) * h : m.y;
  const mw = isPct ? (m.width / 100) * w : m.width;
  const mh = isPct ? (m.height / 100) * h : m.height;

  if (m.type === 'pixelate') {
    const block = 12;
    ctx.fillStyle = '#6b7280';
    for (let py = y; py < y + mh; py += block) {
      for (let px = x; px < x + mw; px += block) {
        ctx.fillRect(px, py, block, block);
      }
    }
    return;
  }
  if (m.type === 'blur') {
    ctx.fillStyle = 'rgba(100,116,139,0.75)';
    ctx.fillRect(x, y, mw, mh);
    return;
  }
  if (m.type === 'highlight') {
    ctx.fillStyle = 'rgba(250,204,21,0.45)';
    ctx.fillRect(x, y, mw, mh);
    ctx.strokeStyle = 'rgba(234,179,8,0.85)';
    ctx.lineWidth = Math.max(2, Math.min(mw, mh) / 40);
    ctx.strokeRect(x, y, mw, mh);
    return;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.92)';
  ctx.fillRect(x, y, mw, mh);
}

function strokeColorOf(a: StepAnnotation): string {
  return a.strokeColor ?? '#ef4444';
}

function strokeWidthPx(a: StepAnnotation, w: number): number {
  const base = a.strokeWidth ?? 3;
  return Math.max(2, base * (w / 800));
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  lineWidth: number,
) {
  const head = Math.max(10, lineWidth * 3);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function wrapTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];
  for (const para of paragraphs) {
    if (!para) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const ch of para) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = ch;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : [''];
}

function drawAnnotation(ctx: CanvasRenderingContext2D, a: StepAnnotation, w: number, h: number) {
  if (a.kind === 'arrow' && a.endX != null && a.endY != null) {
    drawArrow(
      ctx,
      (a.x / 100) * w,
      (a.y / 100) * h,
      (a.endX / 100) * w,
      (a.endY / 100) * h,
      strokeColorOf(a),
      strokeWidthPx(a, w),
    );
    return;
  }
  if (a.kind === 'circle') {
    const size = ((a.size ?? 8) / 100) * Math.min(w, h);
    const cx = (a.x / 100) * w;
    const cy = (a.y / 100) * h;
    ctx.strokeStyle = strokeColorOf(a);
    ctx.lineWidth = strokeWidthPx(a, w);
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  if (a.kind === 'badge') {
    const size = ((a.size ?? 8) / 100) * Math.min(w, h);
    const cx = (a.x / 100) * w;
    const cy = (a.y / 100) * h;
    const fill = a.fillColor ?? strokeColorOf(a);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.fill();
    if (a.strokeColor && (a.strokeWidth ?? 0) > 0) {
      ctx.strokeStyle = a.strokeColor;
      ctx.lineWidth = strokeWidthPx(a, w);
      ctx.stroke();
    }
    const label = a.text ?? '1';
    ctx.fillStyle = a.textColor ?? '#ffffff';
    ctx.font = `bold ${Math.max(10, Math.round(size * 0.52))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy + size * 0.02);
    return;
  }
  if (a.kind === 'text' && a.text) {
    const px = (a.x / 100) * w;
    const py = (a.y / 100) * h;
    const style = textStyleOf(a);
    const fontSize = textCompositePx(style.fontSize, w);
    const borderPx = Math.max(1, Math.round(style.borderWidth * (w / 800)));
    const weight = style.fontWeight === 'bold' ? 'bold' : 'normal';
    ctx.font = `${weight} ${fontSize}px ${fontFamilyCss(style.fontFamily)}`;
    const pad = Math.max(6, fontSize * 0.35);
    const innerW = a.boxWidthPct != null ? (a.boxWidthPct / 100) * w - pad * 2 : ctx.measureText(a.text).width;
    const lines = wrapTextLines(ctx, a.text, Math.max(40, innerW));
    const lineH = fontSize * 1.3;
    const contentH = lines.length * lineH;
    const boxW = a.boxWidthPct != null ? (a.boxWidthPct / 100) * w : ctx.measureText(a.text).width + pad * 2;
    const boxH = a.boxHeightPct != null ? (a.boxHeightPct / 100) * h : contentH + pad * 2;

    ctx.fillStyle = style.bgColor;
    ctx.fillRect(px - pad, py - pad, boxW, boxH);

    if (style.borderColor && borderPx > 0) {
      ctx.strokeStyle = style.borderColor;
      ctx.lineWidth = borderPx;
      ctx.strokeRect(px - pad, py - pad, boxW, boxH);
    }

    ctx.fillStyle = style.textColor;
    lines.forEach((line, i) => {
      ctx.fillText(line, px, py + fontSize + i * lineH - pad * 0.3);
    });
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        canvas.toBlob(
          (jpeg) => (jpeg ? resolve(jpeg) : reject(new Error('画像の生成に失敗しました'))),
          'image/jpeg',
          quality,
        );
      },
      'image/webp',
      quality,
    );
  });
}

/** マスク・注釈を焼き込んだ WebP（非対応時は JPEG） */
export async function compositeScreenshot(
  screenshotUrl: string,
  masks: MaskRect[],
  annotations: StepAnnotation[],
  quality = 0.9,
): Promise<Blob> {
  const dataUrl = await resolveImageDataUrl(screenshotUrl);
  const img = await loadImageFromSrc(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas を初期化できません');
  ctx.drawImage(img, 0, 0);
  for (const m of masks) drawMask(ctx, m, w, h);
  for (const a of annotations) drawAnnotation(ctx, a, w, h);
  return canvasToBlob(canvas, quality);
}
