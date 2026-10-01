import type { ManualStep } from '../types';
import { stepImageAlign, stepImageWidthPct, stepUsesFloatLayout } from '../lib/stepLayout';
import { getUiLayoutTemplate, resolveStepUiLayoutId } from '../lib/uiLayoutTemplates';
import StepDocumentImage from './StepDocumentImage';

type Props = {
  step: ManualStep;
  index: number;
  manualLayoutId?: string | null;
};

/** カード内に、書き出し時と同じ配置で手順をミニ表示 */
export default function StepCardLayoutPreview({ step, index, manualLayoutId }: Props) {
  const widthPct = stepImageWidthPct(step);
  const align = stepImageAlign(step);
  const hasImage = Boolean(step.screenshotUrl);
  const sideBySide = hasImage && stepUsesFloatLayout(step);
  const layoutName = getUiLayoutTemplate(resolveStepUiLayoutId(step, manualLayoutId)).name;

  return (
    <div className="border-b border-slate-100 bg-slate-50/40 px-2 py-2">
      <p className="mb-1.5 text-[9px] font-semibold text-slate-400">{layoutName}</p>
      <div className="max-h-[min(52vh,420px)] overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-inner">
        {step.textBeforeImage?.trim() && (
          <p className="mb-1.5 whitespace-pre-wrap text-[10px] leading-snug text-slate-600">
            {step.textBeforeImage}
          </p>
        )}

        {sideBySide ? (
          <div
            className={`flex items-start gap-2 ${align === 'right' ? 'flex-row-reverse' : ''} ${align === 'center' ? 'justify-center' : ''}`}
          >
            <div className="shrink-0" style={{ width: `${widthPct}%`, maxWidth: `${widthPct}%` }}>
              <StepDocumentImage step={step} stepIndex={index + 1} fillContainer compact />
            </div>
            <p className="min-w-0 flex-1 whitespace-pre-wrap text-[10px] leading-snug text-slate-700">
              {step.instruction.trim() || (
                <span className="text-slate-400">説明文を入力…</span>
              )}
            </p>
          </div>
        ) : (
          <>
            {hasImage && (
              <StepDocumentImage
                step={step}
                stepIndex={index + 1}
                compact
                className={`mb-1.5 ${align === 'center' ? 'mx-auto' : align === 'right' ? 'ml-auto' : ''}`}
              />
            )}
            {!hasImage && (
              <div className="mb-1.5 flex min-h-[80px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-[10px] text-slate-400">
                スクショ未設定
              </div>
            )}
            <p className="whitespace-pre-wrap text-[10px] leading-snug text-slate-700">
              {step.instruction.trim() || (
                <span className="text-slate-400">説明文を入力…</span>
              )}
            </p>
          </>
        )}

        {step.note?.trim() && (
          <p className="mt-1.5 rounded bg-amber-50 px-1.5 py-1 text-[9px] leading-snug text-amber-900">
            注意: {step.note}
          </p>
        )}
      </div>
    </div>
  );
}
