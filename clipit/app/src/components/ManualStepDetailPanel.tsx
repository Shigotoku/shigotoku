import { useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, GripVertical, ImagePlus, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useEditLayoutColumns, ResizeGutter } from '../hooks/useEditLayoutColumns';
import { useStepDraft } from '../hooks/useStepDraft';
import { useToast } from '../context/ToastContext';
import StepScreenshotPreview from './StepScreenshotPreview';
import StepScreenEditor from './StepScreenEditor';
import VoiceInputButton from './VoiceInputButton';
import { expandOrgContent } from '../lib/orgContent';
import type { Manual, ManualStep, StepType } from '../types';

type Props = {
  manualId: string;
  manual: Manual;
  steps: ManualStep[];
  activeId: string;
  onBack: () => void;
  onStepsChange: (steps: ManualStep[]) => void;
  onActiveChange: (id: string) => void;
  onReload: () => Promise<void>;
  saveStepFields: (stepId: string, fields: { title: string; instruction: string; note: string }) => Promise<void>;
  patchStep: (stepId: string, patch: Partial<ManualStep>) => Promise<void>;
  moveStep: (stepId: string, dir: -1 | 1) => Promise<void>;
  reorderByDrag: (fromId: string, toId: string) => Promise<void>;
  insertStep: (mode: 'end' | 'before' | 'after') => Promise<void>;
  deleteStep: (stepId: string) => Promise<void>;
  applyRuleInstruction: (tone: 'simple' | 'formal' | 'manual') => Promise<void>;
  handleAiPolish: (tone: 'simple' | 'formal' | 'manual' | 'detailed') => Promise<void>;
  uploadScreenshot: (file: File) => Promise<void>;
  aiBusy: boolean;
  organization: ReturnType<typeof import('../context/OrgContext').useOrg>['organization'];
};

export default function ManualStepDetailPanel({
  manualId,
  manual,
  steps,
  activeId,
  onBack,
  onActiveChange,
  saveStepFields,
  patchStep,
  moveStep,
  reorderByDrag,
  insertStep,
  deleteStep,
  applyRuleInstruction,
  handleAiPolish,
  uploadScreenshot,
  aiBusy,
  organization,
}: Props) {
  const layoutRef = useRef<HTMLDivElement>(null);
  const { widths, dragSteps, dragEdit } = useEditLayoutColumns();
  const [dragStepId, setDragStepId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [screenEditOpen, setScreenEditOpen] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const { showToast } = useToast();

  const active = steps.find((s) => s.id === activeId) ?? steps[0];
  const demo = manualId.startsWith('demo');

  const { draft, update: updateDraft, saveState } = useStepDraft(
    active?.id,
    active ? { title: active.title, instruction: active.instruction, note: active.note ?? '' } : undefined,
    (fields) => saveStepFields(active!.id, fields),
    600,
    () => showToast('保存しました'),
  );

  const saveLabel =
    saveState === 'saving'
      ? '保存中…'
      : saveState === 'pending'
        ? '保存待ち…'
        : saveState === 'saved'
          ? '保存しました'
          : '自動保存';

  if (!active) {
    return (
      <div className="p-8 text-center">
        <button type="button" onClick={onBack} className="text-sm text-primary-600 hover:underline">
          ドキュメント編集に戻る
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          ドキュメント編集に戻る
        </button>
        <span className="text-xs text-slate-400">{saveLabel}</span>
      </div>

      <div ref={layoutRef} className="flex min-h-[calc(100vh-10rem)] flex-col lg:flex-row">
        <aside className="shrink-0 border-b border-slate-200 bg-white lg:border-b-0 lg:border-r" style={{ width: widths.steps }}>
          <div className="relative flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-xs font-bold text-slate-500">手順 ({steps.length})</span>
            <button
              type="button"
              onClick={() => setShowAddMenu((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary-600 hover:bg-primary-50"
            >
              <Plus size={14} /> 追加
            </button>
            {showAddMenu && (
              <div className="absolute right-4 top-12 z-20 min-w-[180px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <button type="button" className="block w-full px-4 py-2 text-left text-xs hover:bg-slate-50" onClick={() => { setShowAddMenu(false); void insertStep('end'); }}>
                  末尾に追加
                </button>
                <button type="button" className="block w-full px-4 py-2 text-left text-xs hover:bg-slate-50" onClick={() => { setShowAddMenu(false); void insertStep('before'); }}>
                  この手順の前に挿入
                </button>
                <button type="button" className="block w-full px-4 py-2 text-left text-xs hover:bg-slate-50" onClick={() => { setShowAddMenu(false); void insertStep('after'); }}>
                  この手順の後に挿入
                </button>
              </div>
            )}
          </div>
          <ul className="max-h-[60vh] overflow-y-auto lg:max-h-none">
            {steps.map((s, i) => (
              <li
                key={s.id}
                draggable={!demo}
                onDragStart={() => setDragStepId(s.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragStepId) void reorderByDrag(dragStepId, s.id);
                  setDragStepId(null);
                }}
                onDragEnd={() => setDragStepId(null)}
              >
                <button
                  type="button"
                  onClick={() => onActiveChange(s.id)}
                  className={`flex w-full items-start gap-2 border-l-4 px-2 py-3 text-left text-sm transition-colors ${
                    active.id === s.id ? 'border-primary-500 bg-primary-50/80' : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <GripVertical size={14} className="mt-1 shrink-0 text-slate-300" />
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="font-medium text-slate-800">{s.title || `手順 ${i + 1}`}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <ResizeGutter onDrag={(dx) => dragSteps(dx, layoutRef.current?.clientWidth ?? 1200)} />

        <section className="min-w-0 flex-1 border-b border-slate-200 bg-slate-100 p-4 lg:border-b-0 lg:border-r">
          <div className="mx-auto w-full max-w-4xl">
            <StepScreenshotPreview
              screenshotUrl={active.screenshotUrl}
              stepIndex={steps.findIndex((s) => s.id === active.id) + 1}
              clickX={active.clickX}
              clickY={active.clickY}
              stepType={active.type}
              imageLoading="eager"
            />
            <p className="mt-2 text-center text-xs text-slate-500">{active.pageTitle || active.pageUrl || '—'}</p>
            {!demo && (
              <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-primary-400 hover:text-primary-700">
                <ImagePlus size={14} />
                {imgBusy ? 'アップロード中…' : '画像を差し替え・挿入'}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={imgBusy}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    setImgBusy(true);
                    try {
                      await uploadScreenshot(file);
                    } finally {
                      setImgBusy(false);
                    }
                  }}
                />
              </label>
            )}
          </div>
        </section>

        <ResizeGutter onDrag={(dx) => dragEdit(dx, layoutRef.current?.clientWidth ?? 1200)} />

        <section className="shrink-0 bg-white p-4" style={{ width: widths.edit }}>
          <div className="space-y-4">
            <div className="flex gap-2">
              <button type="button" onClick={() => void moveStep(active.id, -1)} className="rounded-lg border p-2 hover:bg-slate-50">
                <ChevronUp size={16} />
              </button>
              <button type="button" onClick={() => void moveStep(active.id, 1)} className="rounded-lg border p-2 hover:bg-slate-50">
                <ChevronDown size={16} />
              </button>
              <button
                type="button"
                onClick={() => void deleteStep(active.id)}
                className="ml-auto rounded-lg border border-danger-200 p-2 text-danger-600 hover:bg-danger-50"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">手順タイトル</label>
              <input value={draft.title} onChange={(e) => updateDraft({ title: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-600">説明文</label>
                <VoiceInputButton
                  label="音声入力"
                  onText={(text) => updateDraft({ instruction: text })}
                />
              </div>
              <textarea rows={5} value={draft.instruction} onChange={(e) => updateDraft({ instruction: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              {organization?.snippets && organization.snippets.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {organization.snippets.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-primary-50"
                      onClick={() => updateDraft({ instruction: `${draft.instruction}\n{{snippet:${s.id}}}`.trim() })}
                    >
                      + {s.name}
                    </button>
                  ))}
                </div>
              )}
              {draft.instruction.includes('{{') && organization && (
                <p className="mt-1 text-[11px] text-primary-600">
                  プレビュー: {expandOrgContent(draft.instruction, organization.orgVariables, organization.snippets)}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" disabled={aiBusy} onClick={() => void applyRuleInstruction('simple')} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-200 disabled:opacity-50">
                  説明を自動作成（無料）
                </button>
                <button type="button" disabled={aiBusy} onClick={() => void handleAiPolish('simple')} className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 disabled:opacity-50">
                  <Sparkles size={12} /> AI（かんたん）
                </button>
                <button type="button" disabled={aiBusy} onClick={() => void handleAiPolish('manual')} className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-50">
                  AI（業務文書風）
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">手順の種類</label>
              <select value={active.type} onChange={(e) => void patchStep(active.id, { type: e.target.value as StepType })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="normal">通常</option>
                <option value="warning">注意</option>
                <option value="ng_example">NG例</option>
                <option value="check">確認ポイント</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">注意メモ</label>
              <input value={draft.note} onChange={(e) => updateDraft({ note: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600">画面編集</p>
              <button
                type="button"
                disabled={!active.screenshotUrl}
                onClick={() => setScreenEditOpen(true)}
                className="mt-2 w-full rounded-lg border border-primary-300 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-800 hover:bg-primary-100 disabled:opacity-40"
              >
                全画面で画面編集を開く
              </button>
            </div>
            {screenEditOpen && active.screenshotUrl && (
              <StepScreenEditor
                screenshotUrl={active.screenshotUrl}
                manualId={manualId}
                stepId={active.id}
                masks={active.masks ?? []}
                annotations={active.annotations ?? []}
                onSave={(result) => {
                  void patchStep(active.id, {
                    screenshotUrl: result.screenshotUrl,
                    masks: result.masks,
                    annotations: result.annotations,
                  });
                  setScreenEditOpen(false);
                }}
                onClose={() => setScreenEditOpen(false)}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
