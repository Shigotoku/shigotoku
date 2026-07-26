import { Settings2 } from 'lucide-react';
import type { ManualStep } from '../types';
import {
  UI_LAYOUT_TEMPLATES,
  applyStepUiLayout,
  resolveStepUiLayoutId,
  type UiLayoutId,
} from '../lib/uiLayoutTemplates';
import StepCardLayoutPreview from './StepCardLayoutPreview';

type Props = {
  step: ManualStep;
  index: number;
  manualLayoutId?: string | null;
  onPatch: (patch: Partial<ManualStep>) => void;
  onOpenDetail: () => void;
  readOnly?: boolean;
};

export default function StepOverviewCard({
  step,
  index,
  manualLayoutId,
  onPatch,
  onOpenDetail,
  readOnly = false,
}: Props) {
  const layoutId = resolveStepUiLayoutId(step, manualLayoutId);

  return (
    <article
      id={`step-${step.order}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-2 border-b border-slate-100 px-3 py-2.5">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500 text-[11px] font-bold text-white">
          {index + 1}
        </span>
        <input
          value={step.title}
          readOnly={readOnly}
          onChange={(e) => onPatch({ title: e.target.value })}
          placeholder={`手順 ${index + 1}`}
          className="min-w-0 flex-1 border-0 bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-300"
        />
        {!readOnly && (
          <button
            type="button"
            onClick={onOpenDetail}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:border-primary-300 hover:text-primary-700"
          >
            <Settings2 size={11} />
            詳細
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={readOnly ? undefined : onOpenDetail}
        className={`w-full text-left ${readOnly ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50/50'}`}
        disabled={readOnly}
        title="クリックで詳細編集"
      >
        <StepCardLayoutPreview step={step} index={index} manualLayoutId={manualLayoutId} />
      </button>

      <div className="flex flex-1 flex-col gap-2 border-t border-slate-100 p-3">
        <textarea
          value={step.instruction}
          readOnly={readOnly}
          onChange={(e) => onPatch({ instruction: e.target.value })}
          rows={2}
          placeholder="説明文を入力…（上のプレビューに反映）"
          className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-2 text-xs leading-relaxed text-slate-700 outline-none placeholder:text-slate-400 focus:border-primary-300 focus:bg-white"
        />
        {(step.textBeforeImage || !readOnly) && (
          <input
            value={step.textBeforeImage ?? ''}
            readOnly={readOnly}
            onChange={(e) => onPatch({ textBeforeImage: e.target.value })}
            placeholder="画像の前の説明（任意）"
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-[11px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-primary-300 focus:bg-white"
          />
        )}
        {(step.note || !readOnly) && (
          <input
            value={step.note ?? ''}
            readOnly={readOnly}
            onChange={(e) => onPatch({ note: e.target.value })}
            placeholder="注意メモ（任意）"
            className="w-full rounded-lg border border-amber-100 bg-amber-50/60 px-2.5 py-1.5 text-[11px] text-amber-900 outline-none placeholder:text-amber-700/40 focus:border-amber-200"
          />
        )}
        {!readOnly && (
          <label className="mt-auto flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
            レイアウト
            <select
              value={layoutId}
              onChange={(e) =>
                onPatch(applyStepUiLayout(e.target.value as UiLayoutId, step, { forceLayout: true }))
              }
              className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[10px] font-medium text-slate-800"
            >
              {UI_LAYOUT_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </article>
  );
}
