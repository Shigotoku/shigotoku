import { fetchImageBuffer } from '../lib/storageImage.js';

const ALLOWED_BUCKET_MARKERS = ['shigotoku-clipit-prod-ad9ee'];

export function parseFirebaseStorageUrl(url: string): { bucket: string; path: string } | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('firebasestorage.googleapis.com')) return null;
    const m = u.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
    if (!m) return null;
    return { bucket: decodeURIComponent(m[1]!), path: decodeURIComponent(m[2]!) };
  } catch {
    return null;
  }
}

function mimeFromPath(path: string): string {
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  return 'image/jpeg';
}

function assertAllowedBucket(bucket: string): void {
  if (!ALLOWED_BUCKET_MARKERS.some((m) => bucket.includes(m))) {
    throw Object.assign(new Error('許可されていない Storage URL です'), { status: 403 });
  }
}

function normalizeBucket(bucket: string): string {
  if (bucket.endsWith('.appspot.com')) {
    return bucket.replace('.appspot.com', '.firebasestorage.app');
  }
  return bucket;
}

/** サーバー経由で Storage 画像を data URL 化（ブラウザ CORS 回避） */
export async function storageUrlToDataUrl(url: string): Promise<string> {
  const parsed = parseFirebaseStorageUrl(url);
  if (!parsed) {
    throw Object.assign(new Error('無効な Storage URL です'), { status: 400 });
  }
  assertAllowedBucket(parsed.bucket);

  const mime = mimeFromPath(parsed.path);
  try {
    const buf = await fetchImageBuffer(url);
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    /* download URL の token 失効時など */
  }

  const bucketName = normalizeBucket(parsed.bucket);
  const { getStorage } = await import('firebase-admin/storage');
  const [buf] = await getStorage().bucket(bucketName).file(parsed.path).download();
  return `data:${mime};base64,${buf.toString('base64')}`;
}

/** マニュアル内のスクショ URL をまとめて data URL 化 */
export async function resolveManualExportImages(
  screenshotUrls: string[],
): Promise<Record<string, string>> {
  const unique = [...new Set(screenshotUrls.filter(Boolean))];
  const entries = await Promise.all(
    unique.map(async (url) => {
      const dataUrl = await storageUrlToDataUrl(url);
      return [url, dataUrl] as const;
    }),
  );
  return Object.fromEntries(entries);
}
