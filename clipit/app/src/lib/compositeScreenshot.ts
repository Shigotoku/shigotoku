import type { MaskRect, MaskStyle, StepAnnotation } from '../types';
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
  ctx.fillStyle = 'rgba(0,0,0,0.92)';
  ctx.fillRect(x, y, mw, mh);
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

function drawAnnotation(ctx: CanvasRenderingContext2D, a: StepAnnotation, w: number, h: number) {
  if (a.kind === 'arrow' && a.endX != null && a.endY != null) {
    drawArrow(
      ctx,
      (a.x / 100) * w,
      (a.y / 100) * h,
      (a.endX / 100) * w,
      (a.endY / 100) * h,
      '#ef4444',
      Math.max(3, w / 400),
    );
    return;
  }
  if (a.kind === 'circle') {
    const size = ((a.size ?? 8) / 100) * Math.min(w, h);
    const cx = (a.x / 100) * w;
    const cy = (a.y / 100) * h;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = Math.max(3, w / 350);
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  if (a.kind === 'text' && a.text) {
    const px = (a.x / 100) * w;
    const py = (a.y / 100) * h;
    const fontSize = Math.max(14, w / 55);
    ctx.font = `bold ${fontSize}px "Noto Sans JP", sans-serif`;
    const metrics = ctx.measureText(a.text);
    const pad = 8;
    ctx.fillStyle = 'rgba(251,191,36,0.95)';
    ctx.fillRect(px - pad, py - pad, metrics.width + pad * 2, fontSize + pad * 2);
    ctx.fillStyle = '#78350f';
    ctx.fillText(a.text, px, py + fontSize - 4);
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
