import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import { SCREENSHOT_CACHE_CONTROL } from './storageMeta';

/** 手順のスクショを差し替え（記録以外の画像も挿入可） */
export async function uploadStepScreenshot(manualId: string, stepId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('画像ファイルを選んでください');
  if (file.size > 12 * 1024 * 1024) throw new Error('12MB以下の画像にしてください');
  const ext = file.type.includes('webp') ? 'webp' : file.type.includes('png') ? 'png' : 'jpg';
  const path = `clipit/manuals/${manualId}/${stepId}-upload.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, {
    contentType: file.type,
    cacheControl: SCREENSHOT_CACHE_CONTROL,
  });
  return getDownloadURL(storageRef);
}
