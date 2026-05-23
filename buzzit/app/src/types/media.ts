export type MediaKind = 'image' | 'video';

export interface LocalMediaFile {
  id: string;
  file: File;
  kind: MediaKind;
  previewUrl: string;
  name: string;
  size: number;
}

export interface UploadedMedia {
  id: string;
  kind: MediaKind;
  name: string;
  size: number;
  storagePath: string;
  publicUrl: string;
  previewUrl?: string;
}

export const ACCEPTED_MEDIA_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
] as const;

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
