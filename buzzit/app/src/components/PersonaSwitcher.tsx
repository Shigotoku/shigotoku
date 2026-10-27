import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Plus, UserCircle2 } from 'lucide-react';
import { usePersona } from '../store/personaContext';
import { settingsPath } from '../lib/settingsUrls';
import { personaSnsLinks } from '../lib/personaSnsStatus';
import { isPersonaLocked } from '../lib/personaLock';

const TYPE_LABELS: Record<string, string> = {
  official: '公式',
  personal: '個人',
  character: 'キャラ',
};

const TYPE_COLORS: Record<string, string> = {
  official: 'border-blue-200 bg-blue-50 text-blue-800',
  personal: 'border-violet-200 bg-violet-50 text-violet-800',
  character: 'border-amber-200 bg-amber-50 text-amber-800',
};

export default function PersonaSwitcher() {
  const { personas, activePersonaId, activePersona, limits, loading, switching, refreshPersonas, switchPersona } =
    usePersona();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(() => isPersonaLocked());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onLock = () => setLocked(isPersonaLocked());
    window.addEventListener('buzzit-persona-lock-changed', onLock);
    return () => window.removeEventListener('buzzit-persona-lock-changed', onLock);
  }, []);

  useEffect(() => {
    refreshPersonas().catch(() => {});
  }, [refreshPersonas]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!activePersona) return null;

  const typeClass = TYPE_COLORS[activePersona.type] ?? TYPE_COLORS.character;
  const personasPath = settingsPath({ tab: 'personas' });
  const busy = loading || switching;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setError(null);
          if (locked) {
            setError('キャラ固定中です。紫バーの「キャラ固定中」を押して解除してください。');
            setOpen(true);
            return;
          }
          setOpen((v) => !v);
        }}
        disabled={busy}
        className={`flex max-w-[14rem] items-center gap-1.5 truncate rounded-lg border px-2.5 py-1.5 text-xs font-medium shadow-sm hover:opacity-90 disabled:cursor-wait disabled:opacity-60 ${typeClass}`}
        title="配信キャラを切り替え・追加"
      >
        <UserCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{switching ? '切り替え中…' : activePersona.name}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-[100] mt-1 min-w-[14rem] overflow-hidden rounded-xl border border-neutral-200/80 bg-white py-1 shadow-lg lg:left-0 lg:right-auto"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <p className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
            配信キャラ
          </p>
          {error && (
            <p className="mx-2 mb-1 rounded-lg bg-red-50 px-2 py-1.5 text-[10px] text-red-700">{error}</p>
          )}
          {personas.map((persona) => (
            <button
              key={persona.id}
              type="button"
              disabled={busy}
              onClick={async () => {
                if (persona.id === activePersonaId) {
                  setOpen(false);
                  return;
                }
                setError(null);
                try {
                  await switchPersona(persona.id);
                  setOpen(false);
                } catch (err) {
                  setError(err instanceof Error ? err.message : '配信キャラの切り替えに失敗しました');
                }
              }}
              className={`block w-full px-3 py-2 text-left text-xs hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-50 ${
                persona.id === activePersonaId ? 'font-semibold text-neutral-900' : 'text-neutral-600'
              }`}
            >
              <span className="block truncate">{persona.name}</span>
              <span className="text-[10px] text-neutral-400">{TYPE_LABELS[persona.type] ?? persona.type}</span>
              <span className="mt-0.5 flex flex-wrap gap-1">
                {personaSnsLinks(persona).map((link) => (
                  <span
                    key={link.id}
                    className={`rounded px-1 py-0.5 text-[9px] ${
                      link.connected ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    {link.label}
                    {link.connected ? '✓' : '—'}
                  </span>
                ))}
              </span>
            </button>
          ))}
          <div className="border-t border-neutral-100 px-2 py-1.5">
            <Link
              to={personasPath}
              onClick={() => setOpen(false)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-violet-800 hover:bg-violet-50"
            >
              <Plus className="h-3.5 w-3.5" />
              キャラを追加・管理
            </Link>
            {limits?.devFullAccess && (
              <p className="px-2 pb-1 text-[10px] text-green-700">開発モード（全機能利用可）</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
