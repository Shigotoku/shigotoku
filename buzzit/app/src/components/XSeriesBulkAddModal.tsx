import { useState } from 'react';
import { Sparkles, ClipboardPaste, X, Link2 } from 'lucide-react';
import {
  generateXSeriesBatch,
  importXSeriesPaste,
  enrichXSeriesUrl,
  type ReviewDraftItem,
} from '../lib/api';
import type { XSeriesCapabilities } from '../lib/xSeriesFeatures';

type Tab = 'ai' | 'paste';

type Props = {
  open: boolean;
  seriesId: string;
  seriesName: string;
  caps: XSeriesCapabilities;
  onClose: () => void;
  onDone: (message: string) => void;
  onReview?: (drafts: ReviewDraftItem[]) => void;
};

export default function XSeriesBulkAddModal({
  open,
  seriesId,
  seriesName,
  caps,
  onClose,
  onDone,
  onReview,
}: Props) {
  const [tab, setTab] = useState<Tab>('ai');
  const [source, setSource] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [approveOnAdd, setApproveOnAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrichUrl, setEnrichUrl] = useState('');

  if (!open) return null;

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (tab === 'ai') {
        if (caps.aiBatchMax === 0) {
          setError(caps.upgradeHint ?? 'AI一括生成は Starter 以上で利用できます');
          setBusy(false);
          return;
        }
        const lines = source.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        if (!lines.length) {
          setError('1行以上入力してください');
          setBusy(false);
          return;
        }
        if (lines.length > caps.aiBatchMax) {
          setError(`最大 ${caps.aiBatchMax} 行まで（現在のプラン）`);
          setBusy(false);
          return;
        }
        const useReview = caps.bulkReview && !!onReview;
        const r = await generateXSeriesBatch(seriesId, {
          source,
          approved: approveOnAdd,
          seriesHint: seriesName,
          dryRun: useReview,
        });
        const drafts = r.items as ReviewDraftItem[];
        if (useReview && drafts.length) {
          onReview!(drafts);
          onClose();
          setBusy(false);
          return;
        }
        onDone(
          `AIで ${r.generated} 件をキューに追加しました${r.usedGemini ? '' : '（オフラインモード）'}`,
        );
      } else {
        const r = await importXSeriesPaste(seriesId, pasteText, approveOnAdd);
        onDone(`${r.imported} 件を貼り付けから追加しました`);
      }
      setSource('');
      setPasteText('');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '追加に失敗しました');
    }
    setBusy(false);
  };

  const handleEnrich = async () => {
    if (!caps.urlEnrich) {
      setError(caps.upgradeHint ?? 'URL自動取得は Starter 以上です');
      return;
    }
    if (!enrichUrl.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await enrichXSeriesUrl(enrichUrl.trim());
      const line = [r.suggestedText, r.title, r.linkUrl].filter(Boolean).join(' | ');
      setSource((prev) => (prev ? `${prev}\n${line}` : line));
      setEnrichUrl('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'URL取得に失敗しました');
    }
    setBusy(false);
  };

  return (
    <div className="buzz-modal-overlay items-end sm:items-center" onClick={() => !busy && onClose()}>
      <div className="buzz-modal max-w-lg rounded-t-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="buzz-modal-header">
          <div>
            <h3 className="text-lg font-bold">一括でキューに追加</h3>
            <p className="text-xs text-neutral-500">
              {seriesName}
              {caps.aiBatchMax > 0 ? ` · AI最大${caps.aiBatchMax}件` : ' · AIはStarter以降'}
            </p>
          </div>
          <button type="button" disabled={busy} onClick={onClose} className="buzz-btn-ghost !p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex shrink-0 gap-1 border-b border-neutral-100 px-5 pt-2">
          <button
            type="button"
            onClick={() => setTab('ai')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm ${
              tab === 'ai' ? 'border-violet-600 font-semibold text-violet-700' : 'border-transparent text-neutral-500'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            AI一括生成
          </button>
          <button
            type="button"
            onClick={() => setTab('paste')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm ${
              tab === 'paste' ? 'border-violet-600 font-semibold text-violet-700' : 'border-transparent text-neutral-500'
            }`}
          >
            <ClipboardPaste className="h-4 w-4" />
            テキスト貼り付け
          </button>
        </div>

        <div className="buzz-modal-body space-y-3">
          {tab === 'ai' ? (
            <>
              <p className="text-sm text-neutral-600">
                論文URL・テーマを<strong>1行1件</strong>。生成後はレビュー画面で投稿OKを選べます（Starter以上）。
              </p>
              {caps.urlEnrich && (
                <div className="flex gap-2">
                  <input
                    className="buzz-input flex-1 text-sm"
                    placeholder="URLを貼って自動で1行追加"
                    value={enrichUrl}
                    onChange={(e) => setEnrichUrl(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleEnrich}
                    className="buzz-btn-secondary shrink-0 !px-3 !py-2"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <textarea
                className="buzz-input h-40 resize-none font-mono text-sm"
                placeholder={`例:\nhttps://pubmed.ncbi.nlm.nih.gov/...\nGLP-1と消化器がん`}
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </>
          ) : (
            <>
              <p className="text-sm text-neutral-600">
                空行または --- で区切って貼り付け（最大{caps.pasteBatchMax}件）。
              </p>
              <textarea
                className="buzz-input h-40 resize-none text-sm"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
            </>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={approveOnAdd}
              onChange={(e) => setApproveOnAdd(e.target.checked)}
              className="accent-violet-600"
            />
            追加時に投稿OK（レビューなしの場合）
          </label>

          {caps.upgradeHint && tab === 'ai' && caps.aiBatchMax < 30 && (
            <p className="text-xs text-neutral-500">{caps.upgradeHint}</p>
          )}
          {error && <p className="buzz-alert buzz-alert-error text-sm">{error}</p>}
        </div>

        <div className="buzz-modal-footer">
          <button type="button" disabled={busy} onClick={submit} className="buzz-btn-accent w-full disabled:opacity-70">
            {busy ? '処理中...' : tab === 'ai' ? 'AIで生成' : '貼り付けを追加'}
          </button>
        </div>
      </div>
    </div>
  );
}
