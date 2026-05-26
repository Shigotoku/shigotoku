import { useCallback, useRef, useState, type DragEvent } from 'react';
import { Film, Image as ImageIcon, Upload, X } from 'lucide-react';
import {
  ACCEPTED_MEDIA_TYPES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  type LocalMediaFile,
  type MediaKind,
} from '../types/media';

interface MediaDropzoneProps {
  files: LocalMediaFile[];
  onChange: (files: LocalMediaFile[]) => void;
  disabled?: boolean;
}

function getMediaKind(type: string): MediaKind | null {
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  return null;
}

function validateFile(file: File): string | null {
  if (!ACCEPTED_MEDIA_TYPES.includes(file.type as (typeof ACCEPTED_MEDIA_TYPES)[number])) {
    return `${file.name}: 対応形式は JPEG/PNG/WebP/GIF/MP4/MOV/WebM です`;
  }
  const kind = getMediaKind(file.type);
  if (kind === 'image' && file.size > MAX_IMAGE_BYTES) {
    return `${file.name}: 画像は10MB以下にしてください`;
  }
  if (kind === 'video' && file.size > MAX_VIDEO_BYTES) {
    return `${file.name}: 動画は50MB以下にしてください`;
  }
  return null;
}

function createLocalMedia(file: File): LocalMediaFile {
  const kind = getMediaKind(file.type)!;
  return {
    id: crypto.randomUUID(),
    file,
    kind,
    previewUrl: URL.createObjectURL(file),
    name: file.name,
    size: file.size,
  };
}

export default function MediaDropzone({ files, onChange, disabled }: MediaDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const list = Array.from(incoming);
      const errors: string[] = [];
      const accepted: LocalMediaFile[] = [];

      for (const file of list) {
        const validationError = validateFile(file);
        if (validationError) {
          errors.push(validationError);
          continue;
        }
        accepted.push(createLocalMedia(file));
      }

      if (errors.length > 0) {
        setError(errors[0]);
      } else {
        setError(null);
      }

      if (accepted.length > 0) {
        onChange([...files, ...accepted]);
      }
    },
    [files, onChange],
  );

  const removeFile = (id: string) => {
    const target = files.find((f) => f.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onChange(files.filter((f) => f.id !== id));
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled || !e.dataTransfer.files.length) return;
    addFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`flex min-h-[8rem] cursor-pointer flex-col items-center justify-center border-2 border-dashed px-4 py-6 transition-colors ${
          isDragging
            ? 'border-neutral-900 bg-neutral-50 text-neutral-800'
            : 'border-neutral-300 text-neutral-500 hover:border-neutral-500 hover:bg-neutral-50'
        } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <Upload className="mb-2 h-6 w-6" />
        <span className="text-center text-sm">
          {isDragging ? 'ここにドロップ' : '画像や動画をドロップ、またはクリックして選択'}
        </span>
        <span className="mt-1 text-xs text-neutral-400">JPEG / PNG / WebP / MP4 など（画像10MB・動画50MBまで）</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_MEDIA_TYPES.join(',')}
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {error && <p className="text-xs text-rose-700">{error}</p>}

      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {files.map((item) => (
            <div
              key={item.id}
              className="group relative aspect-video overflow-hidden border border-neutral-200 bg-neutral-100"
            >
              {item.kind === 'image' ? (
                <img src={item.previewUrl} alt={item.name} className="h-full w-full object-cover" />
              ) : (
                <video src={item.previewUrl} className="h-full w-full object-cover" muted playsInline />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <div className="flex items-center gap-1 truncate text-[10px] text-white">
                  {item.kind === 'video' ? (
                    <Film className="h-3 w-3 shrink-0" />
                  ) : (
                    <ImageIcon className="h-3 w-3 shrink-0" />
                  )}
                  <span className="truncate">{item.name}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(item.id);
                }}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1.5 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                aria-label="削除"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
