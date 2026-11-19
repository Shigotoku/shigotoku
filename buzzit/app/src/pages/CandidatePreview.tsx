import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Bookmark, Heart, Maximize2, MessageCircle, Music2, Repeat2, Send, Share2, ThumbsUp, X } from 'lucide-react';
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

const PHONE_W = 272;
const PHONE_H = 520;
const PHONE_ASPECT = PHONE_H / PHONE_W;

function phoneBezel(screenW: number) {
  return Math.max(6, Math.round(7 * (screenW / PHONE_W)));
}

/** 画面幅(内側)から外枠のピクセルサイズ(border-box) */
function phoneOuterSize(screenW: number) {
  const b = phoneBezel(screenW);
  return { outerW: screenW + 2 * b, outerH: screenW * PHONE_ASPECT + 2 * b };
}

/** 枠内に収まる最大の携帯画面幅(内側) */
function fitPhoneScreenWidth(boxW: number, boxH: number): number {
  if (boxW < 80 || boxH < 120) return PHONE_W;
  let lo = 80;
  let hi = Math.min(Math.floor(boxW), 560);
  let best = lo;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const { outerW, outerH } = phoneOuterSize(mid);
    if (outerW <= boxW + 0.5 && outerH <= boxH + 0.5) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

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

function PhoneFrame({ children, width, className = '' }: { children: ReactNode; width: number; className?: string }) {
  const scale = width / PHONE_W;
  const screenH = width * PHONE_ASPECT;
  const border = phoneBezel(width);
  const outerR = Math.round(34 * scale);
  const innerR = Math.max(12, outerR - border);
  const notchW = Math.round(80 * scale);
  const notchH = Math.round(16 * scale);
  const fontPx = Math.max(11, Math.round(12 * scale));

  return (
    <div
      className={`mx-auto max-w-full shrink-0 bg-neutral-800 shadow-lg ${className}`}
      style={{ width: width + border * 2, padding: border, borderRadius: outerR, boxSizing: 'border-box' }}
    >
      <div className="relative overflow-hidden bg-white" style={{ height: screenH, borderRadius: innerR }}>
        <div
          className="absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-b-xl bg-neutral-800"
          style={{ width: notchW, height: notchH }}
        />
        <div
          className="h-full overflow-y-auto text-neutral-900"
          style={{ paddingTop: notchH + 4, fontSize: fontPx, lineHeight: 1.35 }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** 携帯サイズの投稿プレビュー(媒体ごとに見た目を切り替える)。実際の表示と完全には一致しません */
export default function CandidatePreview({ platform, body, mediaUrls, onPlatformChange }: Props) {
  const { activePersona } = usePersona();
  const [local, setLocal] = useState('');
  const [enlarged, setEnlarged] = useState(false);
  const [phoneWidth, setPhoneWidth] = useState(PHONE_W);
  const current = local || platform || 'x_thread';
  const currentMeta = PLATFORM_META.find((p) => p.id === current) ?? PLATFORM_META[0];
  const name = activePersona?.name ?? 'アカウント名';
  const handle = activePersona?.xUsername?.replace(/^@/, '') || 'account';
  const avatar = activePersona?.avatarUrl;
  const img = mediaUrls[0];
  const text = body.trim() || '(本文がここに表示されます)';
  const posts = current === 'x_thread' ? text.split(/\n-{3,}\n/).map((t) => t.trim()).filter(Boolean) : [text];

  const pick = (id: string) => { setLocal(id); onPlatformChange?.(id); };
  const previewWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = previewWrapRef.current;
    if (!el) return;
    const measure = () => {
      const pad = 8;
      const boxW = el.clientWidth - pad;
      const rect = el.getBoundingClientRect();
      const viewportRoom = Math.max(120, window.innerHeight - rect.top - pad);
      const boxH = Math.min(el.clientHeight - pad, viewportRoom);
      if (boxW > 0 && boxH > 0) setPhoneWidth(fitPhoneScreenWidth(boxW, boxH));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const previewBody = (
    <>
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
        <div className="relative -mt-5 h-full min-h-full bg-neutral-900 text-white">
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
        <div className="-mt-5 min-h-full bg-[#8cabd9] p-3 pt-8">
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
    </>
  );

  const view = (
    <CandidatePreviewView
      current={current}
      currentMeta={currentMeta}
      name={name}
      setEnlarged={setEnlarged}
      pick={pick}
      previewBody={previewBody}
      phoneWidth={phoneWidth}
      previewWrapRef={previewWrapRef}
    />
  );

  if (!enlarged) return view;

  return (
    <>
      {view}
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4"
        role="dialog"
        aria-modal
        aria-label="投稿プレビューを拡大表示"
        onClick={() => setEnlarged(false)}
      >
        <div
          className="flex max-h-[95vh] max-w-lg flex-col gap-3 overflow-hidden rounded-2xl bg-white p-4 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-neutral-900">プレビュー（{currentMeta.name}）</p>
            <button
              type="button"
              onClick={() => setEnlarged(false)}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              <X className="h-4 w-4" />
              閉じる
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {PLATFORM_META.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pick(p.id)}
                style={current === p.id ? { backgroundColor: p.color, borderColor: p.color } : undefined}
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${current === p.id ? 'text-white' : 'border-neutral-200 bg-white text-neutral-800'}`}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="flex min-h-0 justify-center overflow-y-auto py-2">
            <PhoneFrame width={Math.min(340, PHONE_W * 1.35)}>{previewBody}</PhoneFrame>
          </div>
        </div>
      </div>
    </>
  );
}

function CandidatePreviewView({
  current,
  currentMeta,
  name,
  setEnlarged,
  pick,
  previewBody,
  phoneWidth,
  previewWrapRef,
}: {
  current: string;
  currentMeta: (typeof PLATFORM_META)[number];
  name: string;
  setEnlarged: (v: boolean) => void;
  pick: (id: string) => void;
  previewBody: ReactNode;
  phoneWidth: number;
  previewWrapRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col items-stretch gap-2">
      <p className="shrink-0 text-center text-xs font-semibold text-neutral-700">プレビュー媒体を選ぶ</p>
      <div className="flex shrink-0 flex-wrap justify-center gap-1.5">
        {PLATFORM_META.map((p) => {
          const selected = current === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p.id)}
              style={selected ? { backgroundColor: p.color, borderColor: p.color } : undefined}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold leading-tight ${selected ? 'text-white shadow-sm' : 'border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50'}`}
            >
              {p.name}
            </button>
          );
        })}
      </div>
      <p className="shrink-0 text-center text-[11px] text-neutral-500">
        表示中: <span className="font-semibold text-neutral-800">{currentMeta.name}</span>
        {current === 'x_thread' ? ` · ${name}` : ''}
        <span className="text-neutral-400"> · 目安のプレビュー（各SNSと多少異なります）</span>
      </p>
      <div className="flex shrink-0 flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setEnlarged(true)}
          className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-800 hover:bg-violet-100"
        >
          <Maximize2 className="h-3 w-3" />
          画面いっぱいで見る
        </button>
      </div>
      <div
        ref={previewWrapRef}
        className="flex min-h-[140px] w-full min-w-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-neutral-100/80 p-1"
      >
        <PhoneFrame width={phoneWidth}>{previewBody}</PhoneFrame>
      </div>
    </div>
  );
}