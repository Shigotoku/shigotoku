import type { ReactNode } from 'react';

type Props = {
  screenshotUrl?: string;
  /** 画像の上に重ねるオーバーレイ（マスキング等） */
  overlay?: ReactNode;
  className?: string;
  emptyLabel?: string;
  /** 編集画面の選択中手順は eager、共有閲覧は lazy（既定） */
  loading?: 'lazy' | 'eager';
};

/** スクショを余白なく表示（aspect 固定なし・画質劣化なし） */
export default function ScreenshotFrame({
  screenshotUrl,
  overlay,
  className = '',
  emptyLabel = 'スクショ未設定',
  loading = 'lazy',
}: Props) {
  if (!screenshotUrl) {
    return (
      <div
        className={`flex min-h-[120px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-100 p-6 text-center ${className}`}
      >
        <p className="text-sm font-semibold text-slate-500">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 ${className}`}>
      <img
        src={screenshotUrl}
        alt=""
        className="block h-auto w-full max-w-full"
        draggable={false}
        decoding="async"
        loading={loading}
        fetchPriority={loading === 'lazy' ? 'low' : 'high'}
      />
      {overlay ? (
        <div className="absolute inset-0" style={{ touchAction: 'none' }}>
          {overlay}
        </div>
      ) : null}
    </div>
  );
}
