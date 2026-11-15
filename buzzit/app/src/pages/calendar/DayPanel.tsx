import type { DragEvent } from 'react';
import { CalendarDays, RefreshCw } from 'lucide-react';
import type { ScheduledJob } from '../../lib/api';
import type { suggestOpenSlotsForDay } from '../../lib/bulkSchedule';
import EmptyState from '../../components/EmptyState';
import JobCard from './JobCard';

type Props = {
  scopedJobs: ScheduledJob[];
  selectedDay: Date | null;
  load: () => void;
  loading: boolean;
  dayJobs: ScheduledJob[];
  dayOpenSlots: ReturnType<typeof suggestOpenSlotsForDay>;
  busyId: string | null;
  draggingId: string | null;
  canApprove: boolean;
  quickPlaceDraftOnSelected: (hour: number) => Promise<void> | void;
  beginDrag: (job: ScheduledJob, e: DragEvent) => void;
  endDrag: () => void;
  openEdit: (job: ScheduledJob) => void;
  setCloneJob: (job: ScheduledJob) => void;
  setTempoJob: (job: ScheduledJob) => void;
  setTempoWeeks: (n: number) => void;
  setApproveConfirmJob: (job: ScheduledJob) => void;
  handleRetry: (id: string) => void;
  handleDraft: (id: string) => void;
  setMessage: (m: string) => void;
};

/** 全体カレンダー（/calendar）の右側: 選択日の予約一覧と操作。SNS別ハブは SnsSidePanel を使う */
export default function DayPanel({
  scopedJobs,
  selectedDay,
  load,
  loading,
  dayJobs,
  dayOpenSlots,
  quickPlaceDraftOnSelected,
  ...card
}: Props) {
  const hasDraft = scopedJobs.some((j) => j.status === 'draft');
  return (
    <div className="min-w-0 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          {selectedDay ? selectedDay.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' }) : '日付を選択'}
        </h3>
        <button type="button" onClick={load} className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900">
          <RefreshCw className="h-3.5 w-3.5" />
          更新
        </button>
      </div>

      {selectedDay && dayOpenSlots.length > 0 && (
        <div className="border border-neutral-200 bg-neutral-50 p-3">
          <p className="mb-2 text-xs font-medium text-neutral-600">この日の空きおすすめ枠（ワンタップ配置）</p>
          <div className="flex flex-wrap gap-2">
            {dayOpenSlots.map((slot) => (
              <button
                key={slot.hour}
                type="button"
                disabled={card.busyId != null || !hasDraft}
                onClick={() => void quickPlaceDraftOnSelected(slot.hour)}
                className="border border-neutral-300 bg-white px-2.5 py-1.5 text-xs hover:border-neutral-900 disabled:opacity-50"
              >
                {slot.label} に下書き1件
              </button>
            ))}
          </div>
          {!hasDraft && <p className="mt-2 text-xs text-neutral-500">下書きがありません。</p>}
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
        <JobCard key={job.id} job={job} {...card} />
      ))}
    </div>
  );
}
