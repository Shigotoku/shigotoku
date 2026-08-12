import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, ImagePlus, Send, Wand2 } from 'lucide-react';
import { fetchIdeaInbox, submitIdeaInbox, useIdeaInbox, type IdeaInboxItem } from '../lib/api';
import { storeInboxHandoff } from '../lib/inboxHandoff';
import { getPostTemplates } from '../data/postTemplates';
import { useStore } from '../store/storeContext';
import EmptyState from '../components/EmptyState';

function statusLabel(status: string) {
  switch (status) {
    case 'pending':
      return '未使用';
    case 'used':
      return '使用済み';
    case 'archived':
      return 'アーカイブ';
    default:
      return status;
  }
}

export default function InboxPage() {
  const navigate = useNavigate();
  const { userRole } = useStore();
  const [ideas, setIdeas] = useState<IdeaInboxItem[]>([]);
  const [text, setText] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [usingId, setUsingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const templates = useMemo(() => getPostTemplates(), []);

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

  const goToCreator = (idea: IdeaInboxItem, path: string) => {
    storeInboxHandoff({
      ideaId: idea.id,
      text: idea.text,
      photoDataUrl: idea.photoDataUrl,
    });
    navigate(path);
  };

  const handleSubmit = async (andUse: boolean) => {
    if (!text.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const { idea } = await submitIdeaInbox({
        text: text.trim(),
        author: userRole === 'staff' ? 'スタッフ' : 'メンバー',
        authorRole: userRole ?? 'staff',
        photoDataUrl: photoDataUrl ?? undefined,
      });
      setText('');
      setPhotoDataUrl(null);
      if (andUse) {
        try {
          const r = await useIdeaInbox(idea.id);
          goToCreator(r.idea, r.magicCreatorPath);
        } catch {
          goToCreator(idea, `/magic-creator?idea=${encodeURIComponent(idea.text)}&from=inbox&inboxId=${idea.id}`);
        }
        return;
      }
      setMessage('ネタを送りました。「クリエイターで使う」ですぐ台本化できます。');
      load();
    } catch {
      setMessage('送信に失敗しました');
    }
    setBusy(false);
  };

  const handleUse = async (idea: IdeaInboxItem) => {
    setUsingId(idea.id);
    setMessage(null);
    try {
      const r = await useIdeaInbox(idea.id);
      goToCreator(r.idea, r.magicCreatorPath);
    } catch {
      // API 失敗時も手元のネタでクリエイターへ渡す
      storeInboxHandoff({
        ideaId: idea.id,
        text: idea.text,
        photoDataUrl: idea.photoDataUrl,
      });
      navigate(`/magic-creator?idea=${encodeURIComponent(idea.text)}&from=inbox&inboxId=${idea.id}`);
    }
    setUsingId(null);
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
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !text.trim()}
              onClick={() => handleSubmit(false)}
              className="inline-flex min-h-[44px] items-center gap-2 border border-neutral-300 px-3 text-sm disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              送信のみ
            </button>
            <button
              type="button"
              disabled={busy || !text.trim()}
              onClick={() => handleSubmit(true)}
              className="buzz-btn-primary disabled:opacity-60"
            >
              <Wand2 className="h-4 w-4" />
              送信してクリエイターへ
            </button>
          </div>
        </div>
        {message && <p className="text-sm text-neutral-600">{message}</p>}
        {templates.length > 0 && (
          <div className="border-t border-neutral-100 pt-3">
            <p className="mb-2 text-xs font-medium text-neutral-600">業種別テンプレから入れる</p>
            <div className="flex flex-wrap gap-2">
              {templates.slice(0, 6).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="border border-neutral-200 bg-[#f5f4f0] px-2.5 py-1.5 text-xs hover:border-neutral-900"
                  onClick={() => setText(t.idea)}
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {ideas.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="まだネタがありません"
          description="施術後や接客の一言を写真付きで送ると、すぐネタクリエイターで台本化できます。上のテンプレも使えます。"
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
                    {idea.author} · {new Date(idea.createdAt).toLocaleString('ja-JP')} · {statusLabel(idea.status)}
                  </p>
                  <button
                    type="button"
                    disabled={usingId === idea.id}
                    onClick={() => handleUse(idea)}
                    className="buzz-btn-primary mt-3 min-h-[44px] px-3 py-1.5 text-xs disabled:opacity-60"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    {usingId === idea.id
                      ? '開いています...'
                      : idea.status === 'used'
                        ? 'もう一度クリエイターで使う'
                        : 'クリエイターで使う'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
