import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { updateXSeriesItem, type XSeriesItem } from '../lib/api';
import { composeTweetText, tweetCharCount } from '../lib/xSeriesCompose';

type Props = {
  open: boolean;
  seriesId: string;
  item: XSeriesItem | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function XSeriesEditModal({ open, seriesId, item, onClose, onSaved }: Props) {
  const [text, setText] = useState('');
  const [tags, setTags] = useState('');
  const [title, setTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!item) return;
    setText(item.text);
    setTags(item.tags ?? '');
    setTitle(item.title ?? '');
    setLinkUrl(item.linkUrl ?? '');
    setImageUrl(item.imageUrl ?? '');
    setImageAlt(item.imageAlt ?? '');
  }, [item]);

  const preview = useMemo(
    () => composeTweetText({ text, tags, title, linkUrl }),
    [text, tags, title, linkUrl],
  );
  const chars = tweetCharCount(preview);

  if (!open || !item) return null;

  const save = async () => {
    setBusy(true);
    try {
      await updateXSeriesItem(seriesId, item.id, {
        text: text.trim(),
        tags,
        title,
        linkUrl,
        imageUrl,
        imageAlt,
      });
      onSaved();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="buzz-modal-overlay items-end sm:items-center" onClick={onClose}>
      <div className="buzz-modal max-w-lg rounded-t-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="buzz-modal-header">
          <h3 className="font-bold">?????</h3>
          <button type="button" onClick={onClose} className="buzz-btn-ghost !p-1">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="buzz-modal-body space-y-3">
          <textarea className="buzz-input h-24" value={text} onChange={(e) => setText(e.target.value)} />
          <input className="buzz-input" placeholder="??" value={tags} onChange={(e) => setTags(e.target.value)} />
          <input className="buzz-input" placeholder="????" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="buzz-input" placeholder="URL" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
          <input className="buzz-input" placeholder="??URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          <input className="buzz-input" placeholder="??ALT" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} />
          <div className="buzz-surface p-3">
            <p className={`text-xs font-medium ${chars > 280 ? 'text-red-700' : 'text-neutral-600'}`}>
              ????? {chars}/280 ??{chars > 280 ? '????' : ''}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm">{preview}</p>
            {imageUrl && (
              <img src={imageUrl} alt={imageAlt || ''} className="mt-2 max-h-32 rounded-lg border object-cover" />
            )}
          </div>
        </div>
        <div className="buzz-modal-footer">
          <button type="button" disabled={busy || !text.trim()} onClick={save} className="buzz-btn-primary w-full">
            {busy ? '???...' : '??'}
          </button>
        </div>
      </div>
    </div>
  );
}
