import { useEffect, useRef, useState } from 'react';
import { ChevronDown, UserCircle2 } from 'lucide-react';
import { usePersona } from '../store/personaContext';

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
  const { personas, activePersonaId, activePersona, loading, refreshPersonas, switchPersona } = usePersona();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshPersonas().catch(() => {});
  }, [refreshPersonas]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  if (!activePersona) return null;

  const typeClass = TYPE_COLORS[activePersona.type] ?? TYPE_COLORS.character;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex max-w-[14rem] items-center gap-1.5 truncate rounded-lg border px-2.5 py-1.5 text-xs font-medium shadow-sm hover:opacity-90 ${typeClass}`}
        title="配信キャラを切り替え"
      >
        <UserCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{activePersona.name}</span>
        {personas.length > 1 && <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
      </button>
      {open && personas.length > 1 && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[14rem] overflow-hidden rounded-xl border border-neutral-200/80 bg-white py-1 shadow-lg">
          <p className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
            配信キャラ
          </p>
          {personas.map((persona) => (
            <button
              key={persona.id}
              type="button"
              disabled={loading}
              onClick={async () => {
                await switchPersona(persona.id);
                setOpen(false);
                window.dispatchEvent(new CustomEvent('buzzit-persona-changed'));
              }}
              className={`block w-full px-3 py-2 text-left text-xs hover:bg-neutral-50 ${
                persona.id === activePersonaId ? 'font-semibold text-neutral-900' : 'text-neutral-600'
              }`}
            >
              <span className="block truncate">{persona.name}</span>
              <span className="text-[10px] text-neutral-400">{TYPE_LABELS[persona.type] ?? persona.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
