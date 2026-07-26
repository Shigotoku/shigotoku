import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, ImagePlus, Send } from 'lucide-react';
import { fetchIdeaInbox, submitIdeaInbox, useIdeaInbox, type IdeaInboxItem } from '../lib/api';
import { useStore } from '../store/storeContext';
import EmptyState from '../components/EmptyState';

export default function InboxPage() {
  const navigate = useNavigate();
  const { userRole } = useStore();
  const [ideas, setIdeas] = useState<IdeaInboxItem[]>([]);
  const [text, setText] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => {
    fetchIdeaInbox()
      .then((r) => setIdeas(r.ideas))
      .catch(() => setIdeas([]));
  };

  useEffect(() => {
    load();
  }, []);

  const onPhoto = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await submitIdeaInbox({
        text: text.trim(),
        author: userRole === 'staff' ? 'スタッフ' : 'メンバー',
        authorRole: userRole ?? 'staff',
        photoDataUrl: photoDataUrl ?? undefined,
      });
      setText('');
      setPhotoDataUrl(null);
      setMessage('ネタを送りました。店長がクリエイターで使えます。');
      load();
    } catch {
      setMessage('送信に失敗しました');
    }
    setBusy(false);
  };

  const handleUse = async (id: string) => {
    try {
      const r = await useIdeaInbox(id);
      navigate(r.magicCreatorPath);
    } catch {
      setMessage('採用に失敗しました');
    }
  };

  return (
    <div className="buzz-page">
      <div className="buzz-card-pad space-y-3">
        <h3 className="font-medium">投稿ネタを投げる</h3>
        <textarea
          className="buzz-input h-24 resize-none"
          placeholder="例: 今日のカラー、ビフォーアフター取れた！"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 border border-neutral-300 px-3 text-sm">
            <ImagePlus className="h-4 w-4" />
            写真を添付
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPhoto(e.target.files?.[0] ?? null)}
            />
          </label>
          {photoDataUrl && (
            <img src={photoDataUrl} alt="" className="h-14 w-14 border border-neutral-200 object-cover" />
          )}
          <button
            type="button"
            disabled={busy || !text.trim()}
            onClick={handleSubmit}
            className="buzz-btn-primary ml-auto disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            送信
          </button>
        </div>
        {message && <p className="text-sm text-neutral-600">{message}</p>}
      </div>

      {ideas.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="まだネタがありません"
          description="施術後や接客の一言を写真付きで送ると、店長がマジック・クリエイターに流せます。"
          primaryLabel="クリエイターを開く"
          primaryTo="/magic-creator"
        />
      ) : (
        <div className="space-y-3">
          {ideas.map((idea) => (
            <div key={idea.id} className="border border-neutral-200 bg-white p-4">
              <div className="flex gap-3">
                {idea.photoDataUrl && (
                  <img
                    src={idea.photoDataUrl}
                    alt=""
                    className="h-20 w-20 shrink-0 border border-neutral-200 object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-neutral-900">{idea.text}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {idea.author} · {new Date(idea.createdAt).toLocaleString('ja-JP')} · {idea.status}
                  </p>
                  {idea.status === 'pending' && userRole !== 'staff' && (
                    <button
                      type="button"
                      onClick={() => handleUse(idea.id)}
                      className="mt-2 text-xs font-medium underline-offset-2 hover:underline"
                    >
                      採用してクリエイターへ
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
