import type { DragEvent, HTMLAttributes } from 'react';
import type { ScheduledJob } from '../../lib/api';
import { WEEK_HOUR_SLOTS, applyDateAndHour, findSlotConflicts, nearestHourSlot } from '../../lib/bulkSchedule';
import { isMovableJob, sameDay, type ViewMode } from './calendarUtils';

export type CalendarCell = { date: Date | null; jobs: ScheduledJob[] };

type Props = {
  viewMode: ViewMode;
  embedded?: boolean;
  weekStart: Date;
  calendarCells: CalendarCell[];
  jobsByDay: Map<string, ScheduledJob[]>;
  scopedJobs: ScheduledJob[];
  selectedDay: Date | null;
  pickDay: (d: Date) => void;
  preferredHourList: number[];
  draggingId: string | null;
  dropDateKey: string | null;
  slotKey: (date: Date, hour?: number) => string;
  dateDropProps: (date: Date, hour?: number, fromMonth?: boolean) => HTMLAttributes<HTMLElement>;
  beginDrag: (job: ScheduledJob, e: DragEvent) => void;
  endDrag: () => void;
};

/** 月/週のカレンダーグリッド（CalendarPage から分離。状態は親が持つ） */
export default function CalendarGrid({
  viewMode,
  embedded,
  weekStart,
  calendarCells,
  jobsByDay,
  scopedJobs,
  selectedDay,
  pickDay,
  preferredHourList,
  draggingId,
  dropDateKey,
  slotKey,
  dateDropProps,
  beginDrag,
  endDrag,
}: Props) {
  return (
    viewMode === 'week' ? (
        <div className={embedded ? 'min-h-0 flex-1 overflow-auto' : 'overflow-x-auto'}>
          <div className={embedded ? 'flex h-full min-w-[560px] flex-col' : 'min-w-[640px]'}>
            <div
              className="mb-1 grid gap-1 text-center text-xs text-neutral-600"
              style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}
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
                    onClick={() => pickDay(date)}
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
                className={`mb-1 grid gap-1 ${embedded ? 'min-h-[40px] flex-1' : ''}`}
                style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}
              >
                <div
                  className={`flex items-start justify-end pr-1 pt-1 text-xs ${
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
                      onClick={() => pickDay(date)}
                      className={`cursor-pointer overflow-hidden border p-1 transition-colors ${embedded ? 'min-h-[36px]' : 'min-h-[52px]'} ${
                        isDrop
                          ? 'border-neutral-900 bg-amber-50'
                          : preferredHourList.includes(hour) && cellJobs.length === 0
                            ? 'border-amber-100 bg-amber-50/40 hover:border-amber-300'
                            : 'border-neutral-100 bg-white hover:border-neutral-300'
                      }`}
                    >
                      {isDrop && (
                        <p className="text-xs font-medium text-neutral-700">
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
                            draggable={isMovableJob(j)}
                            onDragStart={(e) => {
                              e.stopPropagation();
                              beginDrag(j, e);
                            }}
                            onDragEnd={endDrag}
                            className={`truncate border px-1 py-0.5 text-xs ${
                              j.status === 'failed'
                                ? 'border-red-200 bg-red-50 text-red-800'
                                : j.status === 'draft'
                                  ? 'border-dashed border-neutral-300 bg-neutral-50'
                                  : 'border-neutral-200 bg-neutral-50'
                            } ${draggingId === j.id ? 'opacity-40' : ''}`}
                          >
                            {j.contents[0]?.label ?? '予約'}
                          </div>
                        ))}
                        {cellJobs.length > 2 && (
                          <p className="text-xs text-neutral-400">+{cellJobs.length - 2}</p>
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
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-neutral-600">
            {['日', '月', '火', '水', '木', '金', '土'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className={`grid grid-cols-7 gap-1 ${embedded ? 'min-h-0 flex-1 auto-rows-fr' : ''}`}>
            {calendarCells.map((cell, i) => {
              if (!cell.date) return <div key={`pad-${i}`} className="min-h-[64px]" />;
              const selected = selectedDay && sameDay(cell.date, selectedDay);
              const isToday = sameDay(cell.date, new Date());
              const isDrop = dropDateKey === cell.date.toDateString();
              return (
                <div
                  key={cell.date.toISOString()}
                  role="button"
                  tabIndex={0}
                  onClick={() => cell.date && pickDay(cell.date)}
                  onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && cell.date) { e.preventDefault(); pickDay(cell.date); } }}
                  {...dateDropProps(cell.date, undefined, true)}
                  className={`min-h-[64px] cursor-pointer overflow-hidden border p-1 text-left transition-colors ${
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
                  <div className="mt-0.5 space-y-0.5">
                    {cell.jobs.slice(0, 2).map((j) => {
                      const movable = isMovableJob(j);
                      return (
                        <div
                          key={j.id}
                          draggable={movable}
                          onDragStart={(e) => {
                            if (!movable) return;
                            e.stopPropagation();
                            beginDrag(j, e);
                          }}
                          onDragEnd={endDrag}
                          title={`${j.contents[0]?.label ?? '予約'}${movable ? '（ドラッグで別の日へ移動）' : ''}`}
                          className={`flex items-center gap-1 truncate rounded border px-1 py-px text-[10px] leading-tight ${
                            movable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default opacity-70'
                          } ${
                            j.status === 'failed'
                              ? 'border-red-200 bg-red-50 text-red-800'
                              : j.status === 'pending_approval'
                                ? 'border-amber-200 bg-amber-50 text-amber-900'
                                : j.status === 'published' || j.status === 'notified'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                                  : j.status === 'draft'
                                    ? 'border-dashed border-neutral-300 bg-neutral-50'
                                    : 'border-neutral-200 bg-neutral-50'
                          } ${draggingId === j.id ? 'opacity-40' : ''}`}
                        >
                          <span className="shrink-0 text-neutral-400">{new Date(j.scheduledAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="truncate">{j.contents[0]?.label ?? '予約'}</span>
                        </div>
                      );
                    })}
                    {cell.jobs.length > 2 && (
                      <span className="block text-[10px] leading-none text-neutral-500">+{cell.jobs.length - 2}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )
  );
}
