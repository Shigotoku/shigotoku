import type { StepType } from '../types';
import { imageAlignClass, stepImageAlign, stepImageWidthPct, stepUsesFloatLayout } from '../lib/stepLayout';
import ScreenshotFrame from './ScreenshotFrame';

type Props = {
  step: {
    screenshotUrl?: string;
    type?: StepType;
    clickX?: number;
    clickY?: number;
    imageWidthPct?: number;
    imageAlign?: 'left' | 'center' | 'right';
    imageBorderColor?: string;
    imageBorderWidth?: number;
  };
  stepIndex: number;
  showClickMarker?: boolean;
  className?: string;
  /** 親コンテナいっぱいに表示（横並びレイアウト用） */
  fillContainer?: boolean;
  /** カードプレビュー向けのコンパクト表示 */
  compact?: boolean;
};

export default function StepDocumentImage({
  step,
  stepIndex,
  showClickMarker = false,
  className = '',
  fillContainer = false,
  compact = false,
}: Props) {
  const widthPct = stepImageWidthPct(step);
  const align = stepImageAlign(step);
  const floatLayout = stepUsesFloatLayout(step);
  const hasPoint =
    showClickMarker && step.clickX != null && step.clickY != null && step.clickX >= 0 && step.clickY >= 0;

  return (
    <div
      className={`${floatLayout ? imageAlignClass(align) : 'mb-3'} ${className}`}
      style={{ width: fillContainer ? '100%' : `${widthPct}%`, maxWidth: '100%' }}
    >
      {step.type === 'ng_example' && (
        <div
          className={`rounded-lg bg-danger-600 text-center font-bold text-white ${compact ? 'mb-1 px-2 py-0.5 text-[8px]' : 'mb-2 px-3 py-1 text-xs'}`}
        >
          NG例 — この操作はしないでください
        </div>
      )}
      {step.type === 'warning' && (
        <div
          className={`rounded-lg bg-amber-500 text-center font-bold text-white ${compact ? 'mb-1 px-2 py-0.5 text-[8px]' : 'mb-2 px-3 py-1 text-xs'}`}
        >
          注意が必要な手順
        </div>
      )}
      <ScreenshotFrame
        screenshotUrl={step.screenshotUrl}
        loading="lazy"
        borderColor={step.imageBorderColor}
        borderWidth={step.imageBorderWidth}
        compact={compact}
        overlay={
          hasPoint ? (
            <div
              className="pointer-events-none absolute flex h-11 w-11 items-center justify-center rounded-full border-4 border-red-500 bg-red-500/15 text-lg font-bold text-red-600 shadow-md"
              style={{
                left: `${step.clickX}%`,
                top: `${step.clickY}%`,
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
