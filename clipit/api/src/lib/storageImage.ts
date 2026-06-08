import { randomUUID } from 'node:crypto';

type StorageBucket = {
  name: string;
  file: (path: string) => {
    save: (
      buffer: Buffer,
      opts: { metadata: { contentType: string; metadata: Record<string, string> } },
    ) => Promise<void>;
  };
};

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

function buildDownloadUrl(bucket: StorageBucket, path: string, token: string): string {
  const encoded = encodeURIComponent(path);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encoded}?alt=media&token=${token}`;
}

/** Firebase Storage の download URL 形式で返す（クライアント upload と同様） */
export async function saveObject(
  bucket: StorageBucket,
  path: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const token = randomUUID();
  const file = bucket.file(path);
  await file.save(buffer, {
    metadata: {
      contentType,
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  return buildDownloadUrl(bucket, path, token);
}

export async function saveScreenshotObject(
  bucket: StorageBucket,
  pathPrefix: string,
  buffer: Buffer,
  ext: 'jpg' | 'jpeg' | 'png' | 'webp' = 'jpg',
): Promise<string> {
  const normalized = ext === 'jpeg' ? 'jpg' : ext;
  return saveObject(bucket, `${pathPrefix}.${normalized}`, buffer, CONTENT_TYPES[normalized] ?? 'image/jpeg');
}

export async function savePdfObject(bucket: StorageBucket, pathPrefix: string, buffer: Buffer): Promise<string> {
  return saveObject(bucket, `${pathPrefix}.pdf`, buffer, 'application/pdf');
}

export async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw Object.assign(new Error('画像の取得に失敗しました'), { status: 502 });
  return Buffer.from(await res.arrayBuffer());
}
