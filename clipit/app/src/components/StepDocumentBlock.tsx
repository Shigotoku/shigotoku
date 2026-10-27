import { Settings2 } from 'lucide-react';
import type { ManualStep } from '../types';
import { stepImageAlign, stepImageWidthPct, stepUsesFloatLayout } from '../lib/stepLayout';
import StepDocumentImage from './StepDocumentImage';
import StepLayoutControls from './StepLayoutControls';

type Props = {
  step: ManualStep;
  index: number;
  manualLayoutId?: string | null;
  onPatch: (patch: Partial<ManualStep>) => void;
  onOpenDetail: () => void;
  readOnly?: boolean;
};

export default function StepDocumentBlock({
  step,
  index,
  manualLayoutId,
  onPatch,
  onOpenDetail,
  readOnly = false,
}: Props) {
  const widthPct = stepImageWidthPct(step);
  const align = stepImageAlign(step);
  const hasImage = Boolean(step.screenshotUrl);
  const sideBySide = hasImage && stepUsesFloatLayout(step);

  return (
    <section
      id={`step-${step.order}`}
      className="group relative scroll-mt-24 rounded-xl border border-transparent px-2 py-4 transition-colors hover:border-slate-200 hover:bg-slate-50/50"
      onClick={(e) => {
        if (readOnly) return;
        const t = e.target as HTMLElement;
        if (t.closest('input,textarea,button,label,select,[data-no-detail]')) return;
        onOpenDetail();
      }}
    >
      <div className="mb-2 flex items-start gap-2">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
          {index + 1}
        </span>
        <input
          value={step.title}
          readOnly={readOnly}
          onChange={(e) => onPatch({ title: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          placeholder={`手順 ${index + 1}`}
          className="min-w-0 flex-1 border-0 bg-transparent text-base font-bold text-slate-900 outline-none placeholder:text-slate-300 focus:ring-0"
        />
        {!readOnly && (
          <button
            type="button"
            data-no-detail
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail();
            }}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 opacity-0 transition-opacity group-hover:opacity-100 hover:border-primary-300 hover:text-primary-700"
          >
            <Settings2 size={12} />
            詳細編集
          </button>
        )}
      </div>

      {!readOnly && (
        <div className="mb-3">
          <StepLayoutControls step={step} manualLayoutId={manualLayoutId} onPatch={onPatch} />
        </div>
      )}

      {(step.textBeforeImage || !readOnly) && (
        <textarea
          value={step.textBeforeImage ?? ''}
          readOnly={readOnly}
          onChange={(e) => onPatch({ textBeforeImage: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          rows={step.textBeforeImage ? 2 : 1}
          placeholder={
            sideBySide
              ? '画像の上に入る短い説明（任意）'
              : hasImage
                ? '画像の前に入る説明（任意）'
                : '説明の前置き（任意）'
          }
          className="mb-2 w-full resize-y border-0 bg-transparent text-[15px] leading-relaxed text-slate-700 outline-none placeholder:text-slate-300"
        />
      )}

      {sideBySide ? (
        <div
          className={`flex items-start gap-4 ${align === 'right' ? 'flex-row-reverse' : ''} ${align === 'center' ? 'justify-center' : ''}`}
        >
          <div className="shrink-0" style={{ width: `${widthPct}%`, maxWidth: `${widthPct}%` }}>
            <StepDocumentImage step={step} stepIndex={index + 1} fillContainer />
          </div>
          <textarea
            value={step.instruction}
            readOnly={readOnly}
            onChange={(e) => onPatch({ instruction: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            rows={Math.max(4, Math.min(14, (step.instruction.match(/\n/g)?.length ?? 0) + 4))}
            placeholder="画像の横に説明を入力…（Wordの回り込みと同様）"
            className="min-h-[120px] min-w-0 flex-1 resize-y border-0 bg-transparent text-[15px] leading-relaxed text-slate-700 outline-none placeholder:text-slate-300"
          />
        </div>
      ) : (
        <div>
          {hasImage && (
            <StepDocumentImage
              step={step}
              stepIndex={index + 1}
              className={align === 'center' ? 'mx-auto' : align === 'right' ? 'ml-auto' : ''}
            />
          )}
          <textarea
            value={step.instruction}
            readOnly={readOnly}
            onChange={(e) => onPatch({ instruction: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            rows={Math.max(3, Math.min(12, (step.instruction.match(/\n/g)?.length ?? 0) + 3))}
            placeholder="手順の説明を入力…"
            className="mt-2 w-full resize-y border-0 bg-transparent text-[15px] leading-relaxed text-slate-700 outline-none placeholder:text-slate-300"
          />
        </div>
      )}

      {(step.note || !readOnly) && (
        <textarea
          value={step.note ?? ''}
          readOnly={readOnly}
          onChange={(e) => onPatch({ note: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          rows={1}
          placeholder="注意メモ（任意）"
          className="mt-2 w-full resize-none rounded-lg border-0 bg-amber-50/80 px-2 py-1.5 text-xs text-amber-900 outline-none placeholder:text-amber-700/40"
        />
      )}

      {!readOnly && (
        <p className="mt-2 text-[10px] text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
          手順ブロックをクリック → 画面編集・AI・画像差し替えなどの詳細編集へ
        </p>
      )}
    </section>
  );
}
