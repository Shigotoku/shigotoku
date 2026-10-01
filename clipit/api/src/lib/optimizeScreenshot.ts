import sharp from 'sharp';

export const SCREENSHOT_CACHE_CONTROL = 'public, max-age=31536000, immutable';
export const SCREENSHOT_MAX_EDGE = 1280;
export const SCREENSHOT_WEBP_QUALITY = 82;

/** 拡張記録・マスク焼き込みなどサーバー側アップロード前の最適化 */
export async function optimizeScreenshotBuffer(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({
      width: SCREENSHOT_MAX_EDGE,
      height: SCREENSHOT_MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: SCREENSHOT_WEBP_QUALITY })
    .toBuffer();
}
