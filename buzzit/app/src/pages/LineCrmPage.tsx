import { useEffect, useState } from 'react';
import { MessageCircle, Tag, Link as LinkIcon, Send, Calendar, Image as ImageIcon, BarChart3, Copy, Plus, Trash2 } from 'lucide-react';
import {
  fetchCustomerTags,
  fetchLineSources,
  createLineSource,
  fetchLineSegments,
  createLineSegment,
  fetchLineSteps,
  createLineStep,
  fetchLineRichMenus,
  fetchLineInsights,
  fetchLineCostEstimate,
  createLineTag,
  deleteLineTag,
  type CustomerTag,
  type LineSource,
  type LineSegment,
  type LineStep,
  type LineRichMenuRecord,
  type LineInsights,
  type LineCostEstimate,
} from '../lib/api';
import LineCostComparison from '../components/LineCostComparison';

type TabKey = 'friends' | 'sources' | 'segments' | 'steps' | 'richmenu' | 'insights';

const tabs: Array<{ key: TabKey; label: string; icon: typeof Tag }> = [
  { key: 'friends', label: '友だち / タグ', icon: Tag },
  { key: 'sources', label: '流入経路', icon: LinkIcon },
  { key: 'segments', label: 'セグメント', icon: Send },
  { key: 'steps', label: 'ステップ配信', icon: Calendar },
  { key: 'richmenu', label: 'リッチメニュー', icon: ImageIcon },
  { key: 'insights', label: 'インサイト', icon: BarChart3 },
];

export default function LineCrmPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('friends');
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [sources, setSources] = useState<LineSource[]>([]);
  const [segments, setSegments] = useState<LineSegment[]>([]);
  const [steps, setSteps] = useState<LineStep[]>([]);
  const [richMenus, setRichMenus] = useState<LineRichMenuRecord[]>([]);
  const [insights, setInsights] = useState<LineInsights | null>(null);
  const [lineCost, setLineCost] = useState<LineCostEstimate | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [newSourceLabel, setNewSourceLabel] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSegmentName, setNewSegmentName] = useState('');
  const [newStepName, setNewStepName] = useState('');

  const loadAll = () => {
    fetchCustomerTags().then((r) => setTags(r.tags)).catch(() => {});
    fetchLineSources().then((r) => setSources(r.sources)).catch(() => {});
    fetchLineSegments().then((r) => setSegments(r.segments)).catch(() => {});
    fetchLineSteps().then((r) => setSteps(r.steps)).catch(() => {});
    fetchLineRichMenus().then((r) => setRichMenus(r.menus)).catch(() => {});
    fetchLineInsights().then(setInsights).catch(() => {});
    fetchLineCostEstimate().then(setLineCost).catch(() => {});
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      await createLineTag({ name: newTagName.trim() });
      setNewTagName('');
      setMessage('タグを追加しました');
      loadAll();
    } catch {
      setMessage('タグ追加に失敗しました');
    }
  };

  const handleDeleteTag = async (id: string) => {
    try {
      await deleteLineTag(id);
      loadAll();
    } catch {
      setMessage('削除に失敗しました');
    }
  };

  const handleCreateSource = async () => {
    if (!newSourceLabel.trim() || !newSourceUrl.trim()) return;
    try {
      const r = await createLineSource({ label: newSourceLabel.trim(), addFriendUrl: newSourceUrl.trim() });
      await navigator.clipboard?.writeText(r.shortUrl).catch(() => {});
      setMessage(`流入経路を作成しました。短縮URLをクリップボードにコピーしました: ${r.shortUrl}`);
      setNewSourceLabel('');
      setNewSourceUrl('');
      loadAll();
    } catch {
      setMessage('流入経路作成に失敗しました');
    }
  };

  const handleCreateSegment = async () => {
    if (!newSegmentName.trim()) return;
    try {
      await createLineSegment({ name: newSegmentName.trim(), conditions: [] });
      setNewSegmentName('');
      setMessage('セグメントを作成しました');
      loadAll();
    } catch {
      setMessage('セグメント作成に失敗しました（Pro プラン以上が必要です）');
    }
  };

  const handleCreateStep = async () => {
    if (!newStepName.trim()) return;
    try {
      await createLineStep({
        name: newStepName.trim(),
        messages: [{ delayMinutes: 0, message: { type: 'text', text: 'ご登録ありがとうございます！' } }],
        triggers: [{ kind: 'follow' }],
      });
      setNewStepName('');
      setMessage('ステップ配信を作成しました');
      loadAll();
    } catch {
      setMessage('ステップ配信作成に失敗しました（Pro プラン以上が必要です）');
    }
  };

  return (
    <div className="buzz-page">
      <div>
        <h2 className="mb-2 flex items-center gap-2 text-2xl font-bold">
          <MessageCircle className="h-6 w-6 text-neutral-700" />
          LINE CRM
          <span className="ml-2 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs font-normal text-neutral-600">
            Lステップ完全代替
          </span>
        </h2>
        <p className="text-neutral-600">
          LINE Messaging API 直結。タグ・流入経路・セグメント・ステップ配信・リッチメニュー・インサイトを統合。
        </p>
      </div>

      {message && <p className="buzz-alert buzz-alert-info">{message}</p>}

      <div className="flex gap-1 overflow-x-auto border-b border-neutral-200 pb-px">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = t.key === activeTab;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'friends' && (
        <div className="space-y-6">
          <div className="buzz-card-pad">
            <h3 className="mb-4 text-lg font-bold">顧客タグ</h3>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="新しいタグ名（例: VIP, 春カラー興味）"
                className="buzz-input flex-1"
              />
              <button type="button" onClick={handleCreateTag} className="buzz-btn-primary shrink-0">
                <Plus className="h-4 w-4" />
                追加
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.length === 0 ? (
                <p className="text-sm text-neutral-500">タグはまだありません。</p>
              ) : (
                tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-2 border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: tag.color }} />
                    {tag.name}
                    <span className="text-neutral-500">{tag.friendCount}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteTag(tag.id)}
                      className="text-neutral-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sources' && (
        <div className="space-y-6">
          <div className="buzz-card-pad">
            <h3 className="mb-2 text-lg font-bold">流入経路</h3>
            <p className="mb-4 text-sm text-neutral-600">
              チラシ・Instagramプロフィール・店内QRなどに貼る短縮URLを発行します。
              友だち追加時に経路が自動記録され、追加数・ブロック率を計測できます。
            </p>
            <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                value={newSourceLabel}
                onChange={(e) => setNewSourceLabel(e.target.value)}
                placeholder="経路名（例: A4チラシ_3月号）"
                className="buzz-input"
              />
              <input
                value={newSourceUrl}
                onChange={(e) => setNewSourceUrl(e.target.value)}
                placeholder="LINE 友だち追加URL（https://lin.ee/...）"
                className="buzz-input sm:col-span-1"
              />
              <button type="button" onClick={handleCreateSource} className="buzz-btn-primary">
                <Plus className="h-4 w-4" />
                発行 + コピー
              </button>
            </div>
            <div className="space-y-2">
              {sources.length === 0 ? (
                <p className="text-sm text-neutral-500">経路はまだありません。</p>
              ) : (
                sources.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col gap-2 border border-neutral-200 bg-neutral-50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">{s.label}</p>
                      <p className="text-xs text-neutral-500">追加 {s.followsCount} / ブロック {s.blocksCount}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(s.addFriendUrl)}
                      className="inline-flex items-center gap-1 text-xs text-neutral-700 hover:text-neutral-900"
                    >
                      <Copy className="h-3 w-3" />
                      URLコピー
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'segments' && (
        <div className="space-y-6">
          <div className="buzz-card-pad">
            <h3 className="mb-1 text-lg font-bold">配信コスト試算 — Lステップ vs BuzzIt</h3>
            <p className="mb-4 text-sm text-neutral-600">
              月間配信通数を入力すると、LINE公式料金＋CRMツール料の合計を比較できます。
            </p>
            <LineCostComparison estimate={lineCost} />
          </div>

          <div className="buzz-card-pad">
            <h3 className="mb-4 text-lg font-bold">セグメント</h3>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <input
                value={newSegmentName}
                onChange={(e) => setNewSegmentName(e.target.value)}
                placeholder="セグメント名（例: 30日未来店のVIP）"
                className="buzz-input flex-1"
              />
              <button type="button" onClick={handleCreateSegment} className="buzz-btn-primary">
                <Plus className="h-4 w-4" />
                作成
              </button>
            </div>
            <div className="space-y-2">
              {segments.length === 0 ? (
                <p className="text-sm text-neutral-500">セグメントはまだありません。</p>
              ) : (
                segments.map((s) => (
                  <div key={s.id} className="border border-neutral-200 bg-neutral-50 p-3 text-sm">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-neutral-500">推定リーチ {s.estimatedReach} / 条件 {s.conditions.length}件</p>
                  </div>
                ))
              )}
            </div>
            <p className="mt-4 text-xs text-neutral-500">
              ※ Narrowcast 配信は最小オーディエンスサイズ 100名（LINE 公式仕様）。
            </p>
          </div>
        </div>
      )}

      {activeTab === 'steps' && (
        <div className="space-y-6">
          <div className="buzz-card-pad">
            <h3 className="mb-4 text-lg font-bold">ステップ配信シナリオ</h3>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <input
                value={newStepName}
                onChange={(e) => setNewStepName(e.target.value)}
                placeholder="シナリオ名（例: 新規友だちウェルカム）"
                className="buzz-input flex-1"
              />
              <button type="button" onClick={handleCreateStep} className="buzz-btn-primary">
                <Plus className="h-4 w-4" />
                新規作成
              </button>
            </div>
            <div className="space-y-2">
              {steps.length === 0 ? (
                <p className="text-sm text-neutral-500">シナリオはまだありません。「新規作成」で初期メッセージ付きのシナリオが作られます。</p>
              ) : (
                steps.map((s) => (
                  <div key={s.id} className="border border-neutral-200 bg-neutral-50 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{s.name}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          s.status === 'active'
                            ? 'border border-neutral-300 bg-white text-neutral-800'
                            : 'bg-neutral-200 text-neutral-600'
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">メッセージ {s.messages.length}件</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'richmenu' && (
        <div className="space-y-6">
          <div className="buzz-card-pad">
            <h3 className="mb-4 text-lg font-bold">リッチメニュー</h3>
            <p className="text-sm text-neutral-600">
              画像 2500×1686 px、エリア最大20個。セグメント別の自動切替に対応（Growth OS）。
            </p>
            <div className="mt-4 space-y-2">
              {richMenus.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  リッチメニューはまだありません。設定後 LINE API でリアルタイムに切り替えられます。
                </p>
              ) : (
                richMenus.map((m) => (
                  <div key={m.id} className="border border-neutral-200 bg-neutral-50 p-3 text-sm">
                    <p className="font-medium">{m.name}</p>
                    {m.lineRichMenuId && (
                      <p className="text-xs text-neutral-500">LINE ID: {m.lineRichMenuId}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="buzz-card-pad">
              <p className="text-xs uppercase tracking-wider text-neutral-500">友だち数（昨日時点）</p>
              <p className="buzz-stat-value mt-2 text-3xl">
                {insights?.followers?.count?.toLocaleString() ?? '—'}
              </p>
              <p className="mt-2 text-xs text-neutral-500">
                ターゲットリーチ: {insights?.followers?.targetedReaches?.toLocaleString() ?? '—'}
              </p>
            </div>
            <div className="buzz-card-pad">
              <p className="text-xs uppercase tracking-wider text-neutral-500">人口統計分布</p>
              <p className="mt-2 text-sm text-neutral-700">
                {insights?.demographic ? '取得済み（性別・年代・地域・OS）' : 'まだ十分なデータがありません'}
              </p>
              <p className="mt-2 text-xs text-neutral-500">
                LINE 公式仕様により、友だち数が一定数を超えると有効化されます。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
