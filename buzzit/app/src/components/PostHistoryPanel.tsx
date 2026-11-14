import { useCallback, useEffect, useMemo, useState } from 'react';
import { CopyPlus, Download, ExternalLink, Eye, FileUp, PencilLine, RefreshCw, RotateCcw, Search, X } from 'lucide-react';
import { fetchInsightsPosts, importMetricsCsv, saveManualMetrics, syncInsights, type PostInsight, type ScheduledJob } from '../lib/api';

const INSIGHT_PLATFORMS = new Set(['x', 'instagram', 'facebook-threads']);
const PAGE_SIZE = 30;
const DENSITY_KEY = 'buzzit.history.density';

type StatusKey = 'posted' | 'failed' | 'scheduled' | 'all';
type SortKey = 'new' | 'old' | 'imp' | 'likes';
type Density = 'compact' | 'normal' | 'detail';

const STATUS_TABS: Array<[StatusKey, string]> = [
  ['posted', '投稿済み'],
  ['failed', '失敗'],
  ['scheduled', '予約中'],
  ['all', 'すべて'],
];

const SORTS: Array<[SortKey, string]> = [
  ['new', '新しい順'],
  ['old', '古い順'],
  ['imp', 'インプレッション順'],
  ['likes', 'いいね順'],
];

const DENSITIES: Array<[Density, string]> = [
  ['compact', '1行'],
  ['normal', '標準'],
  ['detail', '詳細'],
];

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' });
}

function matchesStatus(job: ScheduledJob, key: StatusKey) {
  switch (key) {
    case 'posted':
      return job.status === 'published' || job.status === 'notified';
    case 'failed':
      return job.status === 'failed';
    case 'scheduled':
      return job.status === 'pending' || job.status === 'pending_approval' || job.status === 'draft';
    default:
      return true;
  }
}

function statusChip(job: ScheduledJob) {
  switch (job.status) {
    case 'published':
    case 'notified':
      return { label: '投稿済み', cls: 'bg-emerald-50 text-emerald-700' };
    case 'failed':
      return { label: '失敗', cls: 'bg-red-50 text-red-700' };
    case 'pending_approval':
      return { label: '承認待ち', cls: 'bg-amber-50 text-amber-700' };
    case 'draft':
      return { label: '下書き', cls: 'bg-neutral-100 text-neutral-600' };
    default:
      return { label: '予約中', cls: 'bg-sky-50 text-sky-700' };
  }
}

function csvCell(v: unknown) {
  const s = String(v ?? '').replace(/"/g, '""');
  return `"${s}"`;
}

function toInputDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * 投稿履歴。絞り込み（状態・期間・キーワード・タグ・日付）、並び替え、表示密度の切替、
 * ページ送り、CSV出力、インプレッション同期、複製・再送に対応する。
 */
export default function PostHistoryPanel({
  jobs,
  platformId,
  day,
  onClearDay,
  onClone,
  onRetry,
  busyId,
}: {
  jobs: ScheduledJob[];
  platformId?: string;
  day: Date | null;
  onClearDay: () => void;
  onClone?: (job: ScheduledJob) => void;
  onRetry?: (id: string) => void;
  busyId?: string | null;
}) {
  const [insights, setInsights] = useState<Record<string, PostInsight>>({});
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<StatusKey>('posted');
  const [sort, setSort] = useState<SortKey>('new');
  const [density, setDensity] = useState<Density>(() => {
    try {
      const v = localStorage.getItem(DENSITY_KEY);
      return v === 'compact' || v === 'normal' || v === 'detail' ? v : 'normal';
    } catch {
      return 'normal';
    }
  });
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const insightsSupported = !platformId || INSIGHT_PLATFORMS.has(platformId);

  // 実績の手入力・CSV取り込み（X API を使わず費用ゼロ）
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvMsg, setCsvMsg] = useState<string | null>(null);
  const [csvBusy, setCsvBusy] = useState(false);
  const [formFor, setFormFor] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const METRIC_FIELDS: Array<[string, string]> = [
    ['impressions', 'インプレッション*'],
    ['likes', 'いいね'],
    ['reposts', 'リポスト'],
    ['replies', '返信'],
    ['bookmarks', 'ブックマーク'],
    ['urlClicks', 'URLクリック'],
    ['profileClicks', 'プロフィール'],
    ['newFollows', 'フォロー増'],
  ];

  const loadInsights = useCallback(() => {
    const key = platformId === 'facebook-threads' ? undefined : platformId;
    if (!insightsSupported) {
      setInsights({});
      return Promise.resolve();
    }
    return fetchInsightsPosts({ platform: key, limit: 500 })
      .then((r) => setInsights(Object.fromEntries(r.posts.map((p) => [p.jobId, p]))))
      .catch(() => setInsights({}));
  }, [platformId, insightsSupported]);

  useEffect(() => {
    void loadInsights();
  }, [loadInsights]);

  const changeDensity = (d: Density) => {
    setDensity(d);
    try { localStorage.setItem(DENSITY_KEY, d); } catch { /* noop */ }
  };

  const lastFetchedAt = useMemo(() => {
    const times = Object.values(insights)
      .map((i) => new Date(i.fetchedAt).getTime())
      .filter((n) => Number.isFinite(n));
    return times.length ? new Date(Math.max(...times)) : null;
  }, [insights]);

  const runSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      await syncInsights(true);
      await loadInsights();
      setSyncMsg('同期しました');
    } catch (e) {
      setSyncMsg(e instanceof Error ? `同期に失敗: ${e.message}` : '同期に失敗しました');
    } finally {
      setSyncing(false);
    }
  };

  const runCsvImport = async () => {
    setCsvBusy(true);
    setCsvMsg(null);
    try {
      const r = await importMetricsCsv(csvText);
      setCsvMsg(
        `${r.matched}件の実績を取り込みました` +
          (r.unmatched ? `（${r.unmatched}件はバジットの投稿履歴と一致せず未取込）` : ''),
      );
      setCsvText('');
      await loadInsights();
    } catch (e) {
      setCsvMsg(e instanceof Error ? e.message : '取り込みに失敗しました');
    } finally {
      setCsvBusy(false);
    }
  };

  const openForm = (jobId: string, ins?: PostInsight) => {
    setFormFor(jobId);
    setFormMsg(null);
    setForm({
      impressions: ins ? String(ins.impressions) : '',
      likes: ins?.likes != null ? String(ins.likes) : '',
      reposts: ins?.reposts != null ? String(ins.reposts) : '',
      replies: ins?.replies != null ? String(ins.replies) : '',
    });
  };

  const submitForm = async (jobId: string) => {
    const metrics: Record<string, number | undefined> = {};
    for (const [k] of METRIC_FIELDS) {
      const raw = (form[k] ?? '').trim();
      if (raw !== '') metrics[k] = Number(raw.replace(/,/g, ''));
    }
    if (metrics.impressions === undefined || Number.isNaN(metrics.impressions)) {
      setFormMsg('インプレッションを入力してください');
      return;
    }
    try {
      await saveManualMetrics(jobId, metrics);
      setFormMsg('保存しました');
      setFormFor(null);
      await loadInsights();
    } catch (e) {
      setFormMsg(e instanceof Error ? e.message : '保存に失敗しました');
    }
  };

  const allTags = useMemo(() => {
    const s = new Set<string>();
    jobs.forEach((j) => j.tags?.forEach((t) => s.add(t)));
    return [...s].sort();
  }, [jobs]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const fromT = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toT = to ? new Date(`${to}T23:59:59`).getTime() : null;
    const t = (j: ScheduledJob) => new Date(j.scheduledAt).getTime();
    const filtered = jobs.filter((j) => {
      if (!matchesStatus(j, status)) return false;
      if (day && new Date(j.scheduledAt).toDateString() !== day.toDateString()) return false;
      if (fromT != null && t(j) < fromT) return false;
      if (toT != null && t(j) > toT) return false;
      if (tag && !j.tags?.includes(tag)) return false;
      if (q) {
        const hay = `${j.contents.map((c) => `${c.label} ${c.content}`).join(' ')} ${(j.tags ?? []).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const num = (j: ScheduledJob, k: 'impressions' | 'likes') => insights[j.id]?.[k] ?? -1;
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'old':
          return t(a) - t(b);
        case 'imp':
          return num(b, 'impressions') - num(a, 'impressions') || t(b) - t(a);
        case 'likes':
          return num(b, 'likes') - num(a, 'likes') || t(b) - t(a);
        default:
          return t(b) - t(a);
      }
    });
    return sorted;
  }, [jobs, status, day, from, to, tag, query, sort, insights]);

  // 絞り込みが変わったら先頭に戻す
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [status, day, from, to, tag, query, sort, jobs]);

  const shown = list.slice(0, visible);
  const isOpen = (id: string) => density === 'detail' || openIds.has(id);
  const allOpen = shown.length > 0 && shown.every((j) => openIds.has(j.id));
  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () => setOpenIds(allOpen ? new Set() : new Set(shown.map((j) => j.id)));

  const hasFilter = Boolean(query || tag || from || to || day);
  const resetFilters = () => {
    setQuery('');
    setTag('');
    setFrom('');
    setTo('');
    if (day) onClearDay();
  };

  const exportCsv = () => {
    const header = ['日時', 'SNS', '状態', '本文', 'タグ', 'インプレッション', 'リーチ', 'いいね', '返信', 'リポスト'];
    const rows = list.map((j) => {
      const ins = insights[j.id];
      return [
        new Date(j.scheduledAt).toLocaleString('ja-JP'),
        j.contents.map((c) => c.label).join(' / '),
        statusChip(j).label,
        j.contents.map((c) => c.content).join('\n---\n'),
        (j.tags ?? []).join(' '),
        ins?.impressions ?? '',
        ins?.reach ?? '',
        ins?.likes ?? '',
        ins?.replies ?? '',
        ins?.reposts ?? '',
      ].map(csvCell).join(',');
    });
    const csv = '\uFEFF' + [header.map(csvCell).join(','), ...rows].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `post-history-${toInputDate(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chipBtn = (active: boolean) =>
    `border px-2 py-1 text-xs ${active ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white hover:border-neutral-400'}`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">
          投稿履歴 <span className="font-normal text-neutral-500">（{list.length}件）</span>
        </h3>
        <div className="flex flex-wrap items-center gap-1">
          {day && (
            <button
              type="button"
              onClick={onClearDay}
              className="inline-flex items-center gap-1 rounded-full border border-neutral-300 px-2 py-0.5 text-xs text-neutral-700 hover:bg-neutral-100"
            >
              {dayLabel(day.toISOString())} のみ
              <X className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            onClick={exportCsv}
            disabled={list.length === 0}
            className="inline-flex items-center gap-1 border border-neutral-200 px-2 py-1 text-xs hover:border-neutral-400 disabled:opacity-40"
            title="表示中の履歴をCSVで保存"
          >
            <Download className="h-3 w-3" />
            CSV
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {STATUS_TABS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setStatus(k)} className={chipBtn(status === k)}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <label className="relative min-w-[140px] flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="本文・タグで検索"
            className="w-full border border-neutral-200 py-1 pl-6 pr-2 text-xs"
          />
        </label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="border border-neutral-200 bg-white px-1.5 py-1 text-xs"
          aria-label="並び替え"
        >
          {SORTS.map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
        {allTags.length > 0 && (
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="max-w-[140px] border border-neutral-200 bg-white px-1.5 py-1 text-xs"
            aria-label="タグで絞り込み"
          >
            <option value="">タグ: すべて</option>
            {allTags.map((t) => (
              <option key={t} value={t}>#{t}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-600">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-neutral-200 px-1.5 py-0.5" aria-label="開始日" />
        <span>〜</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-neutral-200 px-1.5 py-0.5" aria-label="終了日" />
        {hasFilter && (
          <button type="button" onClick={resetFilters} className="underline hover:text-neutral-900">
            絞り込みを解除
          </button>
        )}
        <span className="ml-auto flex items-center gap-1">
          {DENSITIES.map(([k, label]) => (
            <button key={k} type="button" onClick={() => changeDensity(k)} className={chipBtn(density === k)}>
              {label}
            </button>
          ))}
          {density !== 'detail' && (
            <button type="button" onClick={toggleAll} className={chipBtn(false)} disabled={shown.length === 0}>
              {allOpen ? 'すべて閉じる' : 'すべて開く'}
            </button>
          )}
        </span>
      </div>

      {insightsSupported && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
          <span>
            インプレッション最終同期:{' '}
            {lastFetchedAt ? lastFetchedAt.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '未同期'}
          </span>
          <button
            type="button"
            onClick={() => void runSync()}
            disabled={syncing}
            className="inline-flex items-center gap-1 border border-neutral-200 px-1.5 py-0.5 hover:border-neutral-400 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? '同期中...' : '今すぐ同期'}
          </button>
          {syncMsg && <span>{syncMsg}</span>}
        </div>
      )}

      {(!platformId || platformId === 'x') && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-2 text-xs">
          <button type="button" onClick={() => setCsvOpen((v) => !v)} className="inline-flex items-center gap-1 font-medium text-neutral-800">
            <FileUp className="h-3.5 w-3.5" />
            Xの実績をCSVで取り込む（API費用なし）
          </button>
          {csvOpen && (
            <div className="mt-2 space-y-2">
              <p className="text-neutral-600">
                X（PC版）の「アナリティクス」→「投稿」→ 期間を選んで「エクスポート（CSV）」で保存したファイルを選ぶか、中身を貼り付けてください。
                バジットで投稿した履歴と自動で突き合わせ、インプレッション・いいね・リポスト等を保存します（週1回程度で十分です）。
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setCsvText(await f.text());
                }}
                className="block w-full text-xs"
              />
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={3}
                placeholder="CSVの中身を貼り付け"
                className="w-full border border-neutral-200 p-1.5 font-mono text-[11px]"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={csvBusy || !csvText.trim()}
                  onClick={() => void runCsvImport()}
                  className="border border-neutral-900 bg-neutral-900 px-3 py-1 text-white disabled:opacity-50"
                >
                  {csvBusy ? '取り込み中…' : '取り込む'}
                </button>
                {csvMsg && <span className="text-neutral-700">{csvMsg}</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {list.length === 0 && (
        <p className="rounded-lg border border-dashed border-neutral-300 p-4 text-center text-xs text-neutral-500">
          {hasFilter ? '条件に合う履歴はありません。' : 'まだ該当する履歴がありません。'}
        </p>
      )}

      <ul className="space-y-1.5">
        {shown.map((job) => {
          const ins = insights[job.id];
          const open = isOpen(job.id);
          const body = job.contents.map((c) => c.content).join('\n\n---\n\n');
          const chip = statusChip(job);
          return (
            <li key={job.id} className="rounded-lg border border-neutral-200 bg-white">
              <button
                type="button"
                onClick={() => toggle(job.id)}
                className={`flex w-full items-start gap-2 text-left ${density === 'compact' ? 'p-1.5' : 'p-2'}`}
              >
                <span className="w-14 shrink-0 text-[11px] leading-tight text-neutral-500">
                  {dayLabel(job.scheduledAt)}
                  <br />
                  {new Date(job.scheduledAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${chip.cls}`}>{chip.label}</span>
                <span
                  className={`min-w-0 flex-1 text-xs text-neutral-800 ${
                    open ? '' : density === 'compact' ? 'truncate' : 'line-clamp-2'
                  }`}
                >
                  {open ? '' : (job.contents[0]?.content ?? '')}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-neutral-700">
                  <Eye className="h-3 w-3" />
                  {ins ? ins.impressions.toLocaleString() : '—'}
                </span>
              </button>
              {open && (
                <div className="space-y-2 border-t border-neutral-100 p-2 text-xs">
                  {job.tags && job.tags.length > 0 && (
                    <p className="flex flex-wrap gap-1">
                      {job.tags.map((t) => (
                        <span key={t} className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] text-violet-800">#{t}</span>
                      ))}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap text-neutral-800">{body}</p>
                  {job.mediaUrls?.[0] && !/\.(mp4|mov|webm)(\?|$)/i.test(job.mediaUrls[0]) && (
                    <img src={job.mediaUrls[0]} alt="" className="max-h-40 rounded border border-neutral-200" />
                  )}
                  {job.errorMessage && <p className="text-red-700">{job.errorMessage}</p>}
                  {ins ? (
                    <p className="flex flex-wrap gap-x-3 gap-y-1 text-neutral-600">
                      <span>表示 {ins.impressions.toLocaleString()}</span>
                      {ins.reach != null && <span>リーチ {ins.reach.toLocaleString()}</span>}
                      {ins.likes != null && <span>いいね {ins.likes}</span>}
                      {ins.replies != null && <span>返信 {ins.replies}</span>}
                      {ins.reposts != null && <span>リポスト {ins.reposts}</span>}
                    </p>
                  ) : (
                    <p className="text-neutral-400">
                      {insightsSupported ? '実績が未登録です（0ではありません）。Xは「実績を入力」かCSV取込、Instagram等は「今すぐ同期」で取得できます' : 'このSNSはインプレッション取得に未対応です'}
                    </p>
                  )}
                  {(job.status === 'published' || job.status === 'notified') && (
                    <div className="space-y-1.5">
                      {formFor === job.id ? (
                        <div className="rounded border border-neutral-200 bg-neutral-50 p-2">
                          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                            {METRIC_FIELDS.map(([k, label]) => (
                              <label key={k} className="block">
                                <span className="text-[10px] text-neutral-500">{label}</span>
                                <input
                                  inputMode="numeric"
                                  value={form[k] ?? ''}
                                  onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                                  className="w-full border border-neutral-200 px-1.5 py-1 text-xs"
                                />
                              </label>
                            ))}
                          </div>
                          <p className="mt-1 text-[10px] text-neutral-500">空欄の項目は「未取得」として保存されます（0にはなりません）。</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <button type="button" onClick={() => void submitForm(job.id)} className="border border-neutral-900 bg-neutral-900 px-2.5 py-1 text-white">保存</button>
                            <button type="button" onClick={() => setFormFor(null)} className="border border-neutral-300 px-2.5 py-1">閉じる</button>
                            {formMsg && <span className="text-neutral-600">{formMsg}</span>}
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openForm(job.id, ins)}
                          className="inline-flex items-center gap-1 border border-neutral-300 px-2 py-1 hover:border-neutral-900"
                        >
                          <PencilLine className="h-3 w-3" />
                          {ins ? '実績を修正・追記' : '実績を入力'}
                        </button>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {onClone && job.contents[0] && (
                      <button
                        type="button"
                        onClick={() => onClone(job)}
                        className="inline-flex items-center gap-1 border border-neutral-300 px-2 py-1 hover:border-neutral-900"
                      >
                        <CopyPlus className="h-3 w-3" />
                        他SNSへずらして複製
                      </button>
                    )}
                    {onRetry && job.status === 'failed' && (
                      <button
                        type="button"
                        disabled={busyId === job.id}
                        onClick={() => onRetry(job.id)}
                        className="inline-flex items-center gap-1 border border-red-300 bg-red-50 px-2 py-1 text-red-800 disabled:opacity-60"
                      >
                        <RotateCcw className="h-3 w-3" />
                        再送
                      </button>
                    )}
                    {ins?.source === 'x' && ins.externalId && (
                      <a
                        href={`https://x.com/i/status/${ins.externalId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-violet-700 underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Xで開く
                      </a>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {list.length > visible && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
          className="w-full border border-neutral-200 py-1.5 text-xs hover:border-neutral-400"
        >
          もっと見る（残り {list.length - visible} 件）
        </button>
      )}
    </div>
  );
}
