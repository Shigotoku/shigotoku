import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Clock, Sparkles } from 'lucide-react';
import { fetchScheduledJobs, approveScheduledJob, retryScheduledJob, revertScheduledJobToDraft, updateScheduledJob, fetchSettings, scheduleViaApi, type PublishMode, type ScheduledJob } from '../../lib/api';
import { applyDateAndHour, applyDateKeepTime, buildTempoDates, findEmptyWeekdays, findSlotConflicts, nudgeToOpenSlot, shiftIsoByDays, suggestBestHours, suggestOpenSlotsForDay } from '../../lib/bulkSchedule';
import { loadCalendarViewPref, loadDropHourPref, saveDropHourPref } from '../../lib/schedulePrefs';
import { useStore } from '../../store/storeContext';
import { usePersona } from '../../store/personaContext';
import { canApprovePosts } from '../../lib/permissions';
import { getSnsNavPlatform, jobMatchesSnsPlatform } from '../../lib/snsPlatforms';
import { getPostTemplates } from '../../data/postTemplates';
import { settingsPath } from '../../lib/settingsUrls';
import { isEditableStatus, startOfWeek, startOfMonth, sameDay, type FilterKey, type ViewMode } from './calendarUtils';

export type CalendarPageProps = {
  /** 指定時はこの SNS の予約だけ表示（/sns/:platform ハブ用） */
  platformId?: string;
  /** 外側（SnsHub）がヘッダーを出す場合はツールバーを簡略化 */
  embedded?: boolean;
};

/** カレンダー画面の状態・取得・操作（CalendarPage から分離。画面は描画に専念する） */
export function useCalendarState({ platformId, embedded }: CalendarPageProps) {
  const { userRole } = useStore();
  const { activePersonaId, activePersona } = usePersona();
  const canApprove = canApprovePosts(userRole);
  const sns = platformId ? getSnsNavPlatform(platformId) : undefined;
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState<FilterKey>(() => {
    const f = searchParams.get('filter');
    return f === 'draft' || f === 'failed' || f === 'pending' || f === 'pending_approval' || f === 'done' ? f : 'all';
  });
  const [viewMode, setViewMode] = useState<ViewMode>(() => (embedded ? 'month' : loadCalendarViewPref()));
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [rightTab, setRightTab] = useState<'history' | 'day'>('history');
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingJob, setEditingJob] = useState<ScheduledJob | null>(null);
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
  const [approveConfirmJob, setApproveConfirmJob] = useState<ScheduledJob | null>(null);

  const load = () => {
    if (!activePersonaId) return;
    setLoading(true);
    fetchScheduledJobs(undefined, activePersonaId)
      .then((r) => setJobs(r.jobs))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  };

  const loadConnections = () => {
    fetchSettings()
      .then((s) =>
        setConnected({
          x: !!s.xConnected,
          meta: !!s.metaConnected,
          line: !!s.lineChannelAccessToken?.trim(),
        }),
      )
      .catch(() => {});
  };

  useEffect(() => {
    load();
    loadConnections();
    const onPersona = () => {
      load();
      loadConnections();
    };
    window.addEventListener('buzzit-persona-changed', onPersona);
    return () => window.removeEventListener('buzzit-persona-changed', onPersona);
  }, [activePersonaId]);

  const scopedJobs = useMemo(() => {
    if (!platformId) return jobs;
    return jobs.filter((j) => jobMatchesSnsPlatform(j, platformId));
  }, [jobs, platformId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scopedJobs.filter((j) => {
      if (q) {
        const hay = [...j.contents.map((c) => c.content), ...(j.tags ?? []), j.topic ?? ''].join('\n').toLowerCase();
        if (!hay.includes(q.replace(/^#/, ''))) return false;
      }
      if (filter === 'all') return true;
      if (filter === 'done') return j.status === 'published' || j.status === 'notified';
      return j.status === filter;
    });
  }, [scopedJobs, filter, search]);

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
      const res = await approveScheduledJob(id);
      setMessage(res.message ?? (res.needsSecondApproval ? '1人目を承認しました。別の担当者の2人目承認が必要です。' : '承認しました。予約キューに入りました。'));
      load();
    } catch {
      setMessage('承認に失敗しました');
    }
    setBusyId(null);
    setApproveConfirmJob(null);
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

  const openEdit = (job: ScheduledJob) => setEditingJob(job);


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
      if (!window.confirm(`下書き ${n} 件を、空き日のおすすめ時刻に予約します。よろしいですか？（日時はあとから変更できます）`)) {
        setFillingGaps(false);
        return;
      }
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

  const pickDay = (d: Date) => {
    setSelectedDay(d);
    if (embedded) setRightTab('day');
  };

  const alertCount =
    ((!platformId || platformId === 'x') && connected.x === false ? 1 : 0) +
    (failedCount > 0 ? 1 : 0) +
    (approvalCount > 0 ? 1 : 0) +
    (gapDays.length > 0 || emptyGaps.length > 0 ? 1 : 0);

  const alertBlocks = (
    <>
      {(!platformId || platformId === 'x') && connected.x === false && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">
            「{activePersona?.name ?? 'このキャラ'}」の X（自動投稿）が未連携です
          </p>
          <p className="mt-1 text-xs text-amber-900/85">
            画面上部の紫バーでキャラを確認し、設定で<strong>同じキャラ</strong>用の X API を接続してください。
          </p>
          <Link
            to={settingsPath({ tab: 'sns', section: 'x' })}
            className="mt-2 inline-flex min-h-[40px] items-center border border-amber-900 bg-amber-900 px-3 text-xs font-medium text-white"
          >
            設定 → X 連携を開く
          </Link>
        </div>
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
        <div className={`border border-amber-200 bg-amber-50 text-sm text-amber-950 ${embedded ? 'px-3 py-2' : 'p-3'}`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">
                空き日の穴埋め
                {embedded && (
                  <span className="ml-2 font-normal text-amber-900/80">
                    {emptyGaps.slice(0, 3).map((g) => g.label).join('・') || gapDays.slice(0, 3).join('・')}
                    {emptyGaps.length > 3 ? ` ほか${emptyGaps.length - 3}日` : ''}
                  </span>
                )}
              </p>
              {!embedded && (
                <p className="mt-0.5 text-xs text-amber-900/80">
                  直近の空き平日: {emptyGaps.slice(0, 5).map((g) => g.label).join('・') || gapDays.join('・')}
                  {emptyGaps.length > 5 ? ` ほか${emptyGaps.length - 5}日` : ''}
                </p>
              )}
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

    </>
  );

  return {
    userRole,
    activePersonaId,
    activePersona,
    canApprove,
    sns,
    jobs,
    setJobs,
    filter,
    setFilter,
    viewMode,
    setViewMode,
    alertsOpen,
    setAlertsOpen,
    search,
    setSearch,
    rightTab,
    setRightTab,
    month,
    setMonth,
    weekStart,
    setWeekStart,
    selectedDay,
    setSelectedDay,
    busyId,
    setBusyId,
    message,
    setMessage,
    loading,
    setLoading,
    editingJob,
    setEditingJob,
    draggingId,
    setDraggingId,
    dropDateKey,
    setDropDateKey,
    dragGhost,
    setDragGhost,
    cloneJob,
    setCloneJob,
    connected,
    setConnected,
    fillingGaps,
    setFillingGaps,
    shifting,
    setShifting,
    dropHour,
    setDropHour,
    monthDropPicker,
    setMonthDropPicker,
    undoStack,
    setUndoStack,
    tempoJob,
    setTempoJob,
    tempoWeeks,
    setTempoWeeks,
    tempoBusy,
    setTempoBusy,
    approveConfirmJob,
    setApproveConfirmJob,
    load,
    loadConnections,
    scopedJobs,
    filtered,
    gapDays,
    jobsByDay,
    calendarCells,
    dayJobs,
    handleApprove,
    handleRetry,
    handleDraft,
    openEdit,
    failedCount,
    approvalCount,
    draftJobs,
    createHref,
    emptyGaps,
    bestHours,
    preferredHourList,
    dayOpenSlots,
    placeJobAt,
    undoLastMove,
    shiftVisibleWeek,
    runTempoCopy,
    onDragMove,
    handleDropOnSlot,
    slotKey,
    dateDropProps,
    fillGapsWithDrafts,
    quickPlaceDraftOnSelected,
    beginDrag,
    endDrag,
    setDropHourPref,
    pickDay,
    alertCount,
    alertBlocks,
  };
}
