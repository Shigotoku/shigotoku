import { AlignCenter, AlignLeft, AlignRight, LayoutGrid } from 'lucide-react';
import type { ManualStep, StepImageAlign } from '../types';
import {
  UI_LAYOUT_TEMPLATES,
  applyStepUiLayout,
  getUiLayoutTemplate,
  resolveStepUiLayoutId,
  type UiLayoutId,
} from '../lib/uiLayoutTemplates';
import { IMAGE_WIDTH_MAX, IMAGE_WIDTH_MIN, stepImageAlign, stepImageWidthPct } from '../lib/stepLayout';

type Props = {
  step: ManualStep;
  manualLayoutId?: string | null;
  onPatch: (patch: Partial<ManualStep>) => void;
  /** 詳細編集パネル向けに縦並び */
  stacked?: boolean;
};

export default function StepLayoutControls({ step, manualLayoutId, onPatch, stacked = false }: Props) {
  const layoutId = resolveStepUiLayoutId(step, manualLayoutId);
  const layout = getUiLayoutTemplate(layoutId);
  const widthPct = stepImageWidthPct(step);
  const align = stepImageAlign(step);
  const hasImage = Boolean(step.screenshotUrl);

  const applyLayout = (nextId: UiLayoutId, force = true) => {
    onPatch(applyStepUiLayout(nextId, step, { forceLayout: force }));
  };

  const setAlign = (imageAlign: StepImageAlign) => onPatch({ imageAlign });

  return (
    <div
      className={`rounded-lg border border-slate-200 bg-slate-50/80 ${stacked ? 'space-y-3 p-3' : 'flex flex-wrap items-center gap-3 px-3 py-2'}`}
      data-no-detail
      onClick={(e) => e.stopPropagation()}
    >
      <div className={`flex items-center gap-2 ${stacked ? 'w-full' : ''}`}>
        <LayoutGrid size={14} className="shrink-0 text-primary-600" />
        <label className={`flex items-center gap-2 text-[11px] font-semibold text-slate-600 ${stacked ? 'flex-1' : ''}`}>
          UIひな型
          <select
            value={layoutId}
            onChange={(e) => applyLayout(e.target.value as UiLayoutId)}
            className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-800"
          >
            {UI_LAYOUT_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {hasImage && (
        <>
          <label className={`flex items-center gap-2 text-[11px] font-semibold text-slate-600 ${stacked ? 'w-full' : 'min-w-[140px] flex-1'}`}>
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

          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-slate-500">画像位置</span>
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
                  align === id ? 'bg-primary-100 text-primary-700' : 'text-slate-500 hover:bg-white'
                }`}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
        </>
      )}

      <p className={`text-[10px] leading-relaxed text-slate-500 ${stacked ? '' : 'w-full basis-full'}`}>
        {layout.description}
        {step.uiLayoutId && step.uiLayoutId !== manualLayoutId && (
          <span className="ml-1 font-semibold text-primary-700">（この手順だけ個別設定）</span>
        )}
      </p>
      {step.uiLayoutId && manualLayoutId && (
        <button
          type="button"
          onClick={() => applyLayout(manualLayoutId as UiLayoutId, true)}
          className="text-[10px] font-semibold text-primary-700 hover:underline"
        >
          マニュアル既定のレイアウトに戻す
        </button>
      )}
    </div>
  );
}
