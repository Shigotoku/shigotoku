import type { StepType } from '../types';

type Props = {
  screenshotUrl?: string;
  stepIndex: number;
  clickX?: number;
  clickY?: number;
  stepType?: StepType;
  className?: string;
};

/** クリック位置に赤枠・番号を重ねたプレビュー（要件: 赤枠・番号自動付与） */
export default function StepScreenshotPreview({
  screenshotUrl,
  stepIndex,
  clickX,
  clickY,
  stepType = 'normal',
  className = '',
}: Props) {
  const hasPoint = clickX != null && clickY != null && clickX >= 0 && clickY >= 0;

  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {stepType === 'ng_example' && (
        <div className="absolute left-0 right-0 top-0 z-20 bg-danger-600 px-3 py-1 text-center text-xs font-bold text-white">
          NG例 — この操作はしないでください
        </div>
      )}
      {stepType === 'warning' && (
        <div className="absolute left-0 right-0 top-0 z-20 bg-amber-500 px-3 py-1 text-center text-xs font-bold text-white">
          注意が必要な手順
        </div>
      )}
      <div className="relative aspect-[4/3] bg-slate-100">
        {screenshotUrl ? (
          <img src={screenshotUrl} alt="" className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <p className="text-sm font-semibold text-slate-500">スクショ未設定</p>
            <p className="mt-1 text-xs text-slate-400">Chrome拡張の記録で自動表示されます</p>
          </div>
        )}
        <div
          className="pointer-events-none absolute flex h-11 w-11 items-center justify-center rounded-full border-4 border-red-500 bg-red-500/15 text-lg font-bold text-red-600 shadow-md"
          style={
            hasPoint
              ? { left: `${clickX}%`, top: `${clickY}%`, transform: 'translate(-50%, -50%)' }
              : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
          }
        >
          {stepIndex}
        </div>
      </div>
    </div>
  );
}
