import { Heart, MessageCircle, Send, Bookmark } from 'lucide-react';
import { getSnsNavPlatform, repurposePlatformToSnsId } from '../lib/snsPlatforms';

type PreviewPlatform = 'instagram' | 'x' | 'line' | 'reels' | 'carousel' | 'x_thread' | 'generic';

type Props = {
  platform: PreviewPlatform;
  content: string;
  imageUrl?: string | null;
  label?: string;
  className?: string;
};

function resolvePlatform(platform: PreviewPlatform) {
  if (platform === 'reels' || platform === 'carousel') return 'instagram';
  if (platform === 'x_thread') return 'x';
  if (platform === 'instagram' || platform === 'x' || platform === 'line') return platform;
  const snsId = repurposePlatformToSnsId(platform);
  return snsId ?? 'instagram';
}

export default function PostPreview({ platform, content, imageUrl, label, className = '' }: Props) {
  const snsId = resolvePlatform(platform);
  const sns = getSnsNavPlatform(snsId);

  if (snsId === 'x') {
    return (
      <div className={`buzz-post-preview ${className}`}>
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-neutral-100 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-neutral-900" />
            <div>
              <p className="text-xs font-bold text-neutral-900">あなた�E店�E</p>
              <p className="text-[10px] text-neutral-500">@yourstore</p>
            </div>
          </div>
          <div className="px-3 py-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-900">{content}</p>
            {imageUrl && (
              <img src={imageUrl} alt="" className="mt-2 w-full rounded-lg border border-neutral-100 object-cover" />
            )}
          </div>
          <div className="flex gap-6 border-t border-neutral-100 px-3 py-2 text-neutral-400">
            <MessageCircle className="h-4 w-4" />
            <Send className="h-4 w-4" />
            <Heart className="h-4 w-4" />
          </div>
        </div>
        {label && <p className="mt-1.5 text-center text-[10px] text-neutral-500">{label}</p>}
      </div>
    );
  }

  if (snsId === 'line') {
    return (
      <div className={`buzz-post-preview ${className}`}>
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-[#8de055] p-3 shadow-sm">
          <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3 py-2.5 shadow-sm">
            {imageUrl && (
              <img src={imageUrl} alt="" className="mb-2 w-full rounded-lg object-cover" />
            )}
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-900">{content}</p>
          </div>
        </div>
        {label && <p className="mt-1.5 text-center text-[10px] text-neutral-500">{label}</p>}
      </div>
    );
  }

  // Instagram / Reels / Carousel default
  return (
    <div className={`buzz-post-preview ${className}`}>
      <div className="mx-auto max-w-[220px] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-md">
        {/* phone frame header */}
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ background: sns?.brandGradient ?? '#E1306C' }}
        >
          <div className="h-6 w-6 rounded-full border-2 border-white/80 bg-white/20" />
          <span className="text-xs font-semibold text-white">{sns?.name ?? 'Instagram'}</span>
        </div>
        {imageUrl ? (
          <img src={imageUrl} alt="" className="aspect-[4/5] w-full object-cover" />
        ) : (
          <div
            className="flex aspect-[4/5] w-full items-center justify-center bg-neutral-100 text-xs text-neutral-400"
          >
            画像�Eレビュー
          </div>
        )}
        <div className="flex gap-3 px-3 py-2 text-neutral-800">
          <Heart className="h-5 w-5" />
          <MessageCircle className="h-5 w-5" />
          <Send className="h-5 w-5" />
          <Bookmark className="ml-auto h-5 w-5" />
        </div>
        <div className="px-3 pb-3">
          <p className="line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-neutral-800">
            <span className="font-semibold">yourstore </span>
            {content}
          </p>
        </div>
      </div>
      {label && <p className="mt-1.5 text-center text-[10px] text-neutral-500">{label}</p>}
    </div>
  );
}
