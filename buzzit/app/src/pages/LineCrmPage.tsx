import { useEffect, useState } from 'react';
import {
  MessageCircle,
  Tag,
  Link as LinkIcon,
  Send,
  Calendar,
  Image as ImageIcon,
  BarChart3,
  Copy,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
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
  fetchLineFriends,
  sendLineSegmentMessage,
  estimateLineSegment,
  updateLineFriendTags,
  fetchChatQueue,
  resolveChatQueueItem,
  fetchLineFriendDetail,
  fetchCoupons,
  createCoupon,
  redeemCoupon,
  previewLineFlex,
  type CustomerTag,
  type LineSource,
  type LineSegment,
  type LineStep,
  type LineRichMenuRecord,
  type LineInsights,
  type LineCostEstimate,
  type LineFriend,
} from '../lib/api';
import LineCostComparison from '../components/LineCostComparison';
import EmptyState from '../components/EmptyState';
import GlossTooltip from '../components/GlossTooltip';
import PlanLockNotice from '../components/PlanLockNotice';
import { useApp } from '../store/appContext';

type TabKey = 'friends' | 'sources' | 'segments' | 'steps' | 'chat' | 'coupons' | 'flex' | 'richmenu' | 'insights';

const tabs: Array<{ key: TabKey; label: string; icon: typeof Tag }> = [
  { key: 'friends', label: '友だち / タグ', icon: Tag },
  { key: 'sources', label: '流入経路', icon: LinkIcon },
  { key: 'segments', label: 'セグメント', icon: Send },
  { key: 'steps', label: 'シナリオ', icon: Calendar },
  { key: 'chat', label: '要返信', icon: MessageCircle },
  { key: 'coupons', label: 'クーポン', icon: Users },
  { key: 'flex', label: 'Flexメッセージ', icon: ImageIcon },
  { key: 'richmenu', label: 'リッチメニュー', icon: ImageIcon },
  { key: 'insights', label: 'インサイト', icon: BarChart3 },
];

export default function LineCrmPage() {
  const { plan } = useApp();
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
  const [friends, setFriends] = useState<LineFriend[]>([]);
  const [friendQuery, setFriendQuery] = useState('');
  const [segmentSendId, setSegmentSendId] = useState('');
  const [segmentSendText, setSegmentSendText] = useState('');
  const [sendingSegment, setSendingSegment] = useState(false);
  const [chatItems, setChatItems] = useState<
    Array<{ id: string; displayName: string; preview: string; status: string; createdAt: string }>
  >([]);
  const [coupons, setCoupons] = useState<
    Array<{ id: string; name: string; code: string; benefit: string; uses: number }>
  >([]);
  const [couponName, setCouponName] = useState('');
  const [couponBenefit, setCouponBenefit] = useState('');
  const [friendDetail, setFriendDetail] = useState<LineFriend | null>(null);
  const [flexTitle, setFlexTitle] = useState('今週の空き枠');
  const [flexBody, setFlexBody] = useState('気になる方は下のボタンから予約へ');
  const [flexJson, setFlexJson] = useState<string>('');
  const [stepMsg2, setStepMsg2] = useState('クーポンはメニューからどうぞ');

  const loadAll = () => {
    fetchCustomerTags().then((r) => setTags(r.tags)).catch(() => {});
    fetchLineSources().then((r) => setSources(r.sources)).catch(() => {});
    fetchLineSegments().then((r) => setSegments(r.segments)).catch(() => {});
    fetchLineSteps().then((r) => setSteps(r.steps)).catch(() => {});
    fetchLineRichMenus().then((r) => setRichMenus(r.menus)).catch(() => {});
    fetchLineInsights().then(setInsights).catch(() => {});
    fetchLineCostEstimate().then(setLineCost).catch(() => {});
    fetchLineFriends().then((r) => setFriends(r.friends)).catch(() => {});
    fetchChatQueue().then((r) => setChatItems(r.items)).catch(() => {});
    fetchCoupons().then((r) => setCoupons(r.coupons)).catch(() => {});
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
        messages: [
          { delayMinutes: 0, text: 'ご登録ありがとうございます！' },
          { delayMinutes: 60, text: stepMsg2 || 'クーポンはメニューからどうぞ' },
          { delayMinutes: 1440, text: 'ご来店の予定はありますか？空き枠をご案内できます。' },
        ],
        triggers: [{ kind: 'follow' }],
      });
      setNewStepName('');
      setMessage('シナリオ（3通）を作成しました');
      loadAll();
    } catch {
      setMessage('シナリオ作成に失敗しました（Pro プラン以上が必要です）');
    }
  };

  const handleSearchFriends = async () => {
    try {
      const r = await fetchLineFriends({ q: friendQuery.trim() || undefined });
      setFriends(r.friends);
    } catch {
      setMessage('友だち一覧の取得に失敗しました');
    }
  };

  const handleToggleFriendTag = async (friend: LineFriend, tagName: string) => {
    const next = friend.tags.includes(tagName)
      ? friend.tags.filter((t) => t !== tagName)
      : [...friend.tags, tagName];
    try {
      const r = await updateLineFriendTags(friend.lineUserId, next);
      setFriends((prev) => prev.map((f) => (f.lineUserId === friend.lineUserId ? r.friend : f)));
    } catch {
      setMessage('タグ更新に失敗しました');
    }
  };

  const handleSendSegment = async () => {
    if (!segmentSendId || !segmentSendText.trim()) return;
    setSendingSegment(true);
    try {
      const r = await sendLineSegmentMessage({
        segmentId: segmentSendId,
        text: segmentSendText.trim(),
      });
      setMessage(
        r.success
          ? `${r.recipients} 名に配信しました（${r.mode ?? 'segment'}）`
          : r.message || '配信に失敗しました',
      );
      if (r.success) setSegmentSendText('');
    } catch {
      setMessage('セグメント配信に失敗しました（Pro以上・トークン設定を確認）');
    }
    setSendingSegment(false);
  };

  const handleEstimateSegment = async (id: string) => {
    try {
      const r = await estimateLineSegment(id);
      setSegments((prev) =>
        prev.map((s) => (s.id === id ? { ...s, estimatedReach: r.estimatedReach } : s)),
      );
      setMessage(`推定リーチを更新しました: ${r.estimatedReach} 名`);
    } catch {
      setMessage('リーチ推定に失敗しました');
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
          {tags.length === 0 && friends.length === 0 && (
            <EmptyState
              icon={Users}
              title="LINE CRM を使い始めましょう"
              description="先に設定で LINE の Channel Access Token / Webhook を入れ、タグを1つ作るとセグメントやステップ配信が動き出します。アカウント未開設なら公式サイトからどうぞ。"
              primaryLabel="設定でLINE連携"
              primaryTo="/settings"
              secondaryLabel="成長ロードマップ"
              secondaryTo="/roadmap"
              externalLabel="LINE公式を開設"
              externalHref="https://www.linebiz.com/jp/entry/"
            />
          )}
          <div className="buzz-card-pad">
            <h3 className="mb-4 text-lg font-bold">友だち台帳</h3>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <input
                value={friendQuery}
                onChange={(e) => setFriendQuery(e.target.value)}
                placeholder="名前・IDで検索"
                className="buzz-input flex-1"
              />
              <button type="button" onClick={handleSearchFriends} className="buzz-btn-primary shrink-0">
                検索
              </button>
            </div>
            {friends.length === 0 ? (
              <p className="text-sm text-neutral-500">
                まだ友だち台帳が空です。Webhook 設定後に友だち追加があると自動でここに増えます。
              </p>
            ) : (
              <div className="space-y-2">
                {friends.slice(0, 50).map((f) => (
                  <div
                    key={f.lineUserId}
                    className="flex flex-col gap-2 border border-neutral-200 bg-neutral-50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <button
                        type="button"
                        className="font-medium underline-offset-2 hover:underline"
                        onClick={async () => {
                          try {
                            const r = await fetchLineFriendDetail(f.lineUserId);
                            setFriendDetail(r.friend);
                            setMessage(`詳細: 経路 ${r.friend.sourceId ?? '不明'} / タグ ${r.friend.tags.join(', ') || 'なし'}`);
                          } catch {
                            setFriendDetail(f);
                          }
                        }}
                      >
                        {f.displayName}
                      </button>
                      <p className="truncate text-xs text-neutral-500">
                        score {f.score} · {f.lineUserId}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tags.map((tag) => {
                          const on = f.tags.includes(tag.name);
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => handleToggleFriendTag(f, tag.name)}
                              className={`border px-2 py-0.5 text-[10px] ${
                                on
                                  ? 'border-neutral-900 bg-neutral-900 text-white'
                                  : 'border-neutral-300 bg-white text-neutral-600'
                              }`}
                            >
                              {tag.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
                <p className="text-sm text-neutral-500">上のフォームから最初のタグを追加できます。</p>
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
              精度を上げる場合は LINE の <GlossTooltip term="LIFF" /> アプリで sourceId を受け渡す構成も推奨です（中長期）。
            </p>
            {sources.some((s) => s.followsCount > 0 && s.blocksCount / Math.max(1, s.followsCount) > 0.25) && (
              <p className="mb-3 border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                ブロック率が高い経路があります。一斉配信を控え、セグメント配信へ切り替えましょう（コスト見積りタブ参照）。
              </p>
            )}
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
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-neutral-500">
                          推定リーチ {s.estimatedReach} / 条件 {s.conditions.length}件
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleEstimateSegment(s.id)}
                        className="text-xs text-neutral-700 underline-offset-2 hover:underline"
                      >
                        リーチ再計算
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 border-t border-neutral-200 pt-4">
              <h4 className="mb-2 font-medium">セグメント配信</h4>
              <p className="mb-3 text-xs text-neutral-500">
                100名未満は multicast、以上は narrowcast に自動切替します。
              </p>
              <select
                value={segmentSendId}
                onChange={(e) => setSegmentSendId(e.target.value)}
                className="buzz-input mb-2"
              >
                <option value="">セグメントを選択</option>
                {segments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <textarea
                value={segmentSendText}
                onChange={(e) => setSegmentSendText(e.target.value)}
                className="buzz-input mb-2 h-24 resize-none"
                placeholder="配信メッセージ"
              />
              <button
                type="button"
                disabled={sendingSegment || !segmentSendId || !segmentSendText.trim()}
                onClick={handleSendSegment}
                className="buzz-btn-primary disabled:opacity-60"
              >
                {sendingSegment ? '配信中...' : 'このセグメントに送る'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'steps' && (
        <div className="space-y-6">
          {!['pro', 'team', 'growth', 'enterprise'].includes(plan) && (
            <PlanLockNotice feature="segment" currentPlan={plan} />
          )}
          <div className="buzz-card-pad">
            <h3 className="mb-2 text-lg font-bold">シナリオビルダー（時系列）</h3>
            <p className="mb-4 text-sm text-neutral-600">
              友だち追加 → すぐ1通 → 1時間後 → 翌日、の流れを視覚的に作ります。分岐はタグ条件で拡張できます。
            </p>
            <div className="mb-4 flex flex-col gap-3">
              {[
                { t: '0分', d: 'ご登録ありがとうございます！' },
                { t: '1時間後', d: stepMsg2 },
                { t: '翌日', d: 'ご来店の予定はありますか？' },
              ].map((n, idx) => (
                <div key={n.t} className="flex items-start gap-3">
                  <div className="flex w-16 shrink-0 flex-col items-center">
                    <span className="flex h-8 w-8 items-center justify-center border border-neutral-900 text-xs font-bold">
                      {idx + 1}
                    </span>
                    {idx < 2 && <div className="mt-1 h-8 w-px bg-neutral-300" />}
                  </div>
                  <div className="flex-1 border border-neutral-200 bg-neutral-50 p-3 text-sm">
                    <p className="text-xs text-neutral-500">{n.t}</p>
                    {idx === 1 ? (
                      <input
                        className="buzz-input mt-1"
                        value={stepMsg2}
                        onChange={(e) => setStepMsg2(e.target.value)}
                      />
                    ) : (
                      <p className="mt-1">{n.d}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <input
                value={newStepName}
                onChange={(e) => setNewStepName(e.target.value)}
                placeholder="シナリオ名（例: 新規友だちウェルカム）"
                className="buzz-input flex-1"
              />
              <button type="button" onClick={handleCreateStep} className="buzz-btn-primary">
                <Plus className="h-4 w-4" />
                この流れで作成
              </button>
            </div>
            <div className="space-y-2">
              {steps.map((s) => (
                <div key={s.id} className="border border-neutral-200 bg-neutral-50 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{s.name}</p>
                    <span className="text-xs">{s.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">メッセージ {s.messages.length}件</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="buzz-card-pad space-y-3">
          <h3 className="text-lg font-bold">要返信キュー</h3>
          <p className="text-sm text-neutral-600">クーポン・予約などのキーワードが来た会話だけ溜めます。</p>
          {chatItems.filter((c) => c.status === 'open').length === 0 ? (
            <p className="text-sm text-neutral-500">未対応はありません。</p>
          ) : (
            chatItems
              .filter((c) => c.status === 'open')
              .map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-3 border border-neutral-200 p-3 text-sm">
                  <div>
                    <p className="font-medium">{c.displayName}</p>
                    <p className="mt-1 text-neutral-600">{c.preview}</p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-xs underline"
                    onClick={async () => {
                      await resolveChatQueueItem(c.id);
                      loadAll();
                    }}
                  >
                    対応済み
                  </button>
                </div>
              ))
          )}
        </div>
      )}

      {activeTab === 'coupons' && (
        <div className="buzz-card-pad space-y-4">
          <h3 className="text-lg font-bold">クーポン / 来店計測</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="buzz-input" placeholder="クーポン名" value={couponName} onChange={(e) => setCouponName(e.target.value)} />
            <input className="buzz-input" placeholder="特典内容" value={couponBenefit} onChange={(e) => setCouponBenefit(e.target.value)} />
          </div>
          <button
            type="button"
            className="buzz-btn-primary"
            onClick={async () => {
              if (!couponName || !couponBenefit) return;
              await createCoupon({ name: couponName, benefit: couponBenefit });
              setCouponName('');
              setCouponBenefit('');
              loadAll();
              setMessage('クーポンを作成しました');
            }}
          >
            発行
          </button>
          <div className="space-y-2">
            {coupons.map((c) => (
              <div key={c.id} className="flex items-center justify-between border border-neutral-200 p-3 text-sm">
                <div>
                  <p className="font-medium">
                    {c.name} <span className="text-xs text-neutral-500">#{c.code}</span>
                  </p>
                  <p className="text-xs text-neutral-600">
                    {c.benefit} · 利用 {c.uses}回
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs underline"
                  onClick={async () => {
                    const r = await redeemCoupon(c.id, '店頭で見せた');
                    setMessage(r.message);
                    loadAll();
                  }}
                >
                  来店記録
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'flex' && (
        <div className="buzz-card-pad space-y-4">
          <h3 className="text-lg font-bold">
            <GlossTooltip term="Flex" /> / クイックリプライ
          </h3>
          <input className="buzz-input" value={flexTitle} onChange={(e) => setFlexTitle(e.target.value)} />
          <textarea className="buzz-input h-24 resize-none" value={flexBody} onChange={(e) => setFlexBody(e.target.value)} />
          <button
            type="button"
            className="buzz-btn-primary"
            onClick={async () => {
              const r = await previewLineFlex({
                title: flexTitle,
                body: flexBody,
                ctaLabel: '予約する',
                ctaUri: 'https://lin.ee',
              });
              setFlexJson(JSON.stringify(r, null, 2));
              setMessage('Flex / クイックリプライのJSONを生成しました（コピーしてMessaging APIで利用可）');
            }}
          >
            プレビューJSONを生成
          </button>
          {flexJson && (
            <pre className="max-h-80 overflow-auto border border-neutral-200 bg-neutral-50 p-3 text-xs">{flexJson}</pre>
          )}
        </div>
      )}

      {friendDetail && (
        <div className="buzz-card-pad">
          <h3 className="mb-2 font-bold">友だち詳細</h3>
          <p className="text-sm">{friendDetail.displayName}</p>
          <p className="text-xs text-neutral-500">経路: {friendDetail.sourceId ?? '不明'}</p>
          <p className="text-xs text-neutral-500">タグ: {friendDetail.tags.join(', ') || 'なし'}</p>
          <p className="text-xs text-neutral-500">スコア: {friendDetail.score}</p>
          <p className="text-xs text-neutral-500">最終接触: {friendDetail.lastSeenAt}</p>
          <button type="button" className="mt-2 text-xs underline" onClick={() => setFriendDetail(null)}>
            閉じる
          </button>
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
