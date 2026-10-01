import { useMemo } from "react";
import { ChevronDown, ChevronRight, Folder } from "lucide-react";
import type { Manual, ManualFolder } from "../types";

export type BulkScope = {
  mode: "all" | "selected";
  folderIds: string[];
  manualIds: string[];
  includeUncategorized: boolean;
};

type Props = {
  folders: ManualFolder[];
  manuals: Manual[];
  scope: BulkScope;
  onChange: (scope: BulkScope) => void;
  expandedFolders: Set<string>;
  onToggleFolderExpand: (folderId: string) => void;
};

export function manualsInScope(manuals: Manual[], scope: BulkScope): Manual[] {
  if (scope.mode === "all") return manuals;
  const folderSet = new Set(scope.folderIds);
  return manuals.filter((m) => {
    if (scope.manualIds.includes(m.id)) return true;
    if (!m.folderId && scope.includeUncategorized) return true;
    if (m.folderId && folderSet.has(m.folderId)) return true;
    return false;
  });
}

export default function BulkUpdateScopePicker({
  folders,
  manuals,
  scope,
  onChange,
  expandedFolders,
  onToggleFolderExpand,
}: Props) {
  const uncategorized = useMemo(() => manuals.filter((m) => !m.folderId), [manuals]);
  const inScopeCount = manualsInScope(manuals, scope).length;

  const toggleFolder = (folderId: string) => {
    const has = scope.folderIds.includes(folderId);
    onChange({
      ...scope,
      mode: "selected",
      folderIds: has ? scope.folderIds.filter((id) => id !== folderId) : [...scope.folderIds, folderId],
    });
  };

  const toggleManual = (manualId: string) => {
    const has = scope.manualIds.includes(manualId);
    onChange({
      ...scope,
      mode: "selected",
      manualIds: has ? scope.manualIds.filter((id) => id !== manualId) : [...scope.manualIds, manualId],
    });
  };

  const manualsInFolder = (folderId: string) => manuals.filter((m) => m.folderId === folderId);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900">対象マニュアル</h3>
        <span className="text-xs text-slate-500">{inScopeCount} / {manuals.length} 件</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={scope.mode === "all"}
            onChange={() => onChange({ mode: "all", folderIds: [], manualIds: [], includeUncategorized: true })}
          />
          すべて
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={scope.mode === "selected"}
            onChange={() => onChange({ ...scope, mode: "selected" })}
          />
          フォルダ・マニュアルを選択
        </label>
      </div>

      {scope.mode === "selected" && (
        <div className="mt-4 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3">
          {folders.map((f) => {
            const ms = manualsInFolder(f.id);
            const expanded = expandedFolders.has(f.id);
            return (
              <div key={f.id}>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleFolderExpand(f.id)}
                    className="text-slate-400"
                  >
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={scope.folderIds.includes(f.id)}
                      onChange={() => toggleFolder(f.id)}
                    />
                    <Folder size={14} className="text-primary-500" />
                    <span className="font-medium">{f.name}</span>
                    <span className="text-xs text-slate-400">({ms.length})</span>
                  </label>
                </div>
                {expanded && (
                  <ul className="ml-8 mt-1 space-y-1 border-l border-slate-100 pl-3">
                    {ms.map((m) => (
                      <li key={m.id}>
                        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            checked={scope.manualIds.includes(m.id) || scope.folderIds.includes(f.id)}
                            disabled={scope.folderIds.includes(f.id)}
                            onChange={() => toggleManual(m.id)}
                          />
                          {m.title}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          {uncategorized.length > 0 && (
            <div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={scope.includeUncategorized}
                  onChange={() =>
                    onChange({ ...scope, mode: "selected", includeUncategorized: !scope.includeUncategorized })
                  }
                />
                <Folder size={14} className="text-slate-400" />
                <span className="font-medium">未分類</span>
                <span className="text-xs text-slate-400">({uncategorized.length})</span>
              </label>
              <ul className="ml-6 mt-1 space-y-1">
                {uncategorized.map((m) => (
                  <li key={m.id}>
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={scope.manualIds.includes(m.id) || scope.includeUncategorized}
                        disabled={scope.includeUncategorized}
                        onChange={() => toggleManual(m.id)}
                      />
                      {m.title}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
