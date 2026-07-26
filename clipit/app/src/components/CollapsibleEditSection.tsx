import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';

type Props = {
  storageKey: string;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
};

function readStored(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === '0') return false;
    if (v === '1') return true;
  } catch {
    /* ignore */
  }
  return fallback;
}

export default function CollapsibleEditSection({
  storageKey,
  title,
  subtitle,
  defaultOpen = true,
  className = '',
  children,
}: Props) {
  const [open, setOpen] = useState(() => readStored(storageKey, defaultOpen));

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, open ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [open, storageKey]);

  return (
    <div className={`mx-6 mb-4 rounded-xl border border-slate-200 bg-white ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-slate-900">{title}</span>
          {subtitle && !open && (
            <span className="mt-0.5 block truncate text-xs text-slate-500">{subtitle}</span>
          )}
        </span>
        <span className="shrink-0 text-slate-400">{open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
      </button>
      {open && <div className="border-t border-slate-100 px-4 pb-4 pt-3">{children}</div>}
    </div>
  );
}
