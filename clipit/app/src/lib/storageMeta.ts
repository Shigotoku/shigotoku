/** Firebase Storage アップロード時のキャッシュ（再閲覧の転送量削減） */
export const SCREENSHOT_CACHE_CONTROL = 'public, max-age=31536000, immutable';

export function mimeFromStoragePath(path: string): string {
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.png')) return 'image/png';
  return 'image/jpeg';
}
