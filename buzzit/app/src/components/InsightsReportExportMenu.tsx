import { useState } from 'react';
import { Download, Link2, FileText, Presentation, FileType } from 'lucide-react';
import {
  downloadInsightsReportFile,
  shareInsightsReport,
  type InsightsPlatformFilter,
  type InsightsReportFormat,
} from '../lib/api';

type Props = {
  platform: InsightsPlatformFilter;
  disabled?: boolean;
};

export default function InsightsReportExportMenu({ platform, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'エラーが発生しました');
    }
    setBusy(false);
    setOpen(false);
  };

  const download = (format: InsightsReportFormat) =>
    run(() => downloadInsightsReportFile(format, platform));

  const copyShareUrl = () =>
    run(async () => {
      const r = await shareInsightsReport(platform);
      await navigator.clipboard.writeText(r.shareUrl);
      setMessage('共有URLをコピーしました（30日間有効）');
    });

  const items = [
    {
      id: 'pptx',
      label: 'PowerPoint (.pptx)',
      hint: '社内・クライアント報告用',
      icon: Presentation,
      onClick: () => download('pptx'),
    },
    {
      id: 'pdf',
      label: 'PDF (.pdf)',
      hint: '印刷・メール添付向き',
      icon: FileType,
      onClick: () => download('pdf'),
    },
    {
      id: 'html',
      label: 'HTML (.html)',
      hint: 'ブラウザで開いて編集',
      icon: FileText,
      onClick: () => download('html'),
    },
    {
      id: 'url',
      label: '共有URL',
      hint: 'リンクをコピー（ログイン不要で閲覧）',
      icon: Link2,
      onClick: copyShareUrl,
    },
  ] as const;

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[52px] shrink-0 items-center justify-center gap-1 border border-neutral-300 px-3 text-xs disabled:opacity-50"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Download className={`h-4 w-4 ${busy ? 'animate-pulse' : ''}`} />
        <span className="hidden sm:inline">出力</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="メニューを閉じる"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute bottom-full right-0 z-50 mb-2 w-56 border border-neutral-200 bg-white py-1 shadow-lg"
            role="menu"
          >
            {items.map(({ id, label, hint, icon: Icon, onClick }) => (
              <button
                key={id}
                type="button"
                role="menuitem"
                disabled={busy}
                onClick={onClick}
                className="flex w-full gap-3 px-3 py-2.5 text-left hover:bg-neutral-50 disabled:opacity-50"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-neutral-600" />
                <span>
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-[10px] text-neutral-500">{hint}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {message && (
        <p className="absolute bottom-full right-0 z-50 mb-14 w-56 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] text-emerald-900">
          {message}
        </p>
      )}
    </div>
  );
}
