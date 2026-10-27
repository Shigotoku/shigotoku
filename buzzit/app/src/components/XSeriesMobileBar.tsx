import { Sparkles, CheckCheck, Play } from 'lucide-react';

export default function XSeriesMobileBar({ onBulkAdd, onApproveAll, onRunNow, busy, approvedCount }: {
  onBulkAdd: () => void; onApproveAll: () => void; onRunNow: () => void; busy: boolean; approvedCount: number;
}) {
  return (
    <div className="fixed bottom-[52px] left-0 right-0 z-30 border-t border-neutral-200 bg-white/95 px-3 py-2 backdrop-blur-sm lg:hidden" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
      <div className="mx-auto flex max-w-lg gap-2">
        <button type="button" disabled={busy} onClick={onBulkAdd} className="buzz-btn-accent min-h-[48px] flex-1 text-xs disabled:opacity-70"><Sparkles className="h-4 w-4" />一括追加</button>
        <button type="button" disabled={busy} onClick={onApproveAll} className="buzz-btn-secondary min-h-[48px] flex-1 text-xs disabled:opacity-70"><CheckCheck className="h-4 w-4" />全部OK</button>
        <button type="button" disabled={busy || approvedCount === 0} onClick={onRunNow} className="buzz-btn-secondary min-h-[48px] shrink-0 px-3 text-xs disabled:opacity-70" title="1件すぐ投稿"><Play className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
