import { useCallback, useRef } from 'react';
import { Link } from "react-router-dom";
import { Chrome, ImageUp, Plus } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { insertStepAt, updateStep } from '../services/manuals';
import { stepFieldsFromLayout } from '../lib/uiLayoutTemplates';
import type { Manual, ManualStep } from '../types';
import StepOverviewCard from './StepOverviewCard';
import ManualTableOfContents from './ManualTableOfContents';

type Props = {
  manualId: string;
  manual: Manual;
  displayTitle: string;
  steps: ManualStep[];
  onStepsChange: (steps: ManualStep[]) => void;
  onOpenDetail: (stepId: string) => void;
  onReload: () => Promise<void>;
  demo?: boolean;
};

export default function ManualDocumentEditor({
  manualId,
  manual,
  displayTitle,
  steps,
  onStepsChange,
  onOpenDetail,
  onReload,
  demo = false,
}: Props) {
  const { showToast } = useToast();
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const patchStep = useCallback(
    (stepId: string, patch: Partial<ManualStep>) => {
      onStepsChange(steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)));
      if (demo) return;
      const prev = saveTimers.current.get(stepId);
      if (prev) clearTimeout(prev);
      saveTimers.current.set(
        stepId,
        setTimeout(() => {
          void updateStep(manualId, stepId, patch).catch(() => showToast('保存に失敗しました', 'error'));
          saveTimers.current.delete(stepId);
        }, 500),
      );
    },
    [demo, manualId, onStepsChange, showToast, steps],
  );

  const addStepAt = async (position: number) => {
    if (demo) return;
    const layoutFields = stepFieldsFromLayout(manual.uiLayoutId);
    const newId = await insertStepAt(manualId, position, {
      type: layoutFields.type ?? 'normal',
      title: `手順 ${position}`,
      instruction: '',
      note: layoutFields.note ?? '',
      textBeforeImage: layoutFields.textBeforeImage ?? '',
      screenshotUrl: '',
      pageTitle: '',
      pageUrl: '',
      elementText: '',
      uiLayoutId: manual.uiLayoutId,
      imageWidthPct: layoutFields.imageWidthPct,
      imageAlign: layoutFields.imageAlign,
    });
    await onReload();
    onOpenDetail(newId);
  };

  return (
    <div className="mx-auto w-full max-w-[min(100%,1600px)] px-4 pb-20 pt-2 lg:px-6">
      <header className="mb-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">{displayTitle}</h1>
        {manual.description && (
          <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-slate-500">{manual.description}</p>
        )}
        {manual.tocEnabled && steps.length > 0 && <ManualTableOfContents steps={steps} />}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            {steps.length} 手順 · カードで簡単編集 · 「詳細」で画面編集・AI・画像差し替え
          </p>
          {!demo && steps.length > 0 && (
            <button
              type="button"
              onClick={() => void addStepAt(steps.length + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-primary-300 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100"
            >
              <Plus size={14} />
              手順を追加
            </button>
          )}
        </div>
      </header>

      {steps.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-12 shadow-sm">
          <p className="text-center text-sm font-semibold text-slate-800">手順を追加しましょう</p>
          <p className="mx-auto mt-2 max-w-sm text-center text-xs leading-relaxed text-slate-500">
            操作記録・スクショアップロード・手入力のいずれかで始められます。
          </p>
          {!demo && (
            <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => void addStepAt(1)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600"
              >
                <Plus size={16} />
                手順を手動で追加
              </button>
              <Link
                to="/extension/install"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Chrome size={16} />
                拡張で記録する
              </Link>
              <Link
                to="/manuals/new/screenshots"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ImageUp size={16} />
                スクショから追加
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
          style={{ gap: manual.stepSpacingPx != null && manual.stepSpacingPx > 0 ? manual.stepSpacingPx : 16 }}
        >
          {steps.map((step, i) => (
            <StepOverviewCard
              key={step.id}
              step={step}
              index={i}
              manualLayoutId={manual.uiLayoutId}
              onPatch={(patch) => patchStep(step.id, patch)}
              onOpenDetail={() => onOpenDetail(step.id)}
              readOnly={demo}
            />
          ))}
          {!demo && (
            <button
              type="button"
              onClick={() => void addStepAt(steps.length + 1)}
              className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white text-slate-500 transition-colors hover:border-primary-400 hover:bg-primary-50/30 hover:text-primary-700"
            >
              <Plus size={28} strokeWidth={1.5} />
              <span className="text-sm font-semibold">手順を追加</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
