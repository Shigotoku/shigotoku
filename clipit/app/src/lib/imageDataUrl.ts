import { mimeFromStoragePath } from './storageMeta';
import { apiFetch } from './api';

/** エクスポート開始前に API から一括取得した画像キャッシュ */
let exportImageCache: Record<string, string> | null = null;

export function setExportImageCache(cache: Record<string, string> | null): void {
  exportImageCache = cache;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
    reader.readAsDataURL(blob);
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

/** Firebase Storage の download URL から bucket / path を抽出 */
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

/** @deprecated parseFirebaseStorageUrl を使用 */
export function storagePathFromDownloadUrl(url: string): string | null {
  return parseFirebaseStorageUrl(url)?.path ?? null;
}

async function fetchViaApiProxy(url: string): Promise<string> {
  const { dataUrl } = await withTimeout(
    apiFetch<{ dataUrl: string }>('/v1/storage/data-url', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),
    45_000,
    '画像の取得がタイムアウトしました。しばらく待ってから再試行してください。',
  );
  if (!dataUrl?.startsWith('data:')) {
    throw new Error('画像の取得に失敗しました');
  }
  return dataUrl;
}

/**
 * エクスポート・合成用に data URL へ。
 * Firebase Storage はブラウザ SDK / fetch では CORS で失敗するため API プロキシのみ使用。
 */
export async function resolveImageDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;

  const cached = exportImageCache?.[url];
  if (cached?.startsWith('data:')) return cached;

  if (parseFirebaseStorageUrl(url)) {
    return fetchViaApiProxy(url);
  }

  try {
    const res = await withTimeout(fetch(url, { mode: 'cors' }), 20_000, '画像の取得がタイムアウトしました');
    if (res.ok) return blobToDataUrl(await res.blob());
  } catch {
    /* そのまま URL を返す */
  }
  return url;
}

export function loadImageFromSrc(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
    // data URL のみ canvas 合成に使用（外部 URL は taint するため crossOrigin 不要）
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.src = src;
  });
}

export { mimeFromStoragePath };
