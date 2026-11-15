import { useState } from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { usePersona } from '../store/personaContext';
import { personaSnsLinks, personaTypeLabel } from '../lib/personaSnsStatus';

/** 全配信キャラの SNS 連携状況を一覧し、編集したいキャラへワンクリックで切り替える */
export default function PersonaSnsOverview({ onEdit }: { onEdit?: () => void }) {
  const { personas, activePersonaId, switchPersona, switching } = usePersona();
  const [error, setError] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);

  if (personas.length === 0) return null;

  const handleEdit = async (id: string) => {
    setError(null);
    setTargetId(id);
    try {
      if (id !== activePersonaId) await switchPersona(id);
      onEdit?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : '切り替えに失敗しました');
    } finally {
      setTargetId(null);
    }
  };

  return (
    <section className="buzz-card-pad space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">配信キャラごとの連携状況</h3>
        <p className="mt-1 text-xs text-neutral-500">
          連携はキャラごとに別々です。「このキャラを編集」を押すと、そのキャラに切り替えて下の設定を開きます。
        </p>
      </div>
      <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200/80">
        {personas.map((p) => {
          const links = personaSnsLinks(p);
          const active = p.id === activePersonaId;
          return (
            <li
              key={p.id}
              className={`flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between ${active ? 'bg-violet-50/60' : ''}`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900">
                  {p.name}
                  <span className="ml-1.5 text-xs font-normal text-neutral-500">（{personaTypeLabel(p.type)}）</span>
                  {active && (
                    <span className="ml-2 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold text-white">編集中</span>
                  )}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                  {links.map((l) => (
                    <span
                      key={l.id}
                      className={`inline-flex items-center gap-1 text-xs ${l.connected ? 'text-emerald-700' : 'text-neutral-400'}`}
                    >
                      {l.connected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                      {l.label}
                      {l.connected && l.detail ? ` ${l.detail}` : l.connected ? '' : ' 未連携'}
                    </span>
                  ))}
                </div>
              </div>
              {!active && (
                <button
                  type="button"
                  disabled={switching}
                  onClick={() => void handleEdit(p.id)}
                  className="buzz-btn-secondary !px-3 !py-1.5 text-xs disabled:opacity-60"
                >
                  {targetId === p.id && <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />}
                  このキャラを編集
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
    </section>
  );
}
