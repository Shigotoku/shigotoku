import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

/** ヘッダー右側の「注意」ボタン置き場（DashboardLayout が設定） */
export const HeaderNoticeSlotContext = createContext<HTMLElement | null>(null);

type Props = {
  /** ボタンに表示するラベル */
  label: string;
  /** 件数バッジ（省略時は !） */
  count?: number;
  children: ReactNode;
};

/**
 * 注意メッセージをページ本文ではなくヘッダーのボタンに格納し、押したときだけ表示する。
 * ヘッダー枠が無い場所（埋め込み等）ではそのまま本文に展開する。
 */
export default function HeaderNotice({ label, count, children }: Props) {
  const slot = useContext(HeaderNoticeSlotContext);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!slot) return <div className="space-y-2">{children}</div>;

  return createPortal(
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-full border border-amber-400 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-950 hover:bg-amber-100"
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="whitespace-nowrap">{label}</span>
        <span className="rounded-full bg-amber-700 px-1.5 text-[10px] leading-4 text-white">{count ?? '!'}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 max-h-[70vh] w-[min(92vw,30rem)] space-y-2 overflow-auto rounded-xl border border-amber-200 bg-white p-3 shadow-xl">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-2 top-2 rounded p-1 text-neutral-500 hover:bg-neutral-100"
            aria-label="閉じる"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="space-y-2 pr-6">{children}</div>
        </div>
      )}
    </div>,
    slot,
  );
}
