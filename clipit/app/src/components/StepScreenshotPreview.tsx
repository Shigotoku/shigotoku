import type { StepType } from '../types';
import ScreenshotFrame from './ScreenshotFrame';

type Props = {
  screenshotUrl?: string;
  stepIndex: number;
  clickX?: number;
  clickY?: number;
  stepType?: StepType;
  className?: string;
  /** 編集画面のみ true。プレビュー・共有・エクスポートは false */
  showClickMarker?: boolean;
  imageLoading?: 'lazy' | 'eager';
};

export default function StepScreenshotPreview({
  screenshotUrl,
  stepIndex,
  clickX,
  clickY,
  stepType = 'normal',
  className = '',
  showClickMarker = false,
  imageLoading = 'lazy',
}: Props) {
  const hasPoint = showClickMarker && clickX != null && clickY != null && clickX >= 0 && clickY >= 0;

  return (
    <div className={className}>
      {stepType === 'ng_example' && (
        <div className="mb-2 rounded-lg bg-danger-600 px-3 py-1 text-center text-xs font-bold text-white">
          NG例 — この操作はしないでください
        </div>
      )}
      {stepType === 'warning' && (
        <div className="mb-2 rounded-lg bg-amber-500 px-3 py-1 text-center text-xs font-bold text-white">
          注意が必要な手順
        </div>
      )}
      <ScreenshotFrame
        screenshotUrl={screenshotUrl}
        loading={imageLoading}
        overlay={
          hasPoint ? (
            <div
              className="pointer-events-none absolute flex h-11 w-11 items-center justify-center rounded-full border-4 border-red-500 bg-red-500/15 text-lg font-bold text-red-600 shadow-md"
              style={{
                left: `${clickX}%`,
                top: `${clickY}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {stepIndex}
            </div>
          ) : null
        }
      />
    </div>
  );
}
