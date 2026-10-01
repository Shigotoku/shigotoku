import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadOrganizationLogo(orgId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('画像ファイルを選んでください');
  if (file.size > 2 * 1024 * 1024) throw new Error('2MB以下の画像にしてください');
  const path = `clipit/logos/${orgId}-${Date.now()}.webp`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}
