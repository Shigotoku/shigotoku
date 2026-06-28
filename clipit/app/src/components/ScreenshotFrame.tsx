import type { ReactNode } from 'react';

type Props = {
  screenshotUrl?: string;
  /** 画像の上に重ねるオーバーレイ（マスキング等） */
  overlay?: ReactNode;
  className?: string;
  emptyLabel?: string;
  /** 編集画面の選択中手順は eager、共有閲覧は lazy（既定） */
  loading?: 'lazy' | 'eager';
  borderColor?: string;
  borderWidth?: number;
};

/** スクショを余白なく表示（aspect 固定なし・画質劣化なし） */
export default function ScreenshotFrame({
  screenshotUrl,
  overlay,
  className = '',
  emptyLabel = 'スクショ未設定',
  loading = 'lazy',
  borderColor,
  borderWidth = 0,
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

  const bw = borderWidth > 0 ? borderWidth : 0;
  const bc = borderColor || '#cbd5e1';

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl bg-slate-50 ${className}`}
      style={bw > 0 ? { border: `${bw}px solid ${bc}` } : { border: '1px solid #e2e8f0' }}
    >
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
