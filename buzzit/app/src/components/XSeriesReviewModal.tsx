import { useState } from 'react';
import { Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { addXSeriesItems } from '../lib/api';
import { composeTweetText, tweetCharCount } from '../lib/xSeriesCompose';

export type ReviewDraft = {
  text: string;
  tags?: string;
  title?: string;
  linkUrl?: string;
  imageUrl?: string;
  imageAlt?: string;
};

type Props = {
  open: boolean;
  seriesId: string;
  drafts: ReviewDraft[];
  onClose: () => void;
  onDone: (message: string) => void;
};

export default function XSeriesReviewModal({ open, seriesId, drafts, onClose, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const [approved, setApproved] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);

  if (!open || drafts.length === 0) return null;

  const current = drafts[index];
  const preview = composeTweetText(current);
  const chars = tweetCharCount(preview);
  const okCount = drafts.filter((_, i) => approved[i]).length;

  const toggle = () => setApproved((prev) => ({ ...prev, [index]: !prev[index] }));

  const finish = async () => {
    setBusy(true);
    try {
      const toAdd = drafts.map((d, i) => ({
        ...d,
        approved: !!approved[i],
      }));
      const r = await addXSeriesItems(seriesId, { items: toAdd });
      onDone(`${r.items.length} ???????????OK ${okCount} ??`);
      onClose();
    } catch (e) {
      onDone(e instanceof Error ? e.message : '?????????');
    }
    setBusy(false);
  };

  return (
    <div className="buzz-modal-overlay z-[60] items-end sm:items-center">
      <div className="buzz-modal max-w-md rounded-t-2xl sm:rounded-2xl">
        <div className="buzz-modal-header">
          <div>
            <h3 className="font-bold">???? {index + 1} / {drafts.length}</h3>
            <p className="text-xs text-neutral-500">?????????OK????????</p>
          </div>
        </div>
        <div className="buzz-modal-body space-y-3">
          <p className={`text-xs ${chars > 280 ? 'text-red-700' : 'text-neutral-500'}`}>{chars}/280 ??</p>
          <p className="whitespace-pre-wrap text-sm">{preview}</p>
          <button
            type="button"
            onClick={toggle}
            className={`flex w-full items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors ${
              approved[index] ? 'buzz-segment-active border-transparent' : 'buzz-segment'
            }`}
          >
            <Check className="h-4 w-4" />
            {approved[index] ? '??OK' : '??OK???'}
          </button>
        </div>
        <div className="buzz-modal-footer items-center justify-between">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => setIndex((i) => i - 1)}
            className="buzz-btn-ghost flex items-center gap-1 text-sm disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            ??
          </button>
          {index < drafts.length - 1 ? (
            <button
              type="button"
              onClick={() => setIndex((i) => i + 1)}
              className="buzz-btn-ghost flex items-center gap-1 text-sm"
            >
              ??
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={finish} className="buzz-btn-accent text-sm">
              {busy ? '???...' : `${drafts.length}????????`}
            </button>
          )}
          <button type="button" onClick={onClose} className="buzz-btn-ghost !p-1 text-neutral-400">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
