import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { auth } from "./firebase";

/** スクショを JPEG 圧縮して Storage へ（Google ログイン時） */
export async function uploadScreenshot(dataUrl: string): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const compressed = await compressJpeg(dataUrl, 0.72, 1280);
  const storage = getStorage();
  const path = `shapeit/${user.uid}/${Date.now()}.jpg`;
  const r = ref(storage, path);
  await uploadString(r, compressed, "data_url");
  return getDownloadURL(r);
}

async function compressJpeg(dataUrl: string, quality: number, maxW: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
