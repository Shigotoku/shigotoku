import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  fetchScheduledJobs,
  approveScheduledJob,
  retryScheduledJob,
  revertScheduledJobToDraft,
  type ScheduledJob,
} from '../lib/api';
import EmptyState from '../components/EmptyState';
import { useStore } from '../store/storeContext';
import { canApprovePosts } from '../lib/permissions';

type FilterKey = 'all' | 'pending_approval' | 'pending' | 'failed' | 'done' | 'draft';
type ViewMode = 'month' | 'week';

const filterLabels: Record<FilterKey, string> = {
  all: 'すべて',
  pending_approval: '承認待ち',
  pending: '予約済み',
  failed: '失敗',
  draft: '下書き',
  done: '完了',
};

function statusLabel(status: ScheduledJob['status']) {
  switch (status) {
    case 'pending_approval':
      return '承認待ち';
    case 'pending':
      return '予約済み';
    case 'processing':
      return '処理中';
    case 'published':
      return '公開済み';
    case 'notified':
      return '通知済み';
    case 'failed':
      return '失敗';
    case 'draft':
      return '下書き';
    default:
      return status;
  }
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function CalendarPage() {
  const { userRole } = useStore();
  const canApprove = canApprovePosts(userRole);
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchScheduledJobs()
      .then((r) => setJobs(r.jobs))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (filter === 'all') return true;
      if (filter === 'done') return j.status === 'published' || j.status === 'notified';
      return j.status === filter;
    });
  }, [jobs, filter]);

  const gapDays = useMemo(() => {
    const start = viewMode === 'week' ? weekStart : startOfWeek(new Date());
    const gaps: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const has = filtered.some((j) => sameDay(new Date(j.scheduledAt), d) && j.status !== 'draft');
      if (!has) gaps.push(d.toLocaleDateString('ja-JP', { weekday: 'short', month: 'numeric', day: 'numeric' }));
    }
    return gaps;
  }, [filtered, viewMode, weekStart]);

  const jobsByDay = useMemo(() => {
    const map = new Map<string, ScheduledJob[]>();
    for (const j of filtered) {
      const key = new Date(j.scheduledAt).toDateString();
      const list = map.get(key) ?? [];
      list.push(j);
      map.set(key, list);
    }
    return map;
  }, [filtered]);

  const calendarCells = useMemo(() => {
    const first = startOfMonth(month);
    const startPad = first.getDay();
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells: Array<{ date: Date | null; jobs: ScheduledJob[] }> = [];
    for (let i = 0; i < startPad; i++) cells.push({ date: null, jobs: [] });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(month.getFullYear(), month.getMonth(), d);
      cells.push({ date, jobs: jobsByDay.get(date.toDateString()) ?? [] });
    }
    return cells;
  }, [month, jobsByDay]);

  const dayJobs = useMemo(() => {
    if (!selectedDay) return [];
    return (jobsByDay.get(selectedDay.toDateString()) ?? []).sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );
  }, [selectedDay, jobsByDay]);

  const handleApprove = async (id: string) => {
    setBusyId(id);
    setMessage(null);
    try {
      await approveScheduledJob(id);
      setMessage('承認しました。予約キューに入りました。');
      load();
    } catch {
      setMessage('承認に失敗しました');
    }
    setBusyId(null);
  };

  const handleRetry = async (id: string) => {
    setBusyId(id);
    setMessage(null);
    try {
      await retryScheduledJob(id);
      setMessage('再試行キューに入れました。数分以内に処理されます。');
      load();
    } catch {
      setMessage('再試行に失敗しました');
    }
    setBusyId(null);
  };

  const handleDraft = async (id: string) => {
    setBusyId(id);
    try {
      await revertScheduledJobToDraft(id);
      setMessage('下書きに戻しました。クリエイターで作り直せます。');
      load();
    } catch {
      setMessage('下書き化に失敗しました');
    }
    setBusyId(null);
  };

  const failedCount = jobs.filter((j) => j.status === 'failed').length;
  const approvalCount = jobs.filter((j) => j.status === 'pending_approval').length;

  return (
    <div className="buzz-page">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Link to="/magic-creator" className="buzz-btn-primary shrink-0">
          新しい投稿を作る
        </Link>
      </div>

      {(failedCount > 0 || approvalCount > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {approvalCount > 0 && (
            <button
              type="button"
              onClick={() => setFilter('pending_approval')}
              className="flex items-center gap-3 border border-neutral-300 bg-white p-4 text-left hover:border-neutral-900"
            >
              <Clock className="h-5 w-5 text-neutral-700" />
              <div>
                <p className="text-sm font-medium">承認待ち {approvalCount} 件</p>
                <p className="text-xs text-neutral-500">タップで絞り込み</p>
              </div>
            </button>
          )}
          {failedCount > 0 && (
            <button
              type="button"
              onClick={() => setFilter('failed')}
              className="flex items-center gap-3 border border-red-200 bg-red-50 p-4 text-left hover:border-red-400"
            >
              <AlertTriangle className="h-5 w-5 text-red-700" />
              <div>
                <p className="text-sm font-medium text-red-800">失敗 {failedCount} 件</p>
                <p className="text-xs text-red-700/80">再試行でリカバリ</p>
              </div>
            </button>
          )}
        </div>
      )}

      {gapDays.length > 0 && (
        <div className="border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          ネタ切れ注意: {gapDays.join('・')} が空いています。クリエイターで予約を埋めましょう。
        </div>
      )}

      {message && <p className="buzz-alert buzz-alert-info text-sm">{message}</p>}

      <div className="flex flex-wrap gap-2">
        {(['week', 'month'] as ViewMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setViewMode(m)}
            className={`min-h-[44px] border px-3 text-xs ${
              viewMode === m ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white'
            }`}
          >
            {m === 'week' ? '週次' : '月次'}
          </button>
        ))}
        {(Object.keys(filterLabels) as FilterKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`border px-3 py-1.5 text-xs ${
              filter === key
                ? 'border-neutral-900 bg-neutral-900 text-white'
                : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
            }`}
          >
            {filterLabels[key]}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="buzz-card-pad lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (viewMode === 'week') {
                  const d = new Date(weekStart);
                  d.setDate(d.getDate() - 7);
                  setWeekStart(d);
                } else {
                  setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
                }
              }}
              className="min-h-[44px] min-w-[44px] p-2 text-neutral-600 hover:text-neutral-900"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h3 className="font-semibold">
              {viewMode === 'week'
                ? `${weekStart.toLocaleDateString('ja-JP')} の週`
                : `${month.getFullYear()}年 ${month.getMonth() + 1}月`}
            </h3>
            <button
              type="button"
              onClick={() => {
                if (viewMode === 'week') {
                  const d = new Date(weekStart);
                  d.setDate(d.getDate() + 7);
                  setWeekStart(d);
                } else {
                  setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
                }
              }}
              className="min-h-[44px] min-w-[44px] p-2 text-neutral-600 hover:text-neutral-900"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {viewMode === 'week' ? (
            <div className="space-y-2">
              {Array.from({ length: 7 }).map((_, i) => {
                const date = new Date(weekStart);
                date.setDate(weekStart.getDate() + i);
                const dayJobs = jobsByDay.get(date.toDateString()) ?? [];
                const selected = selectedDay && sameDay(date, selectedDay);
                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    onClick={() => setSelectedDay(date)}
                    className={`flex min-h-[56px] w-full items-center justify-between border px-3 text-left ${
                      selected ? 'border-neutral-900 bg-neutral-100' : 'border-neutral-200 bg-white'
                    }`}
                  >
                    <span className="text-sm font-medium">
                      {date.toLocaleDateString('ja-JP', { weekday: 'short', month: 'numeric', day: 'numeric' })}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {dayJobs.length ? `${dayJobs.length}件` : '空き'}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] text-neutral-500">
                {['日', '月', '火', '水', '木', '金', '土'].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((cell, i) => {
                  if (!cell.date) return <div key={`pad-${i}`} className="min-h-[64px]" />;
                  const selected = selectedDay && sameDay(cell.date, selectedDay);
                  const isToday = sameDay(cell.date, new Date());
                  return (
                    <button
                      key={cell.date.toISOString()}
                      type="button"
                      onClick={() => setSelectedDay(cell.date)}
                      className={`min-h-[64px] border p-1.5 text-left transition-colors ${
                        selected
                          ? 'border-neutral-900 bg-neutral-100'
                          : 'border-neutral-100 bg-white hover:border-neutral-300'
                      }`}
                    >
                      <span
                        className={`text-xs font-medium ${
                          isToday ? 'text-neutral-900 underline' : 'text-neutral-600'
                        }`}
                      >
                        {cell.date.getDate()}
                      </span>
                      <div className="mt-1 flex flex-wrap gap-0.5">
                        {cell.jobs.slice(0, 3).map((j) => (
                          <span
                            key={j.id}
                            className={`h-1.5 w-1.5 rounded-full ${
                              j.status === 'failed'
                                ? 'bg-red-500'
                                : j.status === 'pending_approval'
                                  ? 'bg-amber-500'
                                  : j.status === 'published' || j.status === 'notified'
                                    ? 'bg-emerald-500'
                                    : 'bg-neutral-400'
                            }`}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              {selectedDay
                ? selectedDay.toLocaleDateString('ja-JP', {
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short',
                  })
                : '日付を選択'}
            </h3>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              更新
            </button>
          </div>

          {loading && <p className="text-sm text-neutral-500">読み込み中...</p>}

          {!loading && dayJobs.length === 0 && (
            <EmptyState
              icon={CalendarDays}
              title="この日の予約はありません"
              description="マジック・クリエイターで台本を作り、日時を指定して予約するとここに表示されます。"
              primaryLabel="投稿を作る"
              primaryTo="/magic-creator"
            />
          )}

          {dayJobs.map((job) => (
            <div key={job.id} className="border border-neutral-200 bg-white p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {new Date(job.scheduledAt).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  · {job.publishMode}
                </span>
                <span
                  className={`text-xs ${
                    job.status === 'failed'
                      ? 'text-red-700'
                      : job.status === 'pending_approval'
                        ? 'text-amber-700'
                        : 'text-neutral-600'
                  }`}
                >
                  {statusLabel(job.status)}
                </span>
              </div>
              <p className="line-clamp-3 text-sm text-neutral-600">
                {job.contents.map((c) => c.label).join(' / ')}
                {' — '}
                {job.contents[0]?.content.slice(0, 100)}
              </p>
              {job.errorMessage && (
                <p className="mt-2 text-xs text-red-700">{job.errorMessage}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {job.status === 'pending_approval' && canApprove && (
                  <button
                    type="button"
                    disabled={busyId === job.id}
                    onClick={() => handleApprove(job.id)}
                    className="buzz-btn-primary min-h-[44px] px-3 py-1.5 text-xs disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {busyId === job.id ? '承認中...' : '承認'}
                  </button>
                )}
                {(job.status === 'failed' || job.status === 'pending_approval') && (
                  <>
                    {job.status === 'failed' && (
                      <button
                        type="button"
                        disabled={busyId === job.id}
                        onClick={() => handleRetry(job.id)}
                        className="inline-flex min-h-[44px] items-center gap-1 border border-red-300 bg-red-50 px-3 py-1.5 text-xs text-red-800 disabled:opacity-60"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        再送
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === job.id}
                      onClick={() => handleDraft(job.id)}
                      className="min-h-[44px] border border-neutral-300 px-3 py-1.5 text-xs"
                    >
                      下書きに戻す
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const text = job.contents.map((c) => `【${c.label}】\n${c.content}`).join('\n\n---\n\n');
                    navigator.clipboard?.writeText(text);
                    setMessage('手動投稿用に全文をコピーしました');
                  }}
                  className="min-h-[44px] border border-neutral-300 px-3 py-1.5 text-xs hover:border-neutral-900"
                >
                  手動用にコピー
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
