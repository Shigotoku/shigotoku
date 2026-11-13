import { useRef, useState } from 'react';
import { ImagePlus, X, Film } from 'lucide-react';
import { uploadMediaToGcp } from '../services/mediaUpload';
import { ACCEPTED_MEDIA_TYPES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, type MediaKind } from '../types/media';

const isVideoUrl = (u: string) => /\.(mp4|mov|webm)(\?|$)/i.test(u);

/** 予約の編集画面: タグ・主題・画像/動画の確認と差し替え */
export default function JobMetaFields({
  tags,
  topic,
  mediaUrls,
  onChange,
}: {
  tags: string[];
  topic: string;
  mediaUrls: string[];
  onChange: (v: { tags: string[]; topic: string; mediaUrls: string[] }) => void;
}) {
  const [tagInput, setTagInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const addTags = (raw: string) => {
    const add = raw
      .split(/[,、\s]+/)
      .map((t) => t.replace(/^[#＃]/, '').trim())
      .filter(Boolean);
    if (!add.length) return;
    onChange({ tags: [...new Set([...tags, ...add])].slice(0, 10), topic, mediaUrls });
    setTagInput('');
  };

  const upload = async (file: File) => {
    setError('');
    const kind: MediaKind = file.type.startsWith('video/') ? 'video' : 'image';
    if (!(ACCEPTED_MEDIA_TYPES as readonly string[]).includes(file.type)) {
      setError('対応していない形式です（JPEG/PNG/WebP/GIF/MP4/MOV/WebM）');
      return;
    }
    if (file.size > (kind === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) {
      setError(kind === 'video' ? '動画は50MBまでです' : '画像は10MBまでです');
      return;
    }
    setBusy(true);
    try {
      const up = await uploadMediaToGcp({
        id: crypto.randomUUID(),
        file,
        kind,
        previewUrl: '',
        name: file.name,
        size: file.size,
      });
      onChange({ tags, topic, mediaUrls: [...mediaUrls, up.publicUrl].slice(0, 6) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'アップロードに失敗しました');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 space-y-3">
      <div>
        <span className="mb-1 block text-xs font-medium text-neutral-700">タグ（過去の類似投稿・AIの重複回避に使われます）</span>
        <div className="flex flex-wrap items-center gap-1.5 rounded border border-neutral-200 bg-white px-2 py-1.5">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-800">
              #{t}
              <button type="button" aria-label={`${t}を削除`} onClick={() => onChange({ tags: tags.filter((x) => x !== t), topic, mediaUrls })}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTags(tagInput);
              }
            }}
            onBlur={() => addTags(tagInput)}
            placeholder={tags.length ? '' : 'タグを入力して Enter（例: 医療制度）'}
            className="min-w-[8rem] flex-1 bg-transparent text-sm focus:outline-none"
          />
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-700">主題（任意）</span>
        <input
          value={topic}
          maxLength={80}
          onChange={(e) => onChange({ tags, topic: e.target.value, mediaUrls })}
          placeholder="例: 医療費控除の基本"
          className="w-full border border-neutral-200 bg-white px-3 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
        />
      </label>

      <div>
        <span className="mb-1 block text-xs font-medium text-neutral-700">画像・動画</span>
        <div className="flex flex-wrap gap-2">
          {mediaUrls.map((u) => (
            <div key={u} className="relative h-16 w-16 overflow-hidden rounded border border-neutral-200 bg-neutral-100">
              {isVideoUrl(u) ? (
                <a href={u} target="_blank" rel="noreferrer" className="flex h-full w-full items-center justify-center text-neutral-600">
                  <Film className="h-6 w-6" />
                </a>
              ) : (
                <img src={u} alt="" className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                aria-label="削除"
                onClick={() => onChange({ tags, topic, mediaUrls: mediaUrls.filter((x) => x !== u) })}
                className="absolute right-0 top-0 rounded-bl bg-black/60 p-0.5 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={busy || mediaUrls.length >= 6}
            onClick={() => fileRef.current?.click()}
            className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded border border-dashed border-neutral-300 text-[11px] text-neutral-600 hover:border-neutral-900 disabled:opacity-50"
          >
            <ImagePlus className="h-4 w-4" />
            {busy ? '送信中' : '追加'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_MEDIA_TYPES.join(',')}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = '';
            }}
          />
        </div>
        {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
      </div>
    </div>
  );
}
