import { ref, getBytes } from 'firebase/storage';
import { storage } from './firebase';
import { mimeFromStoragePath } from './storageMeta';

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
    reader.readAsDataURL(blob);
  });
}

/** Firebase Storage の download URL からオブジェクトパスを抽出 */
export function storagePathFromDownloadUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('firebasestorage.googleapis.com')) return null;
    const m = u.pathname.match(/\/o\/(.+)$/);
    if (!m) return null;
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}

/** エクスポート・合成用に data URL へ（CORS 不要で Storage SDK を優先） */
export async function resolveImageDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const path = storagePathFromDownloadUrl(url);
  if (path) {
    try {
      const buf = await getBytes(ref(storage, path));
      const mime = mimeFromStoragePath(path);
      return blobToDataUrl(new Blob([buf], { type: mime }));
    } catch {
      /* fetch にフォールバック */
    }
  }
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) return blobToDataUrl(await res.blob());
  } catch {
    /* そのまま URL を返す（Word がオンライン取得する場合あり） */
  }
  return url;
}

export function loadImageFromSrc(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.src = src;
  });
}
