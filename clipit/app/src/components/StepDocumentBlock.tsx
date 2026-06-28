import { AlignCenter, AlignLeft, AlignRight, Settings2 } from 'lucide-react';
import type { ManualStep, StepImageAlign } from '../types';
import { IMAGE_WIDTH_MAX, IMAGE_WIDTH_MIN, stepImageAlign, stepImageWidthPct, stepUsesFloatLayout } from '../lib/stepLayout';
import StepDocumentImage from './StepDocumentImage';

type Props = {
  step: ManualStep;
  index: number;
  onPatch: (patch: Partial<ManualStep>) => void;
  onOpenDetail: () => void;
  readOnly?: boolean;
};

export default function StepDocumentBlock({ step, index, onPatch, onOpenDetail, readOnly = false }: Props) {
  const widthPct = stepImageWidthPct(step);
  const align = stepImageAlign(step);
  const hasImage = Boolean(step.screenshotUrl);
  const sideBySide = hasImage && stepUsesFloatLayout(step);

  const setAlign = (imageAlign: StepImageAlign) => onPatch({ imageAlign });

  return (
    <section
      id={`step-${step.order}`}
      className="group relative scroll-mt-24 rounded-xl border border-transparent px-2 py-4 transition-colors hover:border-slate-200 hover:bg-slate-50/50"
      onClick={(e) => {
        if (readOnly) return;
        const t = e.target as HTMLElement;
        if (t.closest('input,textarea,button,label,[data-no-detail]')) return;
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

      {!readOnly && hasImage && (
        <div
          data-no-detail
          className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2"
          onClick={(e) => e.stopPropagation()}
        >
          <label className="flex min-w-[140px] flex-1 items-center gap-2 text-[11px] font-semibold text-slate-500">
            画像サイズ
            <input
              type="range"
              min={IMAGE_WIDTH_MIN}
              max={IMAGE_WIDTH_MAX}
              value={widthPct}
              onChange={(e) => onPatch({ imageWidthPct: Number(e.target.value) })}
              className="flex-1 accent-primary-500"
            />
            <span className="w-8 tabular-nums text-slate-700">{widthPct}%</span>
          </label>
          {sideBySide && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-slate-500">配置</span>
              {(
                [
                  { id: 'left' as const, icon: AlignLeft, label: '左' },
                  { id: 'center' as const, icon: AlignCenter, label: '中央' },
                  { id: 'right' as const, icon: AlignRight, label: '右' },
                ] as const
              ).map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  title={label}
                  onClick={() => setAlign(id)}
                  className={`rounded-md p-1.5 ${
                    align === id ? 'bg-primary-100 text-primary-700' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={14} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {(step.textBeforeImage || (!readOnly && !sideBySide)) && (
        <textarea
          value={step.textBeforeImage ?? ''}
          readOnly={readOnly}
          onChange={(e) => onPatch({ textBeforeImage: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          rows={step.textBeforeImage ? 2 : 1}
          placeholder={hasImage && !sideBySide ? '画像の前に入る説明（任意）' : sideBySide ? '画像の上に入る短い説明（任意）' : ''}
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
