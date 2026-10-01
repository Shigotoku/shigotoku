import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, ImagePlus, Send, Wand2 } from 'lucide-react';
import { fetchIdeaInbox, submitIdeaInbox, useIdeaInbox, type IdeaInboxItem } from '../lib/api';
import { storeInboxHandoff } from '../lib/inboxHandoff';
import { getPostTemplates } from '../data/postTemplates';
import { useStore } from '../store/storeContext';
import EmptyState from '../components/EmptyState';
import FlowProgressBar from '../components/FlowProgressBar';

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
    <div className="buzz-page pb-28 lg:pb-0">
      <FlowProgressBar current="inbox" className="buzz-fade-in" />

      <div className="buzz-card-pad space-y-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">投稿ネタを投げる</h2>
          <p className="mt-1 text-sm text-neutral-500">施術後の一言や写真を送るだけ。スタッフ全員が参加できます。</p>
        </div>
        <textarea
          className="buzz-input h-28 resize-none"
          placeholder="例: 今日のカラー、ビフォーアフター取れた！"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="buzz-btn-secondary !px-3 !py-2 text-sm cursor-pointer">
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
            <img src={photoDataUrl} alt="" className="h-14 w-14 rounded-lg border border-neutral-200 object-cover" />
          )}
        </div>

        {/* デスクトップ: インライン操作 */}
        <div className="hidden flex-wrap justify-end gap-2 sm:flex">
          <button
            type="button"
            disabled={busy || !text.trim()}
            onClick={() => handleSubmit(false)}
            className="buzz-btn-secondary !px-4 !py-2.5 text-sm disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            送信のみ
          </button>
          <button
            type="button"
            disabled={busy || !text.trim()}
            onClick={() => handleSubmit(true)}
            className="buzz-btn-accent !px-4 !py-2.5 text-sm disabled:opacity-60"
          >
            <Wand2 className="h-4 w-4" />
            送信してクリエイターへ
          </button>
        </div>

        {message && <p className="buzz-alert buzz-alert-info text-sm">{message}</p>}

        {templates.length > 0 && (
          <div className="border-t border-neutral-100 pt-3">
            <p className="mb-2 text-xs font-medium text-neutral-600">業種別テンプレから入れる</p>
            <div className="flex flex-wrap gap-2">
              {templates.slice(0, 6).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="buzz-chip hover:border-violet-200 hover:bg-violet-50"
                  onClick={() => setText(t.idea)}
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* モバイル: 下部固定CTA（下部ナビの上） */}
      <div
        className="fixed bottom-[3.25rem] left-0 right-0 z-30 border-t border-neutral-200/80 bg-white/95 p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.05)] backdrop-blur-md sm:hidden"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex max-w-lg gap-2">
          <button
            type="button"
            disabled={busy || !text.trim()}
            onClick={() => handleSubmit(false)}
            className="buzz-btn-secondary flex-1 !py-2.5 text-sm disabled:opacity-60"
          >
            送信
          </button>
          <button
            type="button"
            disabled={busy || !text.trim()}
            onClick={() => handleSubmit(true)}
            className="buzz-btn-accent flex-[1.4] !py-2.5 text-sm disabled:opacity-60"
          >
            <Wand2 className="h-4 w-4" />
            作る
          </button>
        </div>
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
          <p className="text-sm font-medium text-neutral-700">送ったネタ（{ideas.length}件）</p>
          {ideas.map((idea) => (
            <div key={idea.id} className="buzz-list-item">
              <div className="flex gap-3">
                {idea.photoDataUrl && (
                  <img
                    src={idea.photoDataUrl}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded-lg border border-neutral-200 object-cover"
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
                    className="buzz-btn-accent mt-3 !px-3 !py-1.5 text-xs disabled:opacity-60"
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
