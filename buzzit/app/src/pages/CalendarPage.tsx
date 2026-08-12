import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Pencil,
  X,
  GripVertical,
  CopyPlus,
  Sparkles,
  Undo2,
  CalendarPlus,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import {
  fetchScheduledJobs,
  approveScheduledJob,
  retryScheduledJob,
  revertScheduledJobToDraft,
  updateScheduledJob,
  fetchSettings,
  scheduleViaApi,
  type PublishMode,
  type ScheduledJob,
} from '../lib/api';
import { defaultScheduleLocalValue, isFutureLocalDatetime, toDatetimeLocalValue } from '../lib/datetime';
import {
  WEEK_HOUR_SLOTS,
  applyDateAndHour,
  applyDateKeepTime,
  buildTempoDates,
  findEmptyWeekdays,
  findSlotConflicts,
  nearestHourSlot,
  nudgeToOpenSlot,
  shiftIsoByDays,
  suggestBestHours,
  suggestOpenSlotsForDay,
} from '../lib/bulkSchedule';
import { loadCalendarViewPref, loadDropHourPref, saveCalendarViewPref, saveDropHourPref } from '../lib/schedulePrefs';
import EmptyState from '../components/EmptyState';
import CloneStaggerModal from '../components/CloneStaggerModal';
import { useStore } from '../store/storeContext';
import { canApprovePosts } from '../lib/permissions';
import { getSnsNavPlatform, jobMatchesSnsPlatform } from '../lib/snsPlatforms';
import { getPostTemplates } from '../data/postTemplates';

type EditableStatus = 'pending' | 'pending_approval' | 'draft' | 'failed';

function isEditableStatus(status: ScheduledJob['status']): status is EditableStatus {
  return status === 'pending' || status === 'pending_approval' || status === 'draft' || status === 'failed';
}

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

type CalendarPageProps = {
  /** 指定時はこの SNS の予約だけ表示（/sns/:platform ハブ用） */
  platformId?: string;
  /** 外側（SnsHub）がヘッダーを出す場合はツールバーを簡略化 */
  embedded?: boolean;
};

export default function CalendarPage({ platformId, embedded }: CalendarPageProps = {}) {
  const { userRole } = useStore();
  const canApprove = canApprovePosts(userRole);
  const sns = platformId ? getSnsNavPlatform(platformId) : undefined;
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [viewMode, setViewMode] = useState<ViewMode>(() => loadCalendarViewPref());
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingJob, setEditingJob] = useState<ScheduledJob | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editMode, setEditMode] = useState<PublishMode>('notify');
  const [editContents, setEditContents] = useState<ScheduledJob['contents']>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropDateKey, setDropDateKey] = useState<string | null>(null);
  const [dragGhost, setDragGhost] = useState<{ label: string; x: number; y: number } | null>(null);
  const [cloneJob, setCloneJob] = useState<ScheduledJob | null>(null);
  const [connected, setConnected] = useState<{ x?: boolean; meta?: boolean; line?: boolean }>({});
  const [fillingGaps, setFillingGaps] = useState(false);
  const [shifting, setShifting] = useState(false);
  /** 月ビュー等でドロップ時に使う時刻（null = 元の時刻を維持） */
  const [dropHour, setDropHour] = useState<number | null>(() => loadDropHourPref());
  const [monthDropPicker, setMonthDropPicker] = useState<{
    date: Date;
    jobId: string;
  } | null>(null);
  const [undoStack, setUndoStack] = useState<Array<{ jobId: string; scheduledAt: string; publishMode: PublishMode }>>(
    [],
  );
  const [tempoJob, setTempoJob] = useState<ScheduledJob | null>(null);
  const [tempoWeeks, setTempoWeeks] = useState(4);
  const [tempoBusy, setTempoBusy] = useState(false);

  const load = () => {
    setLoading(true);
    fetchScheduledJobs()
      .then((r) => setJobs(r.jobs))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    fetchSettings()
      .then((s) =>
        setConnected({
          x: !!s.xConnected,
          meta: !!s.metaConnected,
          line: !!s.lineChannelAccessToken?.trim(),
        }),
      )
      .catch(() => {});
  }, []);

  const scopedJobs = useMemo(() => {
    if (!platformId) return jobs;
    return jobs.filter((j) => jobMatchesSnsPlatform(j, platformId));
  }, [jobs, platformId]);

  const filtered = useMemo(() => {
    return scopedJobs.filter((j) => {
      if (filter === 'all') return true;
      if (filter === 'done') return j.status === 'published' || j.status === 'notified';
      return j.status === filter;
    });
  }, [scopedJobs, filter]);

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
      setMessage('下書きに戻しました。内容を編集して再予約できます。');
      load();
    } catch {
      setMessage('下書き化に失敗しました');
    }
    setBusyId(null);
  };

  const openEdit = (job: ScheduledJob) => {
    const at = new Date(job.scheduledAt);
    let local = defaultScheduleLocalValue(2);
    if (!Number.isNaN(at.getTime()) && at.getTime() > Date.now()) {
      local = toDatetimeLocalValue(at);
    }
    setEditingJob(job);
    setEditDate(local);
    setEditMode(job.publishMode);
    setEditContents(
      job.contents.map((c) => ({
        ...c,
        carouselSlides: c.carouselSlides ? [...c.carouselSlides] : undefined,
      })),
    );
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingJob) return;
    setEditError(null);
    if (!isFutureLocalDatetime(editDate)) {
      setEditError('過去の日時には予約できません。未来の日時を指定してください。');
      return;
    }
    if (editContents.some((c) => !c.content.trim())) {
      setEditError('本文が空のプラットフォームがあります');
      return;
    }
    setEditSaving(true);
    try {
      await updateScheduledJob(editingJob.id, {
        scheduledAt: new Date(editDate).toISOString(),
        publishMode: editMode,
        contents: editContents,
      });
      setMessage('予約内容を更新しました');
      setEditingJob(null);
      load();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '更新に失敗しました');
    }
    setEditSaving(false);
  };

  const failedCount = scopedJobs.filter((j) => j.status === 'failed').length;
  const approvalCount = scopedJobs.filter((j) => j.status === 'pending_approval').length;
  const draftJobs = useMemo(
    () => scopedJobs.filter((j) => j.status === 'draft' || j.status === 'pending_approval'),
    [scopedJobs],
  );
  const createHref = platformId
    ? `/magic-creator?sns=${encodeURIComponent(platformId)}`
    : '/magic-creator';

  const emptyGaps = useMemo(() => findEmptyWeekdays(scopedJobs, 14), [scopedJobs]);
  const bestHours = useMemo(() => suggestBestHours(scopedJobs, 3), [scopedJobs]);
  const preferredHourList = useMemo(() => bestHours.map((h) => h.hour), [bestHours]);
  const dayOpenSlots = useMemo(() => {
    if (!selectedDay) return [];
    return suggestOpenSlotsForDay(selectedDay, scopedJobs, preferredHourList);
  }, [selectedDay, scopedJobs, preferredHourList]);

  const placeJobAt = async (job: ScheduledJob, targetDate: Date, hour: number, opts?: { force?: boolean }) => {
    let nextIso = applyDateAndHour(targetDate, hour);
    const conflicts = findSlotConflicts(scopedJobs, nextIso, job.id);
    if (conflicts.length > 0 && !opts?.force) {
      const nudged = nudgeToOpenSlot(targetDate, hour, scopedJobs, job.id);
      const ok = window.confirm(
        `${String(hour).padStart(2, '0')}:00 は既に「${conflicts.map((c) => c.label).join('、')}」があります。\n空きの ${String(nudged.hour).padStart(2, '0')}:00 にずらしますか？\n（キャンセルで同じ枠に重ねて配置）`,
      );
      if (ok) {
        nextIso = nudged.iso;
        hour = nudged.hour;
      }
    }
    const prevAt = job.scheduledAt;
    setBusyId(job.id);
    setMessage(null);
    try {
      await updateScheduledJob(job.id, {
        scheduledAt: nextIso,
        ...(job.status === 'draft' ? { publishMode: job.publishMode } : {}),
      });
      setUndoStack((prev) => [{ jobId: job.id, scheduledAt: prevAt, publishMode: job.publishMode }, ...prev].slice(0, 10));
      const timeLabel = new Date(nextIso).toLocaleString('ja-JP', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      setMessage(
        job.status === 'draft' ? `${timeLabel} に本予約として配置しました` : `${timeLabel} へ移動しました`,
      );
      setSelectedDay(targetDate);
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '配置に失敗しました');
    }
    setBusyId(null);
  };

  const undoLastMove = async () => {
    const last = undoStack[0];
    if (!last) return;
    setBusyId(last.jobId);
    try {
      await updateScheduledJob(last.jobId, {
        scheduledAt: last.scheduledAt,
        publishMode: last.publishMode,
      });
      setUndoStack((prev) => prev.slice(1));
      setMessage('直前の移動を元に戻しました');
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Undo に失敗しました');
    }
    setBusyId(null);
  };

  const shiftVisibleWeek = async (days: number) => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 7);
    const targets = scopedJobs.filter((j) => {
      if (!isEditableStatus(j.status)) return false;
      const at = new Date(j.scheduledAt);
      return at >= weekStart && at < end;
    });
    if (targets.length === 0) {
      setMessage('この週にずらせる予約がありません');
      return;
    }
    if (!window.confirm(`表示中の週の予約 ${targets.length} 件を ${days > 0 ? '+' : ''}${days} 日ずらしますか？`)) {
      return;
    }
    setShifting(true);
    setMessage(null);
    try {
      for (const job of targets) {
        setUndoStack((prev) =>
          [{ jobId: job.id, scheduledAt: job.scheduledAt, publishMode: job.publishMode }, ...prev].slice(0, 30),
        );
        await updateScheduledJob(job.id, { scheduledAt: shiftIsoByDays(job.scheduledAt, days) });
      }
      if (Math.abs(days) >= 7) {
        const nextWeek = new Date(weekStart);
        nextWeek.setDate(weekStart.getDate() + days);
        setWeekStart(startOfWeek(nextWeek));
      }
      setMessage(`${targets.length} 件を ${days} 日ずらしました（元に戻すで直前1件ずつ戻せます）`);
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '週シフトに失敗しました');
    }
    setShifting(false);
  };

  const runTempoCopy = async () => {
    if (!tempoJob?.contents[0]) return;
    setTempoBusy(true);
    try {
      const dates = buildTempoDates(tempoJob.scheduledAt, tempoWeeks);
      if (dates.length === 0) {
        setMessage('未来の週に複製できる日時がありません');
        setTempoBusy(false);
        return;
      }
      for (const at of dates) {
        await scheduleViaApi({
          contents: tempoJob.contents,
          scheduledAt: at,
          publishMode: tempoJob.publishMode,
          mediaUrls: tempoJob.mediaUrls,
        });
      }
      setMessage(`同じ枠で ${dates.length} 週分をテンポ複製しました`);
      setTempoJob(null);
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'テンポ複製に失敗しました');
    }
    setTempoBusy(false);
  };

  const onDragMove = (e: DragEvent) => {
    if (!draggingId) return;
    setDragGhost((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : prev));
  };

  const handleDropOnSlot = async (targetDate: Date, hour?: number, opts?: { fromMonth?: boolean }) => {
    if (!draggingId) return;
    const job = scopedJobs.find((j) => j.id === draggingId);
    setDropDateKey(null);
    const dragId = draggingId;
    setDraggingId(null);
    if (!job || !isEditableStatus(job.status)) {
      setMessage('この予約は移動できません');
      return;
    }
    // 月ビュー: 既定時刻が未選択ならピッカー、選んでいればその時刻で即配置
    if (opts?.fromMonth && hour == null && dropHour == null) {
      setMonthDropPicker({ date: targetDate, jobId: dragId });
      setSelectedDay(targetDate);
      return;
    }
    const effectiveHour = hour ?? dropHour ?? undefined;
    if (effectiveHour != null) {
      await placeJobAt(job, targetDate, effectiveHour);
      return;
    }
    const prevAt = job.scheduledAt;
    const nextIso = applyDateKeepTime(job.scheduledAt, targetDate);
    setBusyId(job.id);
    try {
      await updateScheduledJob(job.id, {
        scheduledAt: nextIso,
        ...(job.status === 'draft' ? { publishMode: job.publishMode } : {}),
      });
      setUndoStack((prev) => [{ jobId: job.id, scheduledAt: prevAt, publishMode: job.publishMode }, ...prev].slice(0, 10));
      setMessage(
        `${new Date(nextIso).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} へ移動しました`,
      );
      setSelectedDay(targetDate);
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '移動に失敗しました');
    }
    setBusyId(null);
  };

  const slotKey = (date: Date, hour?: number) =>
    hour != null ? `${date.toDateString()}@${hour}` : date.toDateString();

  const dateDropProps = (date: Date, hour?: number, fromMonth?: boolean) => ({
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDropDateKey(slotKey(date, hour));
    },
    onDragLeave: () => {
      setDropDateKey((prev) => (prev === slotKey(date, hour) ? null : prev));
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      void handleDropOnSlot(date, hour, { fromMonth });
    },
  });

  const fillGapsWithDrafts = async () => {
    const drafts = scopedJobs.filter((j) => j.status === 'draft');
    if (drafts.length === 0 || emptyGaps.length === 0) {
      setMessage('穴埋めには下書きと空き日が必要です。まずネタクリエイターで下書きを作ってください。');
      return;
    }
    setFillingGaps(true);
    setMessage(null);
    try {
      const n = Math.min(drafts.length, emptyGaps.length);
      const hours = preferredHourList.length ? preferredHourList : [12, 18, 20];
      for (let i = 0; i < n; i++) {
        const hour = hours[i % hours.length] ?? 12;
        const iso = applyDateAndHour(emptyGaps[i].date, hour);
        await updateScheduledJob(drafts[i].id, {
          scheduledAt: iso,
          publishMode: drafts[i].publishMode,
        });
      }
      setMessage(`${n}件の下書きを空き日のおすすめ時刻に自動配置しました`);
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '穴埋めに失敗しました');
    }
    setFillingGaps(false);
  };

  const quickPlaceDraftOnSelected = async (hour: number) => {
    if (!selectedDay) return;
    const draft = scopedJobs.find((j) => j.status === 'draft');
    if (!draft) {
      setMessage('配置できる下書きがありません');
      return;
    }
    await placeJobAt(draft, selectedDay, hour);
  };

  const beginDrag = (job: ScheduledJob, e: DragEvent) => {
    e.dataTransfer.setData('text/plain', job.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(job.id);
    setDragGhost({
      label: job.contents.map((c) => c.label).join('/') || '予約',
      x: e.clientX,
      y: e.clientY,
    });
  };

  const endDrag = () => {
    setDraggingId(null);
    setDropDateKey(null);
    setDragGhost(null);
  };

  const setDropHourPref = (hour: number | null) => {
    setDropHour(hour);
    saveDropHourPref(hour);
  };

  return (
    <div
      className={embedded ? 'space-y-4' : 'buzz-page'}
      onDragOver={(e) => {
        if (draggingId) {
          e.preventDefault();
          onDragMove(e);
        }
      }}
    >
      {dragGhost && (
        <div
          className="pointer-events-none fixed z-[60] max-w-[200px] truncate border border-neutral-900 bg-neutral-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{ left: dragGhost.x + 12, top: dragGhost.y + 12 }}
        >
          {dragGhost.label}
          {dropHour != null ? ` → ${String(dropHour).padStart(2, '0')}:00` : ''}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-neutral-500">
          週ビューは時間帯へドロップ。月ビューは日付ドロップ後に時刻を選べます。下書きトレイからも配置できます。
        </p>
        <div className="flex flex-wrap gap-2">
          {undoStack.length > 0 && (
            <button
              type="button"
              onClick={() => void undoLastMove()}
              className="inline-flex min-h-[44px] items-center gap-1 border border-neutral-300 px-3 py-2 text-sm"
            >
              <Undo2 className="h-3.5 w-3.5" />
              元に戻す
            </button>
          )}
          {(!platformId || platformId === 'x') && (
            <Link to="/x-series" className="min-h-[44px] border border-neutral-300 px-3 py-2 text-sm">
              Xシリーズ
            </Link>
          )}
          <Link to={createHref} className="buzz-btn-primary shrink-0">
            {sns ? `${sns.name}の投稿を作る` : '新しい投稿を作る'}
          </Link>
        </div>
      </div>

      <section className="border border-neutral-200 bg-white p-3">
        <p className="mb-2 text-xs font-medium text-neutral-600">おすすめ投稿時刻（ドロップ時の既定・記憶されます）</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDropHourPref(null)}
            className={`border px-2.5 py-1.5 text-xs ${
              dropHour === null ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-[#f5f4f0]'
            }`}
          >
            元の時刻を維持
          </button>
          {WEEK_HOUR_SLOTS.map((hour) => {
            const tip = bestHours.find((b) => b.hour === hour);
            const isBest = preferredHourList.includes(hour);
            return (
              <button
                key={hour}
                type="button"
                onClick={() => setDropHourPref(hour)}
                title={tip?.reason}
                className={`border px-2.5 py-1.5 text-xs ${
                  dropHour === hour
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : isBest
                      ? 'border-amber-700 bg-amber-50 text-amber-950'
                      : 'border-neutral-200 bg-[#f5f4f0]'
                }`}
              >
                {String(hour).padStart(2, '0')}:00
                {isBest ? ' ★' : ''}
              </button>
            );
          })}
        </div>
        {bestHours[0] && (
          <p className="mt-2 text-[11px] text-neutral-500">
            上位: {bestHours.map((h) => `${String(h.hour).padStart(2, '0')}:00（${h.reason}）`).join(' / ')}
          </p>
        )}
      </section>

      {draftJobs.length > 0 && (
        <section className="border border-dashed border-neutral-300 bg-white p-3">
          <p className="mb-2 text-xs font-medium text-neutral-600">
            ドラッグ用トレイ（下書き・承認待ち）— 週ビューの時間帯 or 月ビューの日付へドロップ
          </p>
          <div className="flex flex-wrap gap-2">
            {draftJobs.map((job) => (
              <div
                key={`tray-${job.id}`}
                draggable={isEditableStatus(job.status)}
                onDragStart={(e) => beginDrag(job, e)}
                onDragEnd={endDrag}
                className={`inline-flex max-w-[220px] cursor-grab items-center gap-1.5 border px-2.5 py-2 text-xs active:cursor-grabbing ${
                  draggingId === job.id
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-300 bg-[#f5f4f0] text-neutral-800'
                }`}
              >
                <GripVertical className="h-3.5 w-3.5 shrink-0 opacity-60" />
                <span className="truncate">
                  {job.contents.map((c) => c.label).join('/')} · {statusLabel(job.status)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

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

      {(gapDays.length > 0 || emptyGaps.length > 0) && (
        <div className="border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">空き日の穴埋め</p>
              <p className="mt-0.5 text-xs text-amber-900/80">
                直近の空き平日: {emptyGaps.slice(0, 5).map((g) => g.label).join('・') || gapDays.join('・')}
                {emptyGaps.length > 5 ? ` ほか${emptyGaps.length - 5}日` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={fillingGaps || draftJobs.filter((j) => j.status === 'draft').length === 0}
                onClick={() => void fillGapsWithDrafts()}
                className="inline-flex min-h-[40px] items-center gap-1.5 border border-amber-900 bg-amber-900 px-3 text-xs font-medium text-white disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {fillingGaps ? '配置中...' : '下書きで空き日を埋める'}
              </button>
              <Link
                to={`/magic-creator?idea=${encodeURIComponent(getPostTemplates()[0]?.idea ?? '今週の空き枠を埋める投稿')}`}
                className="inline-flex min-h-[40px] items-center border border-amber-800 px-3 text-xs"
              >
                ネタを作って埋める
              </Link>
            </div>
          </div>
        </div>
      )}

      {message && <p className="buzz-alert buzz-alert-info text-sm">{message}</p>}

      <div className="flex flex-wrap gap-2">
        {(['week', 'month'] as ViewMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setViewMode(m);
              saveCalendarViewPref(m);
            }}
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
            <div className="text-center">
              <h3 className="font-semibold">
                {viewMode === 'week'
                  ? `${weekStart.toLocaleDateString('ja-JP')} の週`
                  : `${month.getFullYear()}年 ${month.getMonth() + 1}月`}
              </h3>
              {viewMode === 'week' && (
                <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
                  <button
                    type="button"
                    disabled={shifting}
                    onClick={() => void shiftVisibleWeek(-7)}
                    className="inline-flex items-center gap-0.5 border border-neutral-200 px-1.5 py-0.5 text-[10px] disabled:opacity-50"
                    title="表示週の予約を1週間前へ"
                  >
                    <ChevronsLeft className="h-3 w-3" />
                    週−1
                  </button>
                  <button
                    type="button"
                    disabled={shifting}
                    onClick={() => void shiftVisibleWeek(-1)}
                    className="border border-neutral-200 px-1.5 py-0.5 text-[10px] disabled:opacity-50"
                  >
                    日−1
                  </button>
                  <button
                    type="button"
                    disabled={shifting}
                    onClick={() => void shiftVisibleWeek(1)}
                    className="border border-neutral-200 px-1.5 py-0.5 text-[10px] disabled:opacity-50"
                  >
                    日+1
                  </button>
                  <button
                    type="button"
                    disabled={shifting}
                    onClick={() => void shiftVisibleWeek(7)}
                    className="inline-flex items-center gap-0.5 border border-neutral-200 px-1.5 py-0.5 text-[10px] disabled:opacity-50"
                    title="表示週の予約を1週間後へ"
                  >
                    週+1
                    <ChevronsRight className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
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
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                <div
                  className="mb-1 grid gap-1 text-center text-[10px] text-neutral-500"
                  style={{ gridTemplateColumns: '40px repeat(7, 1fr)' }}
                >
                  <div />
                  {Array.from({ length: 7 }).map((_, i) => {
                    const date = new Date(weekStart);
                    date.setDate(weekStart.getDate() + i);
                    const selected = selectedDay && sameDay(date, selectedDay);
                    return (
                      <button
                        key={date.toISOString()}
                        type="button"
                        onClick={() => setSelectedDay(date)}
                        className={`truncate py-1 ${selected ? 'font-bold text-neutral-900' : ''}`}
                      >
                        {date.toLocaleDateString('ja-JP', { weekday: 'short', day: 'numeric' })}
                      </button>
                    );
                  })}
                </div>
                {WEEK_HOUR_SLOTS.map((hour) => (
                  <div
                    key={hour}
                    className="mb-1 grid gap-1"
                    style={{ gridTemplateColumns: '40px repeat(7, 1fr)' }}
                  >
                    <div
                      className={`flex items-start justify-end pr-1 pt-1 text-[10px] ${
                        preferredHourList.includes(hour) ? 'font-semibold text-amber-800' : 'text-neutral-400'
                      }`}
                    >
                      {String(hour).padStart(2, '0')}:00
                    </div>
                    {Array.from({ length: 7 }).map((_, i) => {
                      const date = new Date(weekStart);
                      date.setDate(weekStart.getDate() + i);
                      const cellJobs = (jobsByDay.get(date.toDateString()) ?? []).filter(
                        (j) => nearestHourSlot(new Date(j.scheduledAt)) === hour,
                      );
                      const isDrop = dropDateKey === slotKey(date, hour);
                      return (
                        <div
                          key={`${date.toDateString()}-${hour}`}
                          {...dateDropProps(date, hour)}
                          onClick={() => setSelectedDay(date)}
                          className={`min-h-[52px] cursor-pointer border p-1 transition-colors ${
                            isDrop
                              ? 'border-neutral-900 bg-amber-50'
                              : preferredHourList.includes(hour) && cellJobs.length === 0
                                ? 'border-amber-100 bg-amber-50/40 hover:border-amber-300'
                                : 'border-neutral-100 bg-white hover:border-neutral-300'
                          }`}
                        >
                          {isDrop && (
                            <p className="text-[9px] font-medium text-neutral-700">
                              {draggingId &&
                              findSlotConflicts(
                                scopedJobs,
                                applyDateAndHour(date, hour),
                                draggingId,
                              ).length > 0
                                ? '衝突あり（空きへ提案）'
                                : 'ドロップ'}
                            </p>
                          )}
                          <div className="space-y-0.5">
                            {cellJobs.slice(0, 2).map((j) => (
                              <div
                                key={j.id}
                                draggable={isEditableStatus(j.status)}
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  beginDrag(j, e);
                                }}
                                onDragEnd={endDrag}
                                className={`truncate border px-1 py-0.5 text-[9px] ${
                                  j.status === 'failed'
                                    ? 'border-red-200 bg-red-50 text-red-800'
                                    : j.status === 'draft'
                                      ? 'border-dashed border-neutral-300 bg-[#f5f4f0]'
                                      : 'border-neutral-200 bg-neutral-50'
                                } ${draggingId === j.id ? 'opacity-40' : ''}`}
                              >
                                {j.contents[0]?.label ?? '予約'}
                              </div>
                            ))}
                            {cellJobs.length > 2 && (
                              <p className="text-[9px] text-neutral-400">+{cellJobs.length - 2}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
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
                  const isDrop = dropDateKey === cell.date.toDateString();
                  return (
                    <button
                      key={cell.date.toISOString()}
                      type="button"
                      onClick={() => setSelectedDay(cell.date)}
                      {...dateDropProps(cell.date, undefined, true)}
                      className={`min-h-[64px] border p-1.5 text-left transition-colors ${
                        isDrop
                          ? 'border-neutral-900 bg-amber-50'
                          : selected
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

          {selectedDay && dayOpenSlots.length > 0 && (
            <div className="border border-neutral-200 bg-[#f5f4f0] p-3">
              <p className="mb-2 text-xs font-medium text-neutral-600">この日の空きおすすめ枠（ワンタップ配置）</p>
              <div className="flex flex-wrap gap-2">
                {dayOpenSlots.map((slot) => (
                  <button
                    key={slot.hour}
                    type="button"
                    disabled={busyId != null || !scopedJobs.some((j) => j.status === 'draft')}
                    onClick={() => void quickPlaceDraftOnSelected(slot.hour)}
                    className="border border-neutral-300 bg-white px-2.5 py-1.5 text-xs hover:border-neutral-900 disabled:opacity-50"
                  >
                    {slot.label} に下書き1件
                  </button>
                ))}
              </div>
              {!scopedJobs.some((j) => j.status === 'draft') && (
                <p className="mt-2 text-[11px] text-neutral-500">
                  下書きがありません。クリエイターで「下書き保存」するとここに出せます。
                </p>
              )}
            </div>
          )}

          {loading && <p className="text-sm text-neutral-500">読み込み中...</p>}

          {!loading && dayJobs.length === 0 && (
            <EmptyState
              icon={CalendarDays}
              title="この日の予約はありません"
              description="ネタクリエイターで台本を作り「かんたん一括予約」するか、下書きを日付へドラッグして配置できます。"
              primaryLabel="投稿を作る"
              primaryTo="/magic-creator"
            />
          )}

          {dayJobs.map((job) => (
            <div
              key={job.id}
              draggable={isEditableStatus(job.status)}
              onDragStart={(e) => {
                if (!isEditableStatus(job.status)) return;
                beginDrag(job, e);
              }}
              onDragEnd={endDrag}
              className={`border border-neutral-200 bg-white p-4 ${
                isEditableStatus(job.status) ? 'cursor-grab active:cursor-grabbing' : ''
              } ${draggingId === job.id ? 'opacity-50' : ''}`}
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-sm font-medium">
                  {isEditableStatus(job.status) && (
                    <GripVertical className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
                  )}
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
              <div className="flex gap-3">
                {job.mediaUrls?.[0] && (
                  <img
                    src={job.mediaUrls[0]}
                    alt=""
                    className="h-14 w-14 shrink-0 border border-neutral-200 object-cover"
                  />
                )}
                <p className="line-clamp-3 text-sm text-neutral-600">
                  {job.contents.map((c) => c.label).join(' / ')}
                  {' — '}
                  {job.contents[0]?.content.slice(0, 100)}
                </p>
              </div>
              {job.errorMessage && (
                <p className="mt-2 text-xs text-red-700">{job.errorMessage}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {isEditableStatus(job.status) && (
                  <button
                    type="button"
                    onClick={() => openEdit(job)}
                    className="inline-flex min-h-[44px] items-center gap-1 border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-xs text-white"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    編集
                  </button>
                )}
                {job.contents[0] && (
                  <button
                    type="button"
                    onClick={() => setCloneJob(job)}
                    className="inline-flex min-h-[44px] items-center gap-1 border border-neutral-300 px-3 py-1.5 text-xs hover:border-neutral-900"
                  >
                    <CopyPlus className="h-3.5 w-3.5" />
                    他SNSへずらして複製
                  </button>
                )}
                {(job.status === 'pending' || job.status === 'draft' || job.status === 'pending_approval') && (
                  <button
                    type="button"
                    onClick={() => {
                      setTempoJob(job);
                      setTempoWeeks(4);
                    }}
                    className="inline-flex min-h-[44px] items-center gap-1 border border-neutral-300 px-3 py-1.5 text-xs hover:border-neutral-900"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    毎週同じ枠に複製
                  </button>
                )}
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
                {(job.status === 'failed' || job.status === 'pending_approval' || job.status === 'pending') && (
                  <button
                    type="button"
                    disabled={busyId === job.id}
                    onClick={() => handleDraft(job.id)}
                    className="min-h-[44px] border border-neutral-300 px-3 py-1.5 text-xs"
                  >
                    下書きに戻す
                  </button>
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

      {editingJob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4"
          onClick={() => !editSaving && setEditingJob(null)}
        >
          <div
            className="w-full max-w-lg max-h-[90dvh] overflow-y-auto border border-neutral-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">予約を編集</h3>
              <button
                type="button"
                disabled={editSaving}
                onClick={() => setEditingJob(null)}
                className="p-1 text-neutral-600 hover:text-neutral-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mb-1 block text-xs text-neutral-600">投稿モード</label>
            <select
              value={editMode}
              onChange={(e) => setEditMode(e.target.value as PublishMode)}
              className="mb-4 w-full border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            >
              <option value="notify">通知リマインダー</option>
              <option value="approval">承認後投稿</option>
              <option value="x_free">X API 自動投稿</option>
              <option value="meta">Meta 自動投稿</option>
              <option value="line">LINE ブロードキャスト</option>
              <option value="ayrshare">Ayrshare</option>
              <option value="gbp">Google Business Profile</option>
              <option value="auto">自動</option>
            </select>

            <label className="mb-1 block text-xs text-neutral-600">投稿日時</label>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {[
                { label: '今日 12時', hours: 0, at: 12 },
                { label: '今日 18時', hours: 0, at: 18 },
                { label: '明日 12時', hours: 24, at: 12 },
                { label: '明日 19時', hours: 24, at: 19 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setHours(d.getHours() + p.hours, 0, 0, 0);
                    d.setHours(p.at, 0, 0, 0);
                    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
                    setEditDate(toDatetimeLocalValue(d));
                    setEditError(null);
                  }}
                  className="border border-neutral-200 px-2 py-1 text-[11px] hover:border-neutral-900"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input
              type="datetime-local"
              value={editDate}
              min={toDatetimeLocalValue(new Date())}
              onChange={(e) => {
                setEditDate(e.target.value);
                setEditError(null);
              }}
              className="mb-4 w-full border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />

            <div className="mb-4 space-y-3">
              {editContents.map((item, idx) => (
                <label key={`${item.platform}-${idx}`} className="block">
                  <span className="mb-1 block text-xs font-medium text-neutral-700">{item.label}</span>
                  <textarea
                    value={item.content}
                    onChange={(e) => {
                      const next = [...editContents];
                      next[idx] = { ...next[idx], content: e.target.value };
                      setEditContents(next);
                    }}
                    rows={5}
                    className="w-full resize-y border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                </label>
              ))}
            </div>

            {editError && <p className="mb-3 text-sm text-red-700">{editError}</p>}

            <button
              type="button"
              disabled={editSaving || !isFutureLocalDatetime(editDate)}
              onClick={handleSaveEdit}
              className="buzz-btn-primary w-full disabled:opacity-70"
            >
              {editSaving ? '保存中...' : '変更を保存'}
            </button>
          </div>
        </div>
      )}

      {monthDropPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4"
          onClick={() => setMonthDropPicker(null)}
        >
          <div
            className="w-full max-w-sm border border-neutral-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold">時刻を選んで配置</h3>
            <p className="mt-1 text-sm text-neutral-600">
              {monthDropPicker.date.toLocaleDateString('ja-JP', {
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {suggestOpenSlotsForDay(monthDropPicker.date, scopedJobs, preferredHourList).map((slot) => (
                <button
                  key={slot.hour}
                  type="button"
                  className="border border-neutral-300 bg-white px-3 py-2 text-sm hover:border-neutral-900"
                  onClick={() => {
                    const job = scopedJobs.find((j) => j.id === monthDropPicker.jobId);
                    const picker = monthDropPicker;
                    setMonthDropPicker(null);
                    if (job) void placeJobAt(job, picker.date, slot.hour);
                  }}
                >
                  {slot.label}
                  {preferredHourList.includes(slot.hour) ? ' ★' : ''}
                </button>
              ))}
              {WEEK_HOUR_SLOTS.filter(
                (h) =>
                  !suggestOpenSlotsForDay(monthDropPicker.date, scopedJobs, preferredHourList).some(
                    (s) => s.hour === h,
                  ),
              ).map((hour) => (
                <button
                  key={`busy-${hour}`}
                  type="button"
                  className="border border-dashed border-neutral-200 px-3 py-2 text-sm text-neutral-500 hover:border-neutral-400"
                  onClick={() => {
                    const job = scopedJobs.find((j) => j.id === monthDropPicker.jobId);
                    const picker = monthDropPicker;
                    setMonthDropPicker(null);
                    if (job) void placeJobAt(job, picker.date, hour);
                  }}
                >
                  {String(hour).padStart(2, '0')}:00
                </button>
              ))}
            </div>
            <button
              type="button"
              className="mt-4 w-full border border-neutral-300 py-2 text-sm"
              onClick={() => setMonthDropPicker(null)}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {tempoJob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4"
          onClick={() => !tempoBusy && setTempoJob(null)}
        >
          <div
            className="w-full max-w-sm border border-neutral-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold">テンポ複製（毎週同じ枠）</h3>
            <p className="mt-1 text-sm text-neutral-600">
              {new Date(tempoJob.scheduledAt).toLocaleString('ja-JP', {
                weekday: 'short',
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              と同じ曜日・時刻で、これから何週分を予約しますか？
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[2, 4, 8, 12].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setTempoWeeks(w)}
                  className={`border px-3 py-2 text-sm ${
                    tempoWeeks === w ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200'
                  }`}
                >
                  {w}週
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-neutral-500">
              作成予定: {buildTempoDates(tempoJob.scheduledAt, tempoWeeks).length} 件
              {tempoJob.mediaUrls?.length ? ` · 素材 ${tempoJob.mediaUrls.length}件も引き継ぎ` : ''}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                disabled={tempoBusy}
                onClick={() => void runTempoCopy()}
                className="buzz-btn-primary disabled:opacity-70"
              >
                {tempoBusy ? '複製中...' : `${tempoWeeks}週分を予約する`}
              </button>
              <button
                type="button"
                disabled={tempoBusy}
                onClick={() => setTempoJob(null)}
                className="border border-neutral-300 py-2 text-sm"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      <CloneStaggerModal
        open={!!cloneJob}
        job={cloneJob}
        onClose={() => setCloneJob(null)}
        connected={connected}
        onDone={(msg) => {
          setMessage(msg);
          load();
        }}
      />
    </div>
  );
}
