import { Check, ExternalLink, Flame, LayoutTemplate, Play } from 'lucide-react';
import type { PlatformShowcase, ProfileShowcase, PostExample } from '../data/platformShowcase';

function AnnotationList({ annotations }: { annotations: ProfileShowcase['annotations'] }) {
  return (
    <ul className="space-y-2.5">
      {annotations.map((a) => (
        <li key={a.id} className="flex gap-2.5 text-sm">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-neutral-900 text-[10px] font-bold text-white">
            {a.id}
          </span>
          <div>
            <p className="font-semibold text-neutral-900">{a.label}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-neutral-600">{a.hint}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ProfileMock({ profile }: { profile: ProfileShowcase }) {
  const { layout } = profile;

  if (layout === 'instagram') {
    return (
      <div className="mx-auto max-w-[280px] border border-neutral-300 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 rounded-full bg-gradient-to-br from-rose-200 to-amber-100 ring-2 ring-neutral-200" />
          <div className="min-w-0 flex-1 text-center text-xs">
            <p className="font-bold text-neutral-900">128</p>
            <p className="text-neutral-500">投稿</p>
          </div>
          <div className="min-w-0 flex-1 text-center text-xs">
            <p className="font-bold text-neutral-900">2.4k</p>
            <p className="text-neutral-500">フォロワー</p>
          </div>
          <div className="min-w-0 flex-1 text-center text-xs">
            <p className="font-bold text-neutral-900">312</p>
            <p className="text-neutral-500">フォロー</p>
          </div>
        </div>
        <p className="mt-3 text-sm font-bold leading-snug">{profile.displayName}</p>
        <p className="text-xs text-neutral-500">@{profile.username}</p>
        <div className="mt-2 space-y-0.5 text-xs leading-relaxed text-neutral-800">
          {profile.bio.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <p className="mt-2 text-xs font-medium text-sky-700">🔗 {profile.linkLabel}</p>
        {profile.highlights && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {profile.highlights.map((h) => (
              <div key={h} className="flex shrink-0 flex-col items-center gap-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-300 bg-neutral-100 text-[9px] font-semibold text-neutral-600">
                  {h.slice(0, 2)}
                </div>
                <span className="text-[10px] text-neutral-600">{h}</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 grid grid-cols-3 gap-0.5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className={`aspect-square bg-gradient-to-br ${
                n === 1 ? 'from-neutral-800 to-neutral-600 ring-2 ring-amber-400' : 'from-neutral-200 to-neutral-100'
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-center text-[10px] text-amber-700">📌 左上がピン留め投稿（お店紹介リール）</p>
      </div>
    );
  }

  if (layout === 'tiktok') {
    return (
      <div className="mx-auto max-w-[280px] border border-neutral-300 bg-neutral-950 p-4 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 shrink-0 rounded-full bg-gradient-to-br from-fuchsia-400 to-cyan-400" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{profile.displayName}</p>
            <p className="text-xs text-neutral-400">@{profile.username}</p>
          </div>
          <button type="button" className="ml-auto shrink-0 border border-white/30 px-3 py-1 text-xs">
            フォロー
          </button>
        </div>
        <div className="mt-2 space-y-0.5 text-xs text-neutral-300">
          {profile.bio.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <p className="mt-2 text-xs text-cyan-300">🔗 {profile.linkLabel}</p>
        <div className="mt-3 grid grid-cols-3 gap-1">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className={`relative aspect-[9/16] bg-gradient-to-b from-neutral-700 to-neutral-900 ${
                n === 1 ? 'ring-2 ring-cyan-400' : ''
              }`}
            >
              {n === 1 && (
                <span className="absolute left-1 top-1 rounded bg-cyan-500 px-1 text-[8px] font-bold">固定</span>
              )}
              <Play className="absolute bottom-1 left-1 h-3 w-3 text-white/80" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layout === 'line') {
    return (
      <div className="mx-auto max-w-[280px] overflow-hidden border border-neutral-300 bg-[#8fd18f] shadow-sm">
        <div className="bg-[#06c755] px-4 py-3 text-sm font-bold text-white">{profile.displayName}</div>
        <div className="space-y-2 bg-[#ececec] p-3">
          <div className="max-w-[85%] rounded-lg bg-white p-3 text-xs leading-relaxed shadow-sm">
            <p className="font-semibold">友だち追加ありがとうございます🎉</p>
            <p className="mt-1 text-neutral-600">
              {profile.bio[0] ?? '初回クーポンは下のメニューからどうぞ'}
            </p>
          </div>
          <div className="max-w-[85%] rounded-lg border border-green-200 bg-green-50 p-2 text-[10px] text-green-900">
            🎫 初回500円OFFクーポン
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-neutral-300">
          {['予約', 'メニュー', 'アクセス', 'クーポン'].map((label) => (
            <div key={label} className="flex h-12 items-center justify-center bg-white text-xs font-medium">
              {label}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layout === 'youtube') {
    return (
      <div className="mx-auto max-w-[280px] border border-neutral-300 bg-white shadow-sm">
        <div className="h-16 bg-gradient-to-r from-red-500 to-red-600" />
        <div className="relative px-4 pb-4">
          <div className="absolute -top-6 left-4 h-12 w-12 rounded-full bg-gradient-to-br from-red-200 to-neutral-200 ring-4 ring-white" />
          <p className="mt-8 text-sm font-bold">{profile.displayName}</p>
          <p className="text-xs text-neutral-500">{profile.username} · チャンネル登録者 1.2k</p>
          <div className="mt-2 space-y-0.5 text-xs text-neutral-700">
            {profile.bio.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <p className="mt-2 text-xs text-blue-600">🔗 {profile.linkLabel}</p>
          <div className="mt-3 flex gap-2">
            <div className="relative aspect-[9/16] w-16 bg-gradient-to-b from-neutral-700 to-neutral-900 ring-2 ring-red-500">
              <span className="absolute left-0.5 top-0.5 bg-red-600 px-1 text-[7px] text-white">固定</span>
            </div>
            {[1, 2].map((n) => (
              <div key={n} className="aspect-[9/16] w-16 bg-gradient-to-b from-neutral-300 to-neutral-400" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'x') {
    return (
      <div className="mx-auto max-w-[280px] border border-neutral-300 bg-white shadow-sm">
        <div className="h-20 bg-gradient-to-r from-sky-100 to-neutral-200" />
        <div className="relative px-4 pb-4">
          <div className="absolute -top-8 left-4 h-14 w-14 rounded-full bg-gradient-to-br from-neutral-300 to-neutral-400 ring-4 ring-white" />
          <p className="mt-8 text-sm font-bold">{profile.displayName}</p>
          <p className="text-xs text-neutral-500">{profile.username}</p>
          <div className="mt-2 space-y-0.5 text-xs text-neutral-700">
            {profile.bio.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <p className="mt-2 text-xs text-sky-600">🔗 {profile.linkLabel}</p>
          <div className="mt-3 border border-amber-200 bg-amber-50 p-2 text-[10px]">
            📌 固定: 予約はこちら → {profile.linkLabel}
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'gbp') {
    return (
      <div className="mx-auto max-w-[280px] border border-neutral-300 bg-white p-4 shadow-sm">
        <p className="text-sm font-bold">{profile.displayName}</p>
        <p className="mt-1 text-xs text-amber-600">★ 4.8 (128件のクチコミ)</p>
        <p className="mt-1 text-xs text-neutral-600">美容室 · 渋谷区 · 営業中</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
          {['予約', '電話', 'ウェブ'].map((btn) => (
            <div key={btn} className="rounded border border-neutral-200 py-2 font-medium">
              {btn}
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="aspect-square bg-gradient-to-br from-neutral-200 to-neutral-100" />
          ))}
        </div>
        <p className="mt-2 text-[10px] text-neutral-500">写真20枚以上 · 週1更新 · 口コミ返信24h以内</p>
      </div>
    );
  }

  // facebook / threads
  return (
    <div className="mx-auto max-w-[280px] border border-neutral-300 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-neutral-800 to-neutral-500" />
        <div>
          <p className="text-sm font-bold">{profile.displayName}</p>
          <p className="text-xs text-neutral-500">{profile.username}</p>
        </div>
      </div>
      <div className="mt-2 space-y-0.5 text-xs text-neutral-700">
        {profile.bio.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <p className="mt-2 text-xs text-neutral-800">🔗 {profile.linkLabel}</p>
      <div className="mt-3 border-l-2 border-neutral-900 pl-2 text-[10px] text-neutral-600">
        📌 固定スレッド: お店紹介＋予約導線
      </div>
    </div>
  );
}

function PostExampleCard({ post }: { post: PostExample }) {
  const isVertical = post.format === 'reel' || post.format === 'video' || post.format === 'short';

  return (
    <article className="flex flex-col border border-neutral-200 bg-white">
      <div className={`relative overflow-hidden bg-gradient-to-br ${post.thumbClass} ${isVertical ? 'aspect-[9/16]' : 'aspect-square'}`}>
        <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center bg-neutral-900 text-xs font-bold text-white">
          {post.rank}
        </span>
        <span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
          {post.formatLabel}
        </span>
        {isVertical && (
          <Play className="absolute bottom-3 right-3 h-5 w-5 text-neutral-700/70" />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent p-3 pt-10">
          <p className="text-[11px] font-bold leading-snug text-white">{post.hookOverlay}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h5 className="text-sm font-bold text-neutral-900">{post.title}</h5>
        <p className="mt-1.5 text-xs leading-relaxed text-neutral-600">{post.captionPreview}</p>
        <p className="mt-3 mt-auto border-t border-neutral-100 pt-3 text-xs leading-relaxed text-[#6b4a3a]">
          <span className="font-semibold">なぜ効く: </span>
          {post.whyItWorks}
        </p>
      </div>
    </article>
  );
}

type Props = {
  showcase: PlatformShowcase;
  platformName: string;
  compact?: boolean;
};

export default function PlatformShowcasePanel({ showcase, platformName, compact }: Props) {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2">
        <LayoutTemplate className="h-4 w-4 text-neutral-700" />
        <h3 className="text-base font-bold text-neutral-900">
          {platformName} · 見本でイメージを掴む
        </h3>
      </div>

      <div className={`grid gap-6 ${compact ? '' : 'lg:grid-cols-[1fr_280px]'}`}>
        <div className="border border-neutral-200 bg-neutral-50/80 p-4 md:p-5">
          <p className="buzz-section-label mb-3">{showcase.profileTitle}</p>
          <ProfileMock profile={showcase.profile} />
        </div>
        {!compact && (
          <div className="border border-[#6b4a3a]/20 bg-[#faf6f2] p-4 md:p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#6b4a3a]">ポイント解説</p>
            <AnnotationList annotations={showcase.profile.annotations} />
          </div>
        )}
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Flame className="h-4 w-4 text-[#6b4a3a]" />
          <h4 className="text-sm font-bold">{showcase.postsTitle}</h4>
          <span className="text-xs text-neutral-500">（{platformName}向け · 業種に合わせたフック例）</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {showcase.posts.map((post) => (
            <PostExampleCard key={post.id} post={post} />
          ))}
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs text-neutral-500">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          見本はイメージ用です。実際の投稿は
          <ExternalLink className="inline h-3 w-3" />
          マジック・クリエイターで台本化できます。
        </p>
      </div>
    </section>
  );
}
