import { useCallback, useRef } from 'react';
import { Plus } from 'lucide-react';
import { insertStepAt, updateStep } from '../services/manuals';
import type { Manual, ManualStep } from '../types';
import StepDocumentBlock from './StepDocumentBlock';

type Props = {
  manualId: string;
  manual: Manual;
  steps: ManualStep[];
  onStepsChange: (steps: ManualStep[]) => void;
  onOpenDetail: (stepId: string) => void;
  onReload: () => Promise<void>;
  demo?: boolean;
};

export default function ManualDocumentEditor({
  manualId,
  manual,
  steps,
  onStepsChange,
  onOpenDetail,
  onReload,
  demo = false,
}: Props) {
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
          void updateStep(manualId, stepId, patch);
          saveTimers.current.delete(stepId);
        }, 500),
      );
    },
    [demo, manualId, onStepsChange, steps],
  );

  const addStepAt = async (position: number) => {
    if (demo) return;
    const newId = await insertStepAt(manualId, position, {
      type: 'normal',
      title: `手順 ${position}`,
      instruction: '',
      note: '',
      textBeforeImage: '',
      screenshotUrl: '',
      pageTitle: '',
      pageUrl: '',
      elementText: '',
      imageWidthPct: 100,
      imageAlign: 'center',
    });
    await onReload();
    onOpenDetail(newId);
  };

  const InsertButton = ({ position, label }: { position: number; label: string }) => (
    <div className="flex justify-center py-2">
      <button
        type="button"
        onClick={() => void addStepAt(position)}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700"
      >
        <Plus size={14} />
        {label}
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-2">
      <article className="rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">{manual.title}</h1>
        {manual.description && <p className="mt-2 text-sm text-slate-500">{manual.description}</p>}
        <p className="mt-1 text-xs text-slate-400">{steps.length} 手順 · クリックで詳細編集</p>

        {steps.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-500">まだ手順がありません</p>
            {!demo && (
              <button
                type="button"
                onClick={() => void addStepAt(1)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600"
              >
                <Plus size={16} />
                最初の手順を追加
              </button>
            )}
          </div>
        ) : (
          <div className="mt-8 space-y-2">
            <InsertButton position={1} label="先頭に手順を挿入" />
            {steps.map((step, i) => (
              <div key={step.id}>
                <StepDocumentBlock
                  step={step}
                  index={i}
                  onPatch={(patch) => patchStep(step.id, patch)}
                  onOpenDetail={() => onOpenDetail(step.id)}
                  readOnly={demo}
                />
                <InsertButton position={step.order + 1} label="この後に手順を挿入" />
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
