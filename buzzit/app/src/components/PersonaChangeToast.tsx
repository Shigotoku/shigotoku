import { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';

export type PersonaChangedDetail = {
  personaName: string;
};

/**
 * ヘッダーで配信キャラを切り替えたときだけ、短い通知を表示する。
 */
export default function PersonaChangeToast() {
  const [toast, setToast] = useState<PersonaChangedDetail | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<PersonaChangedDetail>).detail;
      if (!detail?.personaName) return;
      setToast(detail);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setToast(null), 4500);
    };
    window.addEventListener('buzzit-persona-changed', onChange);
    return () => {
      window.removeEventListener('buzzit-persona-changed', onChange);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[3.25rem] z-[80] flex justify-center px-4 lg:top-[4rem]"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex max-w-md items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 shadow-lg buzz-fade-in">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">配信キャラを変更しました</p>
          <p className="mt-0.5 text-xs text-emerald-900/90">
            「{toast.personaName}」の予約・投稿・SNS連携に切り替わりました。画面上部のバッジで連携状況を確認できます。
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded p-1 text-emerald-800 hover:bg-emerald-100"
          aria-label="閉じる"
          onClick={() => setToast(null)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
