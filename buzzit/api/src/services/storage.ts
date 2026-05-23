import { randomUUID } from 'crypto';
import { getStorage } from 'firebase-admin/storage';

const BUCKET_NAME = process.env.STORAGE_BUCKET ?? `${process.env.GCLOUD_PROJECT}.firebasestorage.app`;

export async function createSignedUploadUrl(fileName: string, contentType: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `uploads/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName}`;

  const bucket = getStorage().bucket(BUCKET_NAME);
  const file = bucket.file(storagePath);

  const [uploadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000,
    contentType,
  });

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

  return { uploadUrl, storagePath, publicUrl };
}
