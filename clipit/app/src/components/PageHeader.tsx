import type { ReactNode } from "react";

export default function PageHeader({
  title,
  description,
  action,
  editableTitle,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  editableTitle?: {
    value: string;
    onChange: (value: string) => void;
    onSave: () => void;
    saving?: boolean;
    placeholder?: string;
  };
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        {editableTitle ? (
          <div>
            <label htmlFor="page-header-title" className="mb-1 block text-xs font-semibold text-slate-500">
              マニュアル名（クリックして編集）
            </label>
            <input
              id="page-header-title"
              value={editableTitle.value}
              onChange={(e) => editableTitle.onChange(e.target.value)}
              onBlur={() => editableTitle.onSave()}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              placeholder={editableTitle.placeholder ?? "マニュアルのタイトル"}
              className="w-full max-w-2xl rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-xl font-bold tracking-tight text-slate-900 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
            {editableTitle.saving && (
              <p className="mt-1 text-xs text-slate-400">保存中…</p>
            )}
          </div>
        ) : (
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
        )}
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
