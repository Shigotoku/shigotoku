import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { buildPreviewHtml, type ManualExportOptions } from '../lib/exportManual';
import type { ManualStep } from '../types';

type Props = {
  title: string;
  steps: ManualStep[];
  options?: ManualExportOptions;
  className?: string;
};

/** Word/HTML エクスポートと同じ HTML を iframe で表示 */
export default function ManualExportPreview({ title, steps, options = {}, className = '' }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    void (async () => {
      try {
        const html = await buildPreviewHtml(title, steps, options);
        if (cancelled || !iframeRef.current) return;
        const doc = iframeRef.current.contentDocument;
        if (!doc) throw new Error('プレビューを表示できません');
        doc.open();
        doc.write(html);
        doc.close();
        const imgs = doc.querySelectorAll('img');
        await Promise.all(
          [...imgs].map(
            (img) =>
              new Promise<void>((resolve) => {
                if (img.complete) resolve();
                else {
                  img.onload = () => resolve();
                  img.onerror = () => resolve();
                }
              }),
          ),
        );
        if (!cancelled) setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message ?? 'プレビューの生成に失敗しました');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [title, steps, options.description, options.tocEnabled]);

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80">
          <Loader2 className="animate-spin text-primary-500" size={28} />
        </div>
      )}
      {error && <p className="rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger-600">{error}</p>}
      <iframe
        ref={iframeRef}
        title="マニュアルプレビュー"
        className="min-h-[720px] w-full rounded-2xl border border-slate-200 bg-white shadow-sm"
        sandbox="allow-same-origin"
      />
    </div>
  );
}
