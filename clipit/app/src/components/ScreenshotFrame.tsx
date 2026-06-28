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
  compact?: boolean;
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
  compact = false,
}: Props) {
  if (!screenshotUrl) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-center ${compact ? 'min-h-[60px] p-3' : 'min-h-[120px] p-6'} ${className}`}
      >
        <p className={`font-semibold text-slate-500 ${compact ? 'text-[10px]' : 'text-sm'}`}>{emptyLabel}</p>
      </div>
    );
  }

  const bw = borderWidth > 0 ? borderWidth : 0;
  const bc = borderColor || '#cbd5e1';

  return (
    <div
      className={`relative w-full overflow-hidden bg-slate-50 ${compact ? 'rounded-md' : 'rounded-xl'} ${className}`}
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
