import { getSignedUploadUrl } from '../lib/api';
import type { LocalMediaFile, UploadedMedia } from '../types/media';

export async function uploadMediaToGcp(local: LocalMediaFile): Promise<UploadedMedia> {
  const { uploadUrl, storagePath, publicUrl } = await getSignedUploadUrl(
    local.name,
    local.file.type,
    local.file.size,
  );

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': local.file.type },
    body: local.file,
  });

  if (!uploadRes.ok) {
    throw new Error('クラウドへのアップロードに失敗しました');
  }

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
