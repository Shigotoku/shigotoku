import {
  UI_LAYOUT_TEMPLATES,
  persistUiLayoutId,
  type UiLayoutId,
} from '../lib/uiLayoutTemplates';
import UiLayoutDiagram from './UiLayoutDiagram';

type Props = {
  value: UiLayoutId;
  onChange: (id: UiLayoutId) => void;
  compact?: boolean;
};

export default function UiLayoutPicker({ value, onChange, compact = false }: Props) {
  const handleSelect = (id: UiLayoutId) => {
    persistUiLayoutId(id);
    onChange(id);
  };

  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-6' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
      {UI_LAYOUT_TEMPLATES.map((layout) => {
        const selected = value === layout.id;
        return (
          <button
            key={layout.id}
            type="button"
            onClick={() => handleSelect(layout.id)}
            className={`rounded-xl border text-left transition-all ${
              compact ? 'p-2.5' : 'p-4'
            } ${
              selected
                ? 'border-2 border-primary-400 bg-primary-50/50 ring-1 ring-primary-200'
                : 'border-slate-200 bg-white hover:border-primary-200'
            }`}
          >
            <UiLayoutDiagram layoutId={layout.id} selected={selected} className="mb-2 max-h-[72px]" />
            <p className={`font-bold text-slate-900 ${compact ? 'text-xs' : 'text-sm'}`}>{layout.name}</p>
            {!compact && (
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{layout.description}</p>
            )}
          </button>
        );
      })}
    </div>
  );
}
