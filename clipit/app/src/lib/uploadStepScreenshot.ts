import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import { optimizeScreenshotFile } from './optimizeScreenshot';
import { SCREENSHOT_CACHE_CONTROL } from './storageMeta';

/** 手順のスクショを差し替え（WebP・最大辺1280px・長期キャッシュ） */
export async function uploadStepScreenshot(manualId: string, stepId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('画像ファイルを選んでください');
  if (file.size > 12 * 1024 * 1024) throw new Error('12MB以下の画像にしてください');
  const optimized = await optimizeScreenshotFile(file);
  const path = `clipit/manuals/${manualId}/${stepId}-upload.webp`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, optimized, {
    contentType: optimized.type,
    cacheControl: SCREENSHOT_CACHE_CONTROL,
  });
  return getDownloadURL(storageRef);
}
