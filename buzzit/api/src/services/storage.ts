import { randomUUID } from 'crypto';
import { getStorage } from 'firebase-admin/storage';

const BUCKET_NAME = process.env.STORAGE_BUCKET ?? `${process.env.GCLOUD_PROJECT}.firebasestorage.app`;

function safeFileName(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot > 0 ? fileName.slice(dot) : '';
  const safeBase = base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').slice(0, 80) || 'file';
  const safeExt = ext.replace(/[^a-zA-Z0-9._-]/g, '');
  return `${safeBase}${safeExt}`;
}

function buildStoragePath(fileName: string): string {
  return `uploads/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeFileName(fileName)}`;
}

export async function uploadBufferToGcp(
  buffer: Buffer,
  fileName: string,
  contentType: string,
): Promise<{ storagePath: string; publicUrl: string }> {
  const storagePath = buildStoragePath(fileName);
  const bucket = getStorage().bucket(BUCKET_NAME);
  const file = bucket.file(storagePath);

  await file.save(buffer, {
    contentType,
    resumable: false,
    metadata: { cacheControl: 'public, max-age=31536000' },
  });

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  return { storagePath, publicUrl };
}

export async function createSignedUploadUrl(fileName: string, contentType: string) {
  const safeName = safeFileName(fileName);
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
