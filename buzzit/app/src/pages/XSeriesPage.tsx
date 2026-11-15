import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Plus,
  Trash2,
  Play,
  Upload,
  Clock,
  RefreshCw,
  ImagePlus,
  X as XIcon,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { settingsPath } from '../lib/settingsUrls';
import {
  fetchXSeries,
  createXSeries,
  seedDefaultXSeries,
  deleteXSeries,
  fetchXSeriesItems,
  fetchAllXSeriesItems,
  updateXSeries,
  generateXSeriesBatch,
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
import { uploadMediaToGcp } from '../services/mediaUpload';
import { MAX_IMAGE_BYTES } from '../types/media';
import EmptyState from '../components/EmptyState';

/** ISO → datetime-local 用（ローカル時刻） */
function toLocalInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function fromLocalInput(v: string): string {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

/** 「すべてのシリーズ」を表す選択ID */
const ALL = '__all__';

const STATUS_LABEL: Record<string, string> = {
  pending: '待機',
  publishing: '投稿中',
  published: '済',
  failed: '失敗',
};

/** 画像ファイルをアップロードして公開URLを返す */
async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('画像ファイルを選んでください');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('画像は10MBまでです');
  const uploaded = await uploadMediaToGcp({
    id: crypto.randomUUID(),
    file,
    kind: 'image',
    previewUrl: '',
    name: file.name,
    size: file.size,
  });
  return uploaded.publicUrl;
}

/** 画像セル: サムネ表示 / クリックまたはドロップでアップロード */
function ImageCell({
  url,
  onChange,
  onError,
}: {
  url?: string;
  onChange: (url: string) => void | Promise<void>;
  onError: (msg: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handle = async (file: File | null | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadImage(file));
    } catch (e) {
      onError(e instanceof Error ? e.message : '画像のアップロードに失敗しました');
    }
    setBusy(false);
  };

  return (
    <div
      className="relative flex h-12 w-16 items-center justify-center overflow-hidden rounded border border-dashed border-neutral-300 bg-neutral-50"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void handle(e.dataTransfer.files?.[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handle(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {url ? (
        <>
          <img src={url} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            title="画像を外す"
            onClick={() => void onChange('')}
            className="absolute right-0 top-0 rounded-bl bg-black/60 p-0.5 text-white"
          >
            <XIcon className="h-3 w-3" />
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          title="クリック or ドロップで画像追加"
          className="flex h-full w-full items-center justify-center text-neutral-400 hover:text-neutral-700"
        >
          {busy ? <span className="text-[10px]">…</span> : <ImagePlus className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}

/** 本文・タグなどのインライン編集（フォーカスを外したら保存） */
function InlineText({
  value,
  multiline,
  placeholder,
  disabled,
  onSave,
}: {
  value: string;
  multiline?: boolean;
  placeholder?: string;
  disabled?: boolean;
  onSave: (v: string) => void | Promise<void>;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const common = {
    value: v,
    placeholder,
    disabled,
    onChange: (e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => setV(e.target.value),
    onBlur: () => {
      if (v !== value) void onSave(v);
    },
    className:
      'w-full resize-none rounded border border-transparent bg-transparent px-1.5 py-1 text-[13px] hover:border-neutral-300 focus:border-neutral-900 focus:bg-white focus:outline-none disabled:opacity-60',
  };
  return multiline ? <textarea rows={2} {...common} /> : <input {...common} />;
}

export default function XSeriesPage() {
  const [series, setSeries] = useState<XSeries[]>([]);
  const [rules, setRules] = useState<XScheduleRule[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'queue' | 'history' | 'all'>('queue');
  const [draftSeriesId, setDraftSeriesId] = useState('');
  const [aiOpen, setAiOpen] = useState(false);
  const [aiName, setAiName] = useState('');
  const [aiThemes, setAiThemes] = useState('');
  const [items, setItems] = useState<XSeriesItem[]>([]);
  const [xConnected, setXConnected] = useState(false);
  const [xPosts, setXPosts] = useState(0);
  const [xLimit, setXLimit] = useState(500);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [newName, setNewName] = useState('');
  const [draftText, setDraftText] = useState('');
  const [draftTags, setDraftTags] = useState('');
  const [draftImage, setDraftImage] = useState('');
  const [draftAt, setDraftAt] = useState('');
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
    const r = id === ALL ? await fetchAllXSeriesItems() : await fetchXSeriesItems(id);
    setItems(r.items);
  }, []);

  useEffect(() => {
    loadMeta().catch(() => setMessage('読み込みに失敗しました'));
  }, [loadMeta]);

  useEffect(() => {
    if (selectedId) loadItems(selectedId).catch(() => setItems([]));
  }, [selectedId, loadItems]);

  const isAll = selectedId === ALL;
  const selected = isAll ? null : (series.find((s) => s.id === selectedId) ?? null);
  const seriesRules = rules.filter((r) => r.seriesId === selectedId);
  const seriesNameOf = (id: string) => series.find((s) => s.id === id)?.name ?? '';

  const isHistory = (i: XSeriesItem) => i.status === 'published';
  const queueCount = items.filter((i) => !isHistory(i)).length;
  const historyCount = items.filter(isHistory).length;
  const shownItems = (() => {
    const list = items.filter((i) =>
      view === 'all' ? true : view === 'history' ? isHistory(i) : !isHistory(i),
    );
    const t = (i: XSeriesItem) => new Date(i.publishedAt ?? i.scheduledAt ?? i.createdAt).getTime() || 0;
    if (view === 'history') return [...list].sort((a, b) => t(b) - t(a));
    if (isAll) {
      // 全シリーズ: 予定時刻のあるものを時系列、他はシリーズ順
      return [...list].sort((a, b) => {
        if (isHistory(a) !== isHistory(b)) return isHistory(a) ? 1 : -1;
        return (a.seriesName ?? '').localeCompare(b.seriesName ?? '') || a.sortOrder - b.sortOrder;
      });
    }
    return list;
  })();

  const refresh = async () => {
    await loadMeta();
    if (selectedId) await loadItems(selectedId);
  };

  const run = async (fn: () => Promise<void>, fallback: string) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : fallback);
    }
    setBusy(false);
  };

  const handleCreateSeries = () =>
    run(async () => {
      if (!newName.trim()) return;
      const { series: created } = await createXSeries({ name: newName.trim() });
      setNewName('');
      setSelectedId(created.id);
      setMessage(`シリーズ「${created.name}」を作成しました`);
      await refresh();
    }, '作成に失敗しました');

  const handleSeed = () =>
    run(async () => {
      const pack = await seedDefaultXSeries();
      setMessage(`テンプレ ${pack.series.length} シリーズ・${pack.rules.length} ルールを作成しました`);
      await refresh();
      if (pack.series[0]) setSelectedId(pack.series[0].id);
    }, 'テンプレ作成に失敗しました');

  const targetSeriesId = isAll ? draftSeriesId || series[0]?.id || '' : (selectedId ?? '');

  /** AIでシリーズ作成: シリーズを作り、テーマ(1行1件)から案を自動生成（未承認で投入） */
  const handleAiCreate = () =>
    run(async () => {
      const name = aiName.trim();
      if (!name || !aiThemes.trim()) return;
      const { series: created } = await createXSeries({ name });
      const r = await generateXSeriesBatch(created.id, {
        source: aiThemes,
        approved: false,
        seriesHint: name,
      });
      setAiOpen(false);
      setAiName('');
      setAiThemes('');
      setSelectedId(created.id);
      setView('queue');
      setMessage(
        `「${created.name}」を作成し、AIが ${r.generated} 件の案を追加しました${r.usedGemini ? '' : '（オフラインモード）'}。内容を確認して「投稿OK」を付けてください。`,
      );
      await refresh();
    }, 'AI作成に失敗しました');

  const handleRenameSeries = (s: XSeries) =>
    run(async () => {
      const name = prompt('シリーズ名を変更', s.name)?.trim();
      if (!name || name === s.name) return;
      await updateXSeries(s.id, { name });
      await refresh();
    }, '名前の変更に失敗しました');

  const handleAddItem = () =>
    run(async () => {
      const sid = targetSeriesId;
      if (!sid || !draftText.trim()) return;
      await addXSeriesItems(sid, {
        text: draftText.trim(),
        tags: draftTags.trim() || undefined,
        imageUrl: draftImage || undefined,
        scheduledAt: fromLocalInput(draftAt) || undefined,
        approved: draftApproved,
      });
      setDraftText('');
      setDraftTags('');
      setDraftImage('');
      setDraftAt('');
      await loadItems(selectedId ?? sid);
      await loadMeta();
    }, '追加に失敗しました');

  const handleCsv = (file: File | null) =>
    run(async () => {
      if (!file || !selectedId || isAll) return;
      const r = await importXSeriesCsv(selectedId, await file.text());
      setMessage(`${r.imported} 件をインポートしました`);
      await refresh();
    }, 'CSVインポートに失敗しました');

  const patchItem = async (item: XSeriesItem, patch: Parameters<typeof updateXSeriesItem>[2]) => {
    try {
      const { item: next } = await updateXSeriesItem(item.seriesId, item.id, patch);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...next, seriesName: i.seriesName } : i)));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '保存に失敗しました');
    }
  };

  const handleRunNow = () =>
    run(async () => {
      if (!selectedId || isAll) return;
      const r = await runXSeriesNow({
        seriesId: selectedId,
        take: 1,
        mode: xConnected ? 'x_free' : 'notify',
      });
      setMessage(
        `即時実行: 成功 ${r.posted ?? 0} / 失敗 ${r.errors ?? 0}${(r.messages ?? []).length ? ` — ${r.messages?.[0]}` : ''}`,
      );
      await refresh();
    }, '実行に失敗しました');

  const handleAddRule = () =>
    run(async () => {
      if (!selectedId || isAll) return;
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
    }, 'ルール追加に失敗しました');

  const cell = 'border-b border-neutral-200 px-1.5 py-1 align-top';

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-2">
      {/* 上部バー: シリーズ切替 + 操作 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedId(ALL)}
            className={`inline-flex items-center gap-1.5 rounded-t border border-b-0 px-3 py-1.5 text-xs ${
              isAll
                ? 'border-violet-700 bg-violet-700 font-semibold text-white'
                : 'border-violet-300 bg-violet-50 text-violet-900 hover:bg-violet-100'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            すべて
          </button>
          {series.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedId(s.id)}
              onDoubleClick={() => void handleRenameSeries(s)}
              className={`group inline-flex items-center gap-1.5 rounded-t border border-b-0 px-3 py-1.5 text-xs ${
                selectedId === s.id
                  ? 'border-neutral-900 bg-neutral-900 font-semibold text-white'
                  : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
              }`}
              title={`承認済み在庫 ${s.approvedCount ?? 0} / 未投稿 ${s.pendingCount ?? 0}`}
            >
              {s.name}
              <span className="rounded bg-white/20 px-1 text-[10px]">
                {s.approvedCount ?? 0}/{s.pendingCount ?? 0}
              </span>
              <span
                role="button"
                tabIndex={0}
                className="opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!confirm(`「${s.name}」を削除しますか？`)) return;
                  void deleteXSeries(s.id).then(() => {
                    if (selectedId === s.id) setSelectedId(null);
                    return refresh();
                  });
                }}
              >
                <Trash2 className="h-3 w-3" />
              </span>
            </button>
          ))}
          <div className="flex items-center gap-1">
            <input
              className="buzz-input !h-8 !w-36 !py-1 text-xs"
              placeholder="新しいシリーズ名"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleCreateSeries()}
            />
            <button
              type="button"
              disabled={busy || !newName.trim()}
              onClick={() => void handleCreateSeries()}
              className="rounded border border-neutral-300 p-1.5 disabled:opacity-50"
              aria-label="シリーズ追加"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setAiOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded border border-violet-400 bg-violet-50 px-2 py-1.5 text-xs font-semibold text-violet-900"
              title="テーマを書くだけでAIがシリーズと投稿案を作ります"
            >
              <Sparkles className="h-3.5 w-3.5" />
              AIで作る
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-neutral-500">
            {xConnected ? `X接続済み · 今月 ${xPosts}/${xLimit}` : '未接続（通知モード）'}
          </span>
          <Link to={settingsPath({ section: 'x' })} className="rounded border border-neutral-300 px-2 py-1.5">
            X API 設定
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSeed()}
            className="rounded border border-neutral-300 px-2 py-1.5 disabled:opacity-60"
          >
            医療テンプレ
          </button>
        </div>
      </div>

      {message && (
        <p className="buzz-alert buzz-alert-info !py-1.5 text-xs">
          {message}
          <button type="button" className="ml-2 underline" onClick={() => setMessage(null)}>
            閉じる
          </button>
        </p>
      )}

      {aiOpen && (
        <div className="space-y-2 rounded-lg border border-violet-300 bg-violet-50/60 p-3 text-xs">
          <p className="font-semibold text-violet-900">AIでシリーズを作る（案は未承認で入ります。確認して「投稿OK」を付けてください）</p>
          <div className="grid gap-2 md:grid-cols-[14rem_1fr_auto]">
            <input
              className="buzz-input !py-1 text-xs"
              placeholder="シリーズ名（例: C_医療あるある）"
              value={aiName}
              onChange={(e) => setAiName(e.target.value)}
            />
            <textarea
              className="buzz-input h-20 resize-none !py-1 text-xs"
              placeholder={'テーマ・論文URLを1行1件で（例）\nGLP-1と消化器がん\nhttps://pubmed.ncbi.nlm.nih.gov/...'}
              value={aiThemes}
              onChange={(e) => setAiThemes(e.target.value)}
            />
            <button
              type="button"
              disabled={busy || !aiName.trim() || !aiThemes.trim()}
              onClick={() => void handleAiCreate()}
              className="inline-flex items-center justify-center gap-1 rounded bg-violet-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {busy ? '作成中…' : '作成'}
            </button>
          </div>
          <p className="text-neutral-500">
            ChatGPT / Claude / Cursor など外部のAIからも、バジットのMCP連携（設定 → AI連携）の
            <code className="mx-1 rounded bg-white px-1">x_series_create</code>・
            <code className="mx-1 rounded bg-white px-1">x_series_add_items</code>で自由にシリーズを作って案を入れられます。
          </p>
        </div>
      )}

      {!selected && !isAll ? (
        <EmptyState
          icon={Layers}
          title="シリーズを選択"
          description="上のタブからシリーズを選ぶか、「AIで作る」「新しいシリーズ名」から作成してください。"
          primaryLabel="設定で X API を連携"
          primaryTo={settingsPath({ section: 'x' })}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex overflow-hidden rounded border border-neutral-300 text-xs">
              {(
                [
                  ['queue', `待機・予定 ${queueCount}`],
                  ['history', `投稿済み（履歴） ${historyCount}`],
                  ['all', `すべて ${items.length}`],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  className={`px-3 py-1.5 ${view === id ? 'bg-neutral-900 font-semibold text-white' : 'bg-white text-neutral-700 hover:bg-neutral-50'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {!isAll && (
                <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-neutral-300 px-2.5 py-1.5 text-xs">
                  <Upload className="h-3.5 w-3.5" />
                  CSV取込
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      void handleCsv(e.target.files?.[0] ?? null);
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
              {!isAll && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleRunNow()}
                  className="inline-flex items-center gap-1 rounded bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  <Play className="h-3.5 w-3.5" />
                  1件すぐ投稿
                </button>
              )}
              <button
                type="button"
                onClick={() => void refresh()}
                className="inline-flex items-center gap-1 rounded border border-neutral-300 px-2.5 py-1.5 text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                更新
              </button>
            </div>
          </div>

          {/* 一覧（スプレッドシート風） */}
          <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-neutral-300 bg-white">
            <table className="w-full min-w-[860px] table-fixed border-collapse text-left text-[13px]">
              <colgroup>
                <col className="w-14" />
                <col className="w-14" />
                {isAll && <col className="w-32" />}
                <col />
                <col className="w-44" />
                <col className="w-20" />
                <col className="w-48" />
                <col className="w-10" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-neutral-100 text-xs text-neutral-600">
                <tr>
                  {[
                    '投稿OK',
                    '状態',
                    ...(isAll ? ['シリーズ'] : []),
                    'ツイートのコメント',
                    'タグ',
                    '画像',
                    view === 'history' ? '投稿日時' : '投稿時刻',
                    '',
                  ].map((h, i) => (
                    <th key={i} className="border-b border-r border-neutral-300 px-2 py-1.5 font-semibold last:border-r-0">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* 入力行 */}
                <tr className={`bg-amber-50/60 ${view === 'history' ? 'hidden' : ''}`}>
                  <td className={`${cell} text-center`}>
                    <input
                      type="checkbox"
                      checked={draftApproved}
                      onChange={(e) => setDraftApproved(e.target.checked)}
                      title="投稿OK"
                    />
                  </td>
                  <td className={`${cell} text-[10px] text-neutral-500`}>新規</td>
                  {isAll && (
                    <td className={cell}>
                      <select
                        className="w-full rounded border border-neutral-300 bg-white px-1 py-1 text-xs"
                        value={targetSeriesId}
                        onChange={(e) => setDraftSeriesId(e.target.value)}
                      >
                        {series.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                  <td className={cell}>
                    <textarea
                      rows={2}
                      className="w-full resize-none rounded border border-neutral-300 bg-white px-1.5 py-1 text-[13px]"
                      placeholder="ツイート本文を入力（スレッドは --- で分割）"
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                    />
                  </td>
                  <td className={cell}>
                    <input
                      className="w-full rounded border border-neutral-300 bg-white px-1.5 py-1 text-[13px]"
                      placeholder="#タグ"
                      value={draftTags}
                      onChange={(e) => setDraftTags(e.target.value)}
                    />
                  </td>
                  <td className={cell}>
                    <ImageCell url={draftImage} onChange={setDraftImage} onError={setMessage} />
                  </td>
                  <td className={cell}>
                    <input
                      type="datetime-local"
                      className="w-full rounded border border-neutral-300 bg-white px-1 py-1 text-xs"
                      value={draftAt}
                      onChange={(e) => setDraftAt(e.target.value)}
                      title="空欄ならスケジュールルールの時刻で投稿"
                    />
                  </td>
                  <td className={`${cell} text-center`}>
                    <button
                      type="button"
                      disabled={busy || !draftText.trim() || !targetSeriesId}
                      onClick={() => void handleAddItem()}
                      className="rounded bg-neutral-900 p-1.5 text-white disabled:opacity-40"
                      aria-label="追加"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </td>
                </tr>

                {shownItems.length === 0 && (
                  <tr>
                    <td colSpan={isAll ? 8 : 7} className="px-3 py-6 text-center text-sm text-neutral-500">
                      {view === 'history'
                        ? 'まだ投稿済みのネタはありません。'
                        : 'ネタがありません。上の入力行から追加するか、「AIで作る」・CSV取込をお使いください。'}
                    </td>
                  </tr>
                )}

                {shownItems.map((item) => {
                  const editable = item.status === 'pending' || item.status === 'failed';
                  return (
                    <tr
                      key={item.id}
                      className={item.status === 'published' ? 'bg-neutral-50 text-neutral-500' : 'hover:bg-neutral-50/70'}
                    >
                      <td className={`${cell} text-center`}>
                        <input
                          type="checkbox"
                          checked={item.approved}
                          disabled={!editable}
                          onChange={() => void patchItem(item, { approved: !item.approved })}
                        />
                      </td>
                      <td className={`${cell} text-[11px]`}>
                        <span
                          className={
                            item.status === 'failed'
                              ? 'font-semibold text-red-700'
                              : item.status === 'published'
                                ? 'text-emerald-700'
                                : ''
                          }
                          title={item.errorMessage}
                        >
                          {STATUS_LABEL[item.status] ?? item.status}
                        </span>
                      </td>
                      {isAll && (
                        <td className={`${cell} text-xs`}>
                          <button
                            type="button"
                            className="truncate text-left font-medium text-violet-800 hover:underline"
                            onClick={() => setSelectedId(item.seriesId)}
                            title="このシリーズだけ表示"
                          >
                            {item.seriesName ?? seriesNameOf(item.seriesId)}
                          </button>
                        </td>
                      )}
                      <td className={cell}>
                        <InlineText
                          multiline
                          value={item.text}
                          disabled={!editable}
                          onSave={async (v) => {
                            if (v.trim()) await patchItem(item, { text: v.trim() });
                          }}
                        />
                        {item.errorMessage && <p className="px-1.5 text-[11px] text-red-700">{item.errorMessage}</p>}
                      </td>
                      <td className={cell}>
                        <InlineText
                          value={item.tags ?? ''}
                          placeholder="#タグ"
                          disabled={!editable}
                          onSave={(v) => patchItem(item, { tags: v.trim() })}
                        />
                      </td>
                      <td className={cell}>
                        {editable ? (
                          <ImageCell
                            url={item.imageUrl}
                            onChange={(url) => patchItem(item, { imageUrl: url })}
                            onError={setMessage}
                          />
                        ) : item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="h-12 w-16 rounded object-cover" />
                        ) : null}
                      </td>
                      <td className={cell}>
                        {item.status === 'published' ? (
                          <span className="px-1 text-xs">
                            {item.publishedAt ? new Date(item.publishedAt).toLocaleString('ja-JP') : ''}
                            {item.tweetId && (
                              <a
                                href={`https://x.com/i/status/${item.tweetId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-1 text-violet-700 underline"
                              >
                                Xで見る
                              </a>
                            )}
                          </span>
                        ) : (
                          <input
                            type="datetime-local"
                            disabled={!editable}
                            className="w-full rounded border border-transparent bg-transparent px-1 py-1 text-xs hover:border-neutral-300 focus:border-neutral-900 focus:bg-white focus:outline-none"
                            value={toLocalInput(item.scheduledAt)}
                            onChange={(e) => void patchItem(item, { scheduledAt: fromLocalInput(e.target.value) })}
                            title="空欄ならスケジュールルールの時刻で投稿"
                          />
                        )}
                      </td>
                      <td className={`${cell} text-center`}>
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedId) return;
                            void deleteXSeriesItem(item.seriesId, item.id).then(() => loadItems(selectedId));
                          }}
                          className="p-1 text-neutral-400 hover:text-red-700"
                          aria-label="削除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* スケジュールルール（折りたたみ） */}
          <details className={`shrink-0 rounded-lg border border-neutral-200 bg-white text-xs ${isAll ? 'hidden' : ''}`}>
            <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 font-semibold">
              <Clock className="h-4 w-4" />
              自動投稿ルール（投稿時刻が空欄のネタに適用）
              <span className="font-normal text-neutral-500">{seriesRules.length} 件</span>
              <ChevronDown className="ml-auto h-4 w-4" />
            </summary>
            <div className="space-y-2 border-t border-neutral-200 p-3">
              <p className="text-neutral-500">
                曜日は 毎日 / 平日 / 土日 / 月水木金 など。ジッターは指定時刻からの遅延（分）。
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input className="buzz-input !w-24 !py-1 text-xs" value={ruleDays} onChange={(e) => setRuleDays(e.target.value)} placeholder="曜日" />
                <input className="buzz-input !w-20 !py-1 text-xs" value={ruleTime} onChange={(e) => setRuleTime(e.target.value)} placeholder="07:30" />
                <input type="number" min={1} max={5} className="buzz-input !w-16 !py-1 text-xs" value={ruleTake} onChange={(e) => setRuleTake(Number(e.target.value) || 1)} title="件数" />
                <input type="number" min={0} max={60} className="buzz-input !w-16 !py-1 text-xs" value={ruleJitter} onChange={(e) => setRuleJitter(Number(e.target.value) || 0)} title="ジッター(分)" />
                <select className="buzz-input !w-40 !py-1 text-xs" value={ruleMode} onChange={(e) => setRuleMode(e.target.value as 'x_free' | 'notify')}>
                  <option value="x_free">X API 自動投稿</option>
                  <option value="notify">通知リマインダー</option>
                </select>
                <button type="button" disabled={busy} onClick={() => void handleAddRule()} className="rounded bg-neutral-900 px-3 py-1.5 font-semibold text-white disabled:opacity-60">
                  ルール追加
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {seriesRules.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 rounded border border-neutral-200 px-2 py-1.5">
                    <span className="font-medium">
                      {r.days} {r.timeHHMM}
                    </span>
                    <span className="text-neutral-500">
                      {r.take}件 · ±{r.jitterMaxMin}分 · {r.publishMode === 'x_free' ? '自動' : '通知'}
                      {!r.enabled ? ' · 停止中' : ''}
                    </span>
                    <button type="button" className="rounded border border-neutral-300 px-1.5 py-0.5" onClick={() => void updateXScheduleRule(r.id, { enabled: !r.enabled }).then(refresh)}>
                      {r.enabled ? '停止' : '有効'}
                    </button>
                    <button type="button" className="text-neutral-400 hover:text-red-700" onClick={() => void deleteXScheduleRule(r.id).then(refresh)} aria-label="ルール削除">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
