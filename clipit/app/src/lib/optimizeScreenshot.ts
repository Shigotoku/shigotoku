/** 閲覧品質を保ちつつ Storage 転送量を抑える（最大辺・WebP） */
export const SCREENSHOT_MAX_EDGE = 1280;
export const SCREENSHOT_WEBP_QUALITY = 0.82;

function canvasToWebpBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        canvas.toBlob(
          (jpeg) => (jpeg ? resolve(jpeg) : reject(new Error('画像の圧縮に失敗しました'))),
          'image/jpeg',
          0.85,
        );
      },
      'image/webp',
      SCREENSHOT_WEBP_QUALITY,
    );
  });
}

/** アップロード前にリサイズ＋WebP 化（PNG/JPEG そのまま保存しない） */
export async function optimizeScreenshotFile(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  const bitmap = await createImageBitmap(file);
  try {
    const max = Math.max(bitmap.width, bitmap.height);
    const scale = max > SCREENSHOT_MAX_EDGE ? SCREENSHOT_MAX_EDGE / max : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas を初期化できません');
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await canvasToWebpBlob(canvas);
    const base = file.name.replace(/\.[^.]+$/, '') || 'screenshot';
    const type = blob.type || 'image/webp';
    const ext = type.includes('webp') ? 'webp' : 'jpg';
    return new File([blob], `${base}.${ext}`, { type });
  } finally {
    bitmap.close();
  }
}
