import { useCallback, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, GripVertical, Undo2, ChevronsLeft, ChevronsRight } from 'lucide-react';
import FlowProgressBar from '../components/FlowProgressBar';
import { WEEK_HOUR_SLOTS } from '../lib/bulkSchedule';
import CloneStaggerModal from '../components/CloneStaggerModal';
import PersonaPublishConfirmModal from '../components/PersonaPublishConfirmModal';
import HeaderNotice from '../components/HeaderNotice';
import DualApprovalSetupBanner from '../components/DualApprovalSetupBanner';
import EditJobModal from './calendar/EditJobModal';
import CalendarGrid from './calendar/CalendarGrid';
import DayPanel from './calendar/DayPanel';
import CalendarToolbar from './calendar/CalendarToolbar';
import MonthDropPickerModal from './calendar/MonthDropPickerModal';
import TempoCopyModal from './calendar/TempoCopyModal';
import { isEditableStatus, statusLabel } from './calendar/calendarUtils';
import { useCalendarState, type CalendarPageProps } from './calendar/useCalendarState';

const SPLIT_KEY = 'buzzit.calendar.splitPct';
const SPLIT_MIN = 20;
const SPLIT_MAX = 80;
const SPLIT_DEFAULT = 60;

function clampSplit(n: number) {
  return Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, n));
}

export default function CalendarPage({ platformId, embedded }: CalendarPageProps = {}) {
  // カレンダー幅(%)。ドラッグで変更でき、localStorage に記憶する
  const [splitPct, setSplitPct] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem(SPLIT_KEY));
      return Number.isFinite(v) && v > 0 ? clampSplit(v) : SPLIT_DEFAULT;
    } catch {
      return SPLIT_DEFAULT;
    }
  });
  const gridRef = useRef<HTMLDivElement>(null);
  const saveSplit = useCallback((v: number) => {
    try { localStorage.setItem(SPLIT_KEY, String(Math.round(v))); } catch { /* noop */ }
  }, []);
  const onSplitPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const grid = gridRef.current;
    if (!grid) return;
    e.preventDefault();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const rect = grid.getBoundingClientRect();
    let latest = splitPct;
    const move = (ev: PointerEvent) => {
      latest = clampSplit(((ev.clientX - rect.left) / rect.width) * 100);
      setSplitPct(latest);
    };
    const up = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('pointercancel', up);
      saveSplit(latest);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', up);
  };
  const onSplitKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (e.key === 'ArrowLeft') next = clampSplit(splitPct - 3);
    else if (e.key === 'ArrowRight') next = clampSplit(splitPct + 3);
    else if (e.key === 'Home') next = SPLIT_MIN;
    else if (e.key === 'End') next = SPLIT_MAX;
    if (next == null) return;
    e.preventDefault();
    setSplitPct(next);
    saveSplit(next);
  };
  const { activePersona, canApprove, sns, filter, setFilter, viewMode, setViewMode, alertsOpen, setAlertsOpen, search, setSearch, rightTab, setRightTab, month, setMonth, weekStart, setWeekStart, selectedDay, busyId, message, setMessage, loading, editingJob, setEditingJob, draggingId, dropDateKey, dragGhost, cloneJob, setCloneJob, connected, shifting, dropHour, monthDropPicker, setMonthDropPicker, undoStack, tempoJob, setTempoJob, tempoWeeks, setTempoWeeks, tempoBusy, approveConfirmJob, setApproveConfirmJob, load, scopedJobs, jobsByDay, calendarCells, dayJobs, handleApprove, handleRetry, handleDraft, openEdit, draftJobs, createHref, bestHours, preferredHourList, dayOpenSlots, placeJobAt, undoLastMove, shiftVisibleWeek, runTempoCopy, onDragMove, slotKey, dateDropProps, quickPlaceDraftOnSelected, beginDrag, endDrag, setDropHourPref, pickDay, alertCount, alertBlocks } = useCalendarState({ platformId, embedded });

  return (
    <div
      className={embedded ? 'flex min-h-0 flex-1 flex-col gap-2 lg:gap-3' : 'buzz-page'}
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

      {!embedded && <FlowProgressBar current="schedule" className="buzz-fade-in" />}

      {!embedded && <DualApprovalSetupBanner compact />}

      {activePersona && !embedded && (
        <p className="text-xs text-neutral-600">
          表示中の予約・下書きは<strong className="font-semibold text-neutral-800">「{activePersona.name}」</strong>
          だけです。別キャラの予約は右上でキャラを切り替えて表示します。
        </p>
      )}

      {!embedded && alertCount > 0 && (
        <HeaderNotice label="注意" count={alertCount}>
          {alertBlocks}
        </HeaderNotice>
      )}

      <div className={embedded ? 'hidden' : 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'}>
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

      <section className={`border border-neutral-200 bg-white ${embedded ? 'flex flex-wrap items-center gap-2 px-3 py-2' : 'p-3'}`}>
        <p className={`text-sm font-medium text-neutral-700 ${embedded ? '' : 'mb-2'}`}>
          {embedded ? 'ドロップ時の時刻' : 'おすすめ投稿時刻（ドロップ時の既定・記憶されます）'}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setDropHourPref(null)}
            className={`border px-2.5 py-1.5 text-xs ${
              dropHour === null ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-neutral-50'
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
                      : 'border-neutral-200 bg-neutral-50'
                }`}
              >
                {String(hour).padStart(2, '0')}:00
                {isBest ? ' ★' : ''}
              </button>
            );
          })}
        </div>
        {bestHours[0] && !embedded && (
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
                    : 'border-neutral-300 bg-neutral-50 text-neutral-800'
                }`}
              >
                <GripVertical className="h-3.5 w-3.5 shrink-0 opacity-60" />
                <span className="truncate">
                  {job.contents.map((c) => c.label).join('/')} · {statusLabel(job.status, job)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {message && <p className="buzz-alert buzz-alert-info text-sm">{message}</p>}

      <CalendarToolbar
        embedded={embedded}
        alertCount={alertCount}
        setAlertsOpen={setAlertsOpen}
        viewMode={viewMode}
        setViewMode={setViewMode}
        undoCount={undoStack.length}
        undoLastMove={undoLastMove}
        filter={filter}
        setFilter={setFilter}
        search={search}
        setSearch={setSearch}
      />

      {embedded && alertsOpen && (
        <div className="max-h-[45vh] shrink-0 space-y-2 overflow-auto rounded-xl border border-amber-200 bg-white p-2 shadow-sm">
          {alertCount === 0 ? <p className="p-2 text-sm text-neutral-500">注意事項はありません。</p> : alertBlocks}
        </div>
      )}

      <div className="hidden items-center justify-end gap-1 text-xs lg:flex">
        <span className="mr-1 text-neutral-500">表示幅:</span>
        {([
          ['カレンダー重視', 75],
          ['均等', 50],
          ['履歴重視', 30],
          ['カレンダー最小化', SPLIT_MIN],
        ] as const).map(([label, pct]) => (
          <button
            key={label}
            type="button"
            onClick={() => { setSplitPct(pct); saveSplit(pct); }}
            className={`border px-2 py-1 ${Math.round(splitPct) === pct ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white hover:border-neutral-400'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        ref={gridRef}
        style={{ '--cal-cols': `minmax(0,${splitPct}fr) 12px minmax(0,${100 - splitPct}fr)` } as CSSProperties}
        className={`${embedded ? 'grid min-h-0 flex-1 gap-3' : 'grid gap-6'} lg:gap-0 lg:[grid-template-columns:var(--cal-cols)]`}
      >
        <div
          className={
            embedded
              ? 'flex min-h-[420px] min-w-0 flex-col rounded-xl border border-neutral-200/80 bg-white p-3 shadow-sm lg:min-h-0'
              : 'buzz-card-pad min-w-0'
          }
        >
          <div className={`flex shrink-0 items-center justify-between ${embedded ? 'mb-2' : 'mb-4'}`}>
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
                    className="inline-flex items-center gap-0.5 border border-neutral-200 px-1.5 py-0.5 text-xs disabled:opacity-50"
                    title="表示週の予約を1週間前へ"
                  >
                    <ChevronsLeft className="h-3 w-3" />
                    週−1
                  </button>
                  <button
                    type="button"
                    disabled={shifting}
                    onClick={() => void shiftVisibleWeek(-1)}
                    className="border border-neutral-200 px-1.5 py-0.5 text-xs disabled:opacity-50"
                  >
                    日−1
                  </button>
                  <button
                    type="button"
                    disabled={shifting}
                    onClick={() => void shiftVisibleWeek(1)}
                    className="border border-neutral-200 px-1.5 py-0.5 text-xs disabled:opacity-50"
                  >
                    日+1
                  </button>
                  <button
                    type="button"
                    disabled={shifting}
                    onClick={() => void shiftVisibleWeek(7)}
                    className="inline-flex items-center gap-0.5 border border-neutral-200 px-1.5 py-0.5 text-xs disabled:opacity-50"
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
          <CalendarGrid
            viewMode={viewMode}
            embedded={embedded}
            weekStart={weekStart}
            calendarCells={calendarCells}
            jobsByDay={jobsByDay}
            scopedJobs={scopedJobs}
            selectedDay={selectedDay}
            pickDay={pickDay}
            preferredHourList={preferredHourList}
            draggingId={draggingId}
            dropDateKey={dropDateKey}
            slotKey={slotKey}
            dateDropProps={dateDropProps}
            beginDrag={beginDrag}
            endDrag={endDrag}
          />
        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="カレンダーと投稿履歴の幅を変更（ドラッグ、または左右キー）"
          aria-valuemin={SPLIT_MIN}
          aria-valuemax={SPLIT_MAX}
          aria-valuenow={Math.round(splitPct)}
          tabIndex={0}
          title="ドラッグで幅を変更 / ダブルクリックで元に戻す"
          onPointerDown={onSplitPointerDown}
          onKeyDown={onSplitKeyDown}
          onDoubleClick={() => { setSplitPct(SPLIT_DEFAULT); saveSplit(SPLIT_DEFAULT); }}
          className="group hidden cursor-col-resize touch-none items-center justify-center outline-none lg:flex"
        >
          <span className="h-16 w-1 rounded-full bg-neutral-300 transition group-hover:bg-neutral-500 group-focus-visible:bg-neutral-700" />
        </div>

        <DayPanel
          embedded={embedded}
          platformId={platformId}
          rightTab={rightTab}
          setRightTab={setRightTab}
          scopedJobs={scopedJobs}
          selectedDay={selectedDay}
          load={load}
          loading={loading}
          dayJobs={dayJobs}
          dayOpenSlots={dayOpenSlots}
          busyId={busyId}
          draggingId={draggingId}
          canApprove={canApprove}
          quickPlaceDraftOnSelected={quickPlaceDraftOnSelected}
          beginDrag={beginDrag}
          endDrag={endDrag}
          openEdit={openEdit}
          setCloneJob={setCloneJob}
          setTempoJob={setTempoJob}
          setTempoWeeks={setTempoWeeks}
          setApproveConfirmJob={setApproveConfirmJob}
          handleRetry={handleRetry}
          handleDraft={handleDraft}
          setMessage={setMessage}
        />
      </div>

      {editingJob && (
        <EditJobModal
          key={editingJob.id}
          job={editingJob}
          onClose={() => setEditingJob(null)}
          onSaved={() => {
            setMessage('予約内容を更新しました');
            setEditingJob(null);
            load();
          }}
        />
      )}

      {monthDropPicker && (
        <MonthDropPickerModal
          date={monthDropPicker.date}
          scopedJobs={scopedJobs}
          preferredHourList={preferredHourList}
          onClose={() => setMonthDropPicker(null)}
          onPlace={(hour) => {
            const job = scopedJobs.find((j) => j.id === monthDropPicker.jobId);
            const picker = monthDropPicker;
            setMonthDropPicker(null);
            if (job) void placeJobAt(job, picker.date, hour);
          }}
        />
      )}

      {tempoJob && (
        <TempoCopyModal
          job={tempoJob}
          weeks={tempoWeeks}
          setWeeks={setTempoWeeks}
          busy={tempoBusy}
          onRun={runTempoCopy}
          onClose={() => setTempoJob(null)}
        />
      )}

      <PersonaPublishConfirmModal
        open={!!approveConfirmJob}
        action="approve"
        publishMode={approveConfirmJob?.publishMode}
        contentLabels={approveConfirmJob?.contents.map((c) => c.label) ?? []}
        onCancel={() => setApproveConfirmJob(null)}
        onConfirm={() => approveConfirmJob && void handleApprove(approveConfirmJob.id)}
      />

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
