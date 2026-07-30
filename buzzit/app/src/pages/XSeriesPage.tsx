import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Plus,
  Trash2,
  Check,
  Play,
  Upload,
  Clock,
  RefreshCw,
} from 'lucide-react';
import {
  fetchXSeries,
  createXSeries,
  seedDefaultXSeries,
  deleteXSeries,
  fetchXSeriesItems,
  addXSeriesItems,
  updateXSeriesItem,
  deleteXSeriesItem,
  importXSeriesCsv,
  fetchXScheduleRules,
  createXScheduleRule,
  updateXScheduleRule,
  deleteXScheduleRule,
  runXSeriesNow,
  fetchSettings,
  type XSeries,
  type XSeriesItem,
  type XScheduleRule,
} from '../lib/api';
import EmptyState from '../components/EmptyState';

export default function XSeriesPage() {
  const [series, setSeries] = useState<XSeries[]>([]);
  const [rules, setRules] = useState<XScheduleRule[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<XSeriesItem[]>([]);
  const [xConnected, setXConnected] = useState(false);
  const [xPosts, setXPosts] = useState(0);
  const [xLimit, setXLimit] = useState(500);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [newName, setNewName] = useState('');
  const [draftText, setDraftText] = useState('');
  const [draftTags, setDraftTags] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftUrl, setDraftUrl] = useState('');
  const [draftImage, setDraftImage] = useState('');
  const [draftApproved, setDraftApproved] = useState(true);

  const [ruleDays, setRuleDays] = useState('平日');
  const [ruleTime, setRuleTime] = useState('07:30');
  const [ruleTake, setRuleTake] = useState(1);
  const [ruleJitter, setRuleJitter] = useState(20);
  const [ruleMode, setRuleMode] = useState<'x_free' | 'notify'>('x_free');

  const loadMeta = useCallback(async () => {
    const [s, r, settings] = await Promise.all([
      fetchXSeries(),
      fetchXScheduleRules(),
      fetchSettings().catch(() => null),
    ]);
    setSeries(s.series);
    setRules(r.rules);
    if (settings) {
      setXConnected(!!settings.xConnected);
      setXPosts(settings.xApiPostsThisMonth ?? 0);
      setXLimit(settings.xApiMonthlyLimit ?? 500);
    }
    if (!selectedId && s.series[0]) setSelectedId(s.series[0].id);
  }, [selectedId]);

  const loadItems = useCallback(async (id: string) => {
    const r = await fetchXSeriesItems(id);
    setItems(r.items);
  }, []);

  useEffect(() => {
    loadMeta().catch(() => setMessage('読み込みに失敗しました'));
  }, [loadMeta]);

  useEffect(() => {
    if (selectedId) loadItems(selectedId).catch(() => setItems([]));
  }, [selectedId, loadItems]);

  const selected = series.find((s) => s.id === selectedId) ?? null;

  const refresh = async () => {
    await loadMeta();
    if (selectedId) await loadItems(selectedId);
  };

  const handleCreateSeries = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const { series: created } = await createXSeries({ name: newName.trim() });
      setNewName('');
      setSelectedId(created.id);
      setMessage(`シリーズ「${created.name}」を作成しました`);
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '作成に失敗しました');
    }
    setBusy(false);
  };

  const handleSeed = async () => {
    setBusy(true);
    try {
      const pack = await seedDefaultXSeries();
      setMessage(`テンプレ ${pack.series.length} シリーズ・${pack.rules.length} ルールを作成しました`);
      await refresh();
      if (pack.series[0]) setSelectedId(pack.series[0].id);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'テンプレ作成に失敗しました');
    }
    setBusy(false);
  };

  const handleAddItem = async () => {
    if (!selectedId || !draftText.trim()) return;
    setBusy(true);
    try {
      await addXSeriesItems(selectedId, {
        text: draftText.trim(),
        tags: draftTags.trim() || undefined,
        title: draftTitle.trim() || undefined,
        linkUrl: draftUrl.trim() || undefined,
        imageUrl: draftImage.trim() || undefined,
        approved: draftApproved,
      });
      setDraftText('');
      setDraftTags('');
      setDraftTitle('');
      setDraftUrl('');
      setDraftImage('');
      setMessage('ネタをキューに追加しました');
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '追加に失敗しました');
    }
    setBusy(false);
  };

  const handleCsv = async (file: File | null) => {
    if (!file || !selectedId) return;
    setBusy(true);
    try {
      const csv = await file.text();
      const r = await importXSeriesCsv(selectedId, csv);
      setMessage(`${r.imported} 件をインポートしました`);
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'CSVインポートに失敗しました');
    }
    setBusy(false);
  };

  const handleToggleApproved = async (item: XSeriesItem) => {
    if (!selectedId) return;
    await updateXSeriesItem(selectedId, item.id, { approved: !item.approved });
    await loadItems(selectedId);
  };

  const handleRunNow = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const r = await runXSeriesNow({
        seriesId: selectedId,
        take: 1,
        mode: xConnected ? 'x_free' : 'notify',
      });
      setMessage(
        `即時実行: 成功 ${r.posted ?? 0} / 失敗 ${r.errors ?? 0}${(r.messages ?? []).length ? ` — ${r.messages?.[0]}` : ''}`,
      );
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '実行に失敗しました');
    }
    setBusy(false);
  };

  const handleAddRule = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      await createXScheduleRule({
        seriesId: selectedId,
        days: ruleDays.trim(),
        timeHHMM: ruleTime.trim(),
        take: ruleTake,
        jitterMaxMin: ruleJitter,
        publishMode: ruleMode,
      });
      setMessage('スケジュールルールを追加しました');
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'ルール追加に失敗しました');
    }
    setBusy(false);
  };

  return (
    <div className="buzz-page">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-neutral-600">
          Sheets運用と同じく「投稿OKの在庫」を曜日×時刻で自動消化します。ジッターあり。
          {xConnected
            ? ` X接続済み · 今月 ${xPosts}/${xLimit}`
            : ' （未接続時は通知モード推奨）'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link to="/settings" className="min-h-[44px] border border-neutral-300 px-3 py-2 text-xs">
            X API 設定
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={handleSeed}
            className="min-h-[44px] border border-neutral-300 px-3 py-2 text-xs disabled:opacity-60"
          >
            医療テンプレを作成
          </button>
        </div>
      </div>

      {message && <p className="buzz-alert buzz-alert-info text-sm">{message}</p>}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-2">
          <div className="buzz-card-pad space-y-3">
            <h3 className="font-semibold">シリーズ</h3>
            <div className="flex gap-2">
              <input
                className="buzz-input"
                placeholder="例: A_論文"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <button
                type="button"
                disabled={busy || !newName.trim()}
                onClick={handleCreateSeries}
                className="buzz-btn-primary shrink-0 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {series.length === 0 ? (
              <EmptyState
                icon={Layers}
                title="シリーズがありません"
                description="右上の「医療テンプレを作成」か、上の入力欄でシリーズ名を追加してください。"
                primaryLabel="設定で X API を連携"
                primaryTo="/settings"
              />
            ) : (
              <div className="space-y-2">
                {series.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    className={`flex w-full items-center justify-between border px-3 py-3 text-left text-sm ${
                      selectedId === s.id
                        ? 'border-neutral-900 bg-neutral-100'
                        : 'border-neutral-200 bg-white'
                    }`}
                  >
                    <span>
                      <span className="font-medium">{s.name}</span>
                      <span className="mt-0.5 block text-xs text-neutral-500">
                        承認待ち在庫 {s.approvedCount ?? 0} / 未投稿 {s.pendingCount ?? 0}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="p-2 text-neutral-400 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!confirm(`「${s.name}」を削除しますか？`)) return;
                        deleteXSeries(s.id).then(refresh);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="buzz-card-pad space-y-3">
            <h3 className="flex items-center gap-2 font-semibold">
              <Clock className="h-4 w-4" />
              スケジュールルール
            </h3>
            <p className="text-xs text-neutral-500">
              曜日は 毎日 / 平日 / 土日 / 月水木金 など。時刻は HH:MM。ジッターは指定時刻からの遅延（分）。
            </p>
            {selected && (
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="buzz-input"
                  value={ruleDays}
                  onChange={(e) => setRuleDays(e.target.value)}
                  placeholder="曜日"
                />
                <input
                  className="buzz-input"
                  value={ruleTime}
                  onChange={(e) => setRuleTime(e.target.value)}
                  placeholder="07:30"
                />
                <input
                  type="number"
                  min={1}
                  max={5}
                  className="buzz-input"
                  value={ruleTake}
                  onChange={(e) => setRuleTake(Number(e.target.value) || 1)}
                  placeholder="件数"
                />
                <input
                  type="number"
                  min={0}
                  max={60}
                  className="buzz-input"
                  value={ruleJitter}
                  onChange={(e) => setRuleJitter(Number(e.target.value) || 0)}
                  placeholder="ジッター分"
                />
                <select
                  className="buzz-input sm:col-span-2"
                  value={ruleMode}
                  onChange={(e) => setRuleMode(e.target.value as 'x_free' | 'notify')}
                >
                  <option value="x_free">X API 自動投稿</option>
                  <option value="notify">通知リマインダー</option>
                </select>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleAddRule}
                  className="buzz-btn-primary sm:col-span-2 disabled:opacity-60"
                >
                  このシリーズにルール追加
                </button>
              </div>
            )}
            <div className="space-y-2">
              {rules.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start justify-between gap-2 border border-neutral-200 bg-white p-3 text-xs"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {r.seriesName ?? r.seriesId} · {r.days} {r.timeHHMM}
                    </p>
                    <p className="text-neutral-500">
                      {r.take}件 · ジッター{r.jitterMaxMin}分 · {r.publishMode}
                      {!r.enabled ? ' · 停止中' : ''}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="border border-neutral-300 px-2 py-1"
                      onClick={() => updateXScheduleRule(r.id, { enabled: !r.enabled }).then(refresh)}
                    >
                      {r.enabled ? '停止' : '有効'}
                    </button>
                    <button
                      type="button"
                      className="p-1 text-neutral-400 hover:text-red-700"
                      onClick={() => deleteXScheduleRule(r.id).then(refresh)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3 lg:col-span-3">
          {!selected ? (
            <EmptyState
              icon={Layers}
              title="シリーズを選択"
              description="左からシリーズを選ぶか、新規作成してください。"
              primaryLabel="クリエイターでネタを作る"
              primaryTo="/magic-creator"
            />
          ) : (
            <>
              <div className="buzz-card-pad space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">{selected.name} のキュー</h3>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-1 border border-neutral-300 px-3 text-xs">
                      <Upload className="h-3.5 w-3.5" />
                      CSV
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={(e) => handleCsv(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleRunNow}
                      className="buzz-btn-primary text-xs disabled:opacity-60"
                    >
                      <Play className="h-3.5 w-3.5" />
                      1件すぐ投稿
                    </button>
                    <button
                      type="button"
                      onClick={refresh}
                      className="inline-flex min-h-[44px] items-center gap-1 border border-neutral-300 px-3 text-xs"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      更新
                    </button>
                  </div>
                </div>

                <textarea
                  className="buzz-input h-24 resize-none"
                  placeholder="ツイート本文（スレッドは --- または 1/ 2/ で分割）"
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className="buzz-input"
                    placeholder="タグ #example"
                    value={draftTags}
                    onChange={(e) => setDraftTags(e.target.value)}
                  />
                  <input
                    className="buzz-input"
                    placeholder="タイトル"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                  />
                  <input
                    className="buzz-input"
                    placeholder="URL"
                    value={draftUrl}
                    onChange={(e) => setDraftUrl(e.target.value)}
                  />
                  <input
                    className="buzz-input"
                    placeholder="画像URL"
                    value={draftImage}
                    onChange={(e) => setDraftImage(e.target.value)}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draftApproved}
                    onChange={(e) => setDraftApproved(e.target.checked)}
                  />
                  投稿OK（承認済みとしてキューイン）
                </label>
                <button
                  type="button"
                  disabled={busy || !draftText.trim()}
                  onClick={handleAddItem}
                  className="buzz-btn-primary disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  キューに追加
                </button>
              </div>

              <div className="space-y-2">
                {items.length === 0 && (
                  <p className="text-sm text-neutral-500">まだネタがありません。追加するか CSV を取り込んでください。</p>
                )}
                {items.map((item) => (
                  <div key={item.id} className="border border-neutral-200 bg-white p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-neutral-500">
                        {item.status}
                        {item.approved ? ' · 投稿OK' : ' · 未承認'}
                        {item.publishedAt
                          ? ` · ${new Date(item.publishedAt).toLocaleString('ja-JP')}`
                          : ''}
                      </span>
                      <div className="flex gap-2">
                        {item.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleToggleApproved(item)}
                            className={`inline-flex min-h-[36px] items-center gap-1 border px-2 text-xs ${
                              item.approved
                                ? 'border-neutral-900 bg-neutral-900 text-white'
                                : 'border-neutral-300'
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                            {item.approved ? 'OK解除' : '投稿OK'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedId) return;
                            deleteXSeriesItem(selectedId, item.id).then(() => loadItems(selectedId));
                          }}
                          className="p-1 text-neutral-400 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-neutral-800">{item.text}</p>
                    {(item.title || item.linkUrl || item.tags) && (
                      <p className="mt-2 text-xs text-neutral-500">
                        {[item.tags, item.title, item.linkUrl].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {item.errorMessage && (
                      <p className="mt-2 text-xs text-red-700">{item.errorMessage}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
