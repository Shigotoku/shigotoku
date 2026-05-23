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
        className={`min-h-[8rem] border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-slate-500 transition-colors cursor-pointer px-4 py-6 ${
          isDragging
            ? 'border-indigo-400 bg-indigo-500/10 text-indigo-300'
            : 'border-slate-700 hover:border-indigo-500/50 hover:bg-indigo-500/5'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <Upload className={`w-6 h-6 mb-2 ${isDragging ? 'text-indigo-400' : ''}`} />
        <span className="text-sm text-center">
          {isDragging ? 'ここにドロップ' : '画像や動画をドロップ、またはクリックして選択'}
        </span>
        <span className="text-xs text-slate-600 mt-1">JPEG / PNG / WebP / MP4 など（画像10MB・動画50MBまで）</span>
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

      {error && (
        <p className="text-xs text-rose-400">{error}</p>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {files.map((item) => (
            <div
              key={item.id}
              className="relative rounded-lg overflow-hidden border border-slate-700 bg-slate-900 aspect-video group"
            >
              {item.kind === 'image' ? (
                <img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <video src={item.previewUrl} className="w-full h-full object-cover" muted playsInline />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <div className="flex items-center gap-1 text-[10px] text-white truncate">
                  {item.kind === 'video' ? (
                    <Film className="w-3 h-3 shrink-0" />
                  ) : (
                    <ImageIcon className="w-3 h-3 shrink-0" />
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
                className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="削除"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
