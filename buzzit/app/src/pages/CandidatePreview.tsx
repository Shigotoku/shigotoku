import { useState } from 'react';
import { Bookmark, Heart, MessageCircle, Music2, Repeat2, Send, Share2, ThumbsUp } from 'lucide-react';
import { usePersona } from '../store/personaContext';

/** 投稿候補の媒体 → 表示名・ブランド色・短いラベル */
export const PLATFORM_META: Array<{ id: string; name: string; short: string; color: string }> = [
  { id: 'x_thread', name: 'X', short: 'X', color: '#111111' },
  { id: 'instagram', name: 'Instagram', short: 'IG', color: '#E1306C' },
  { id: 'threads', name: 'Threads', short: 'Th', color: '#262626' },
  { id: 'facebook', name: 'Facebook', short: 'FB', color: '#1877F2' },
  { id: 'tiktok', name: 'TikTok', short: 'TT', color: '#FE2C55' },
  { id: 'youtube_shorts', name: 'YouTube Shorts', short: 'YT', color: '#FF0000' },
  { id: 'line', name: 'LINE', short: 'LN', color: '#06C755' },
  { id: 'gbp', name: 'Googleビジネス', short: 'G', color: '#4285F4' },
];

export const isVideoUrl = (u: string) => /\.(mp4|mov|webm|m4v)(\?|$)/i.test(u);

function Media({ url, className }: { url?: string; className?: string }) {
  if (!url) return null;
  return isVideoUrl(url)
    ? <video src={url} className={className} muted playsInline controls />
    : <img src={url} alt="" className={className} />;
}

function Avatar({ name, url, size = 32 }: { name: string; url?: string; size?: number }) {
  return url
    ? <img src={url} alt="" style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover" />
    : <span style={{ width: size, height: size }} className="flex shrink-0 items-center justify-center rounded-full bg-neutral-300 text-[11px] font-bold text-white">{name.slice(0, 1)}</span>;
}

interface Props {
  platform: string;
  body: string;
  mediaUrls: string[];
  onPlatformChange?: (p: string) => void;
}

/** 携帯サイズの投稿プレビュー(媒体ごとに見た目を切り替える)。実際の表示と完全には一致しません */
export default function CandidatePreview({ platform, body, mediaUrls, onPlatformChange }: Props) {
  const { activePersona } = usePersona();
  const [local, setLocal] = useState('');
  const current = local || platform || 'x_thread';
  const name = activePersona?.name ?? 'アカウント名';
  const handle = activePersona?.xUsername?.replace(/^@/, '') || 'account';
  const avatar = activePersona?.avatarUrl;
  const img = mediaUrls[0];
  const text = body.trim() || '(本文がここに表示されます)';
  const posts = current === 'x_thread' ? text.split(/\n-{3,}\n/).map((t) => t.trim()).filter(Boolean) : [text];

  const pick = (id: string) => { setLocal(id); onPlatformChange?.(id); };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap justify-center gap-1">
        {PLATFORM_META.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.name}
            onClick={() => pick(p.id)}
            style={current === p.id ? { backgroundColor: p.color, borderColor: p.color } : undefined}
            className={`h-6 min-w-[1.5rem] rounded-full border px-1.5 text-[10px] font-bold ${current === p.id ? 'text-white' : 'bg-white text-neutral-600'}`}
          >{p.short}</button>
        ))}
      </div>

      <div className="w-[272px] shrink-0 rounded-[34px] border-[7px] border-neutral-800 bg-neutral-800 shadow-lg">
        <div className="relative h-[520px] overflow-hidden rounded-[26px] bg-white">
          <div className="absolute left-1/2 top-0 z-10 h-4 w-20 -translate-x-1/2 rounded-b-xl bg-neutral-800" />
          <div className="h-full overflow-y-auto pt-5 text-[12px] leading-snug text-neutral-900">
            {(current === 'x_thread' || current === 'threads') && (
              <div className="divide-y">
                {posts.map((t, i) => (
                  <div key={i} className="flex gap-2 p-3">
                    <Avatar name={name} url={avatar} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate"><b>{name}</b> <span className="text-neutral-500">{current === 'x_thread' ? `@${handle} · 今` : '· 今'}</span></div>
                      <div className="mt-0.5 whitespace-pre-wrap break-words">{t}</div>
                      {i === 0 && img && <Media url={img} className="mt-2 max-h-56 w-full rounded-xl border object-cover" />}
                      <div className="mt-2 flex justify-between pr-6 text-neutral-500">
                        <MessageCircle className="h-3.5 w-3.5" /><Repeat2 className="h-3.5 w-3.5" /><Heart className="h-3.5 w-3.5" /><Share2 className="h-3.5 w-3.5" />
                      </div>
                      {current === 'x_thread' && <div className={`mt-1 text-[10px] ${t.length > 280 ? 'text-rose-600' : 'text-neutral-400'}`}>{t.length}/280</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {current === 'instagram' && (
              <div>
                <div className="flex items-center gap-2 p-2"><Avatar name={name} url={avatar} size={26} /><b>{handle}</b></div>
                {img ? <Media url={img} className="aspect-square w-full bg-neutral-100 object-cover" /> : <div className="flex aspect-square items-center justify-center bg-neutral-100 text-neutral-400">画像が必要です</div>}
                <div className="flex items-center gap-3 px-3 pt-2"><Heart className="h-4 w-4" /><MessageCircle className="h-4 w-4" /><Send className="h-4 w-4" /><Bookmark className="ml-auto h-4 w-4" /></div>
                <div className="whitespace-pre-wrap break-words px-3 py-2"><b>{handle}</b> {text}</div>
              </div>
            )}

            {current === 'facebook' && (
              <div>
                <div className="flex items-center gap-2 p-3"><Avatar name={name} url={avatar} /><div><b>{name}</b><div className="text-[10px] text-neutral-500">今 · 🌐</div></div></div>
                <div className="whitespace-pre-wrap break-words px-3 pb-2">{text}</div>
                {img && <Media url={img} className="max-h-64 w-full object-cover" />}
                <div className="flex justify-around border-t py-2 text-neutral-500"><span className="flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" />いいね</span><span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />コメント</span><span className="flex items-center gap-1"><Share2 className="h-3.5 w-3.5" />シェア</span></div>
              </div>
            )}

            {(current === 'tiktok' || current === 'youtube_shorts') && (
              <div className="relative -mt-5 h-[520px] bg-neutral-900 text-white">
                {img ? <Media url={img} className="absolute inset-0 h-full w-full object-cover opacity-90" /> : <div className="absolute inset-0 flex items-center justify-center text-neutral-500">動画・画像が必要です</div>}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10">
                  <div className="font-bold">@{handle}</div>
                  <div className="mt-1 line-clamp-5 whitespace-pre-wrap break-words">{text}</div>
                  {current === 'tiktok' && <div className="mt-1 flex items-center gap-1 text-[10px]"><Music2 className="h-3 w-3" />オリジナル楽曲</div>}
                </div>
                <div className="absolute bottom-24 right-2 flex flex-col items-center gap-3"><Heart className="h-5 w-5" /><MessageCircle className="h-5 w-5" /><Share2 className="h-5 w-5" /></div>
              </div>
            )}

            {current === 'line' && (
              <div className="-mt-5 min-h-[520px] bg-[#8cabd9] p-3 pt-8">
                <div className="mb-2 text-center text-[10px] text-white/80">今日</div>
                <div className="flex gap-2"><Avatar name={name} url={avatar} size={28} />
                  <div className="max-w-[85%]">
                    <div className="mb-0.5 text-[10px] text-white">{name}</div>
                    <div className="overflow-hidden rounded-2xl rounded-tl-sm bg-white">
                      {img && <Media url={img} className="max-h-48 w-full object-cover" />}
                      <div className="whitespace-pre-wrap break-words p-2.5">{text}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {current === 'gbp' && (
              <div className="p-3">
                <div className="mb-2 flex items-center gap-2"><Avatar name={name} url={avatar} /><div><b>{name}</b><div className="text-[10px] text-neutral-500">最新情報 · 今</div></div></div>
                {img && <Media url={img} className="mb-2 max-h-48 w-full rounded-lg object-cover" />}
                <div className="whitespace-pre-wrap break-words">{text}</div>
                <div className="mt-3 inline-block rounded-full border border-blue-500 px-3 py-1 text-[11px] font-semibold text-blue-600">詳細</div>
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="px-2 text-center text-[10px] text-neutral-400">目安のプレビューです。実際の表示は各SNSで多少異なります。</p>
    </div>
  );
}
