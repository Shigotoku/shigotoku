import sharp from 'sharp';

export interface MaskRect {
  x: number;
  y: number;
  width: number;
  height: number;
  type?: 'black' | 'blur' | 'pixelate';
}

function maskPixels(m: MaskRect, w: number, h: number) {
  const isPct = m.x <= 100 && m.y <= 100 && m.width <= 100 && m.height <= 100;
  const left = Math.max(0, Math.round(isPct ? (m.x / 100) * w : m.x));
  const top = Math.max(0, Math.round(isPct ? (m.y / 100) * h : m.y));
  const width = Math.min(w - left, Math.round(isPct ? (m.width / 100) * w : m.width));
  const height = Math.min(h - top, Math.round(isPct ? (m.height / 100) * h : m.height));
  return { left, top, width: Math.max(1, width), height: Math.max(1, height) };
}

/** マスクを画像に焼き込み（黒塗り・ぼかし・モザイク） */
export async function applyMasksToBuffer(imageBuffer: Buffer, masks: MaskRect[]): Promise<Buffer> {
  if (!masks.length) return imageBuffer;

  const meta = await sharp(imageBuffer).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) return imageBuffer;

  const composites: sharp.OverlayOptions[] = [];

  for (const m of masks) {
    const { left, top, width, height } = maskPixels(m, w, h);
    const type = m.type ?? 'black';

    if (type === 'black') {
      const overlay = await sharp({
        create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.92 } },
      })
        .png()
        .toBuffer();
      composites.push({ input: overlay, left, top });
      continue;
    }

    if (type === 'blur') {
      const region = await sharp(imageBuffer)
        .extract({ left, top, width, height })
        .blur(18)
        .toBuffer();
      composites.push({ input: region, left, top });
      continue;
    }

    const block = 12;
    const region = await sharp(imageBuffer)
      .extract({ left, top, width, height })
      .resize(Math.max(1, Math.round(width / block)), Math.max(1, Math.round(height / block)), {
        kernel: sharp.kernel.nearest,
      })
      .resize(width, height, { kernel: sharp.kernel.nearest })
      .toBuffer();
    composites.push({ input: region, left, top });
  }

  return sharp(imageBuffer).composite(composites).webp({ quality: 82 }).toBuffer();
}
