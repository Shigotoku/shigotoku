import { API_BASE, authFetch } from '../lib/api';
import type { LocalMediaFile, UploadedMedia } from '../types/media';

export async function uploadMediaToGcp(local: LocalMediaFile): Promise<UploadedMedia> {
  const headers: Record<string, string> = {
    'Content-Type': local.file.type,
    'X-File-Name': encodeURIComponent(local.name),
  };

  const uploadRes = await authFetch('/v1/upload', {
    method: 'POST',
    headers,
    body: local.file,
  });

  if (!uploadRes.ok) {
    const body = await uploadRes.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? 'クラウドへのアップロードに失敗しました');
  }

  const { storagePath, publicUrl } = (await uploadRes.json()) as {
    storagePath: string;
    publicUrl: string;
  };

  return {
    id: local.id,
    kind: local.kind,
    name: local.name,
    size: local.size,
    storagePath,
    publicUrl,
    previewUrl: local.previewUrl,
  };
}

export async function uploadAllMedia(files: LocalMediaFile[]): Promise<UploadedMedia[]> {
  return Promise.all(files.map(uploadMediaToGcp));
}

// re-export for debugging
export { API_BASE };
