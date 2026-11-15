import { useState, type DragEvent } from 'react';
import { CalendarDays, CalendarPlus, CheckCircle2, CopyPlus, GripVertical, Pencil, RefreshCw } from 'lucide-react';
import type { ScheduledJob } from '../../lib/api';
import type { suggestOpenSlotsForDay } from '../../lib/bulkSchedule';
import EmptyState from '../../components/EmptyState';
import PostHistoryPanel from '../../components/PostHistoryPanel';
import { isEditableStatus, statusLabel } from './calendarUtils';

type Props = {
  embedded?: boolean;
  platformId?: string;
  rightTab: 'history' | 'day';
  setRightTab: (t: 'history' | 'day') => void;
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

/** 右側パネル: 投稿履歴タブ / 選択日の予約一覧と操作（CalendarPage から分離） */
export default function DayPanel({
  embedded,
  platformId,
  rightTab,
  setRightTab,
  scopedJobs,
  selectedDay,
  load,
  loading,
  dayJobs,
  dayOpenSlots,
  busyId,
  draggingId,
  canApprove,
  quickPlaceDraftOnSelected,
  beginDrag,
  endDrag,
  openEdit,
  setCloneJob,
  setTempoJob,
  setTempoWeeks,
  setApproveConfirmJob,
  handleRetry,
  handleDraft,
  setMessage,
}: Props) {
  const [historyByDay, setHistoryByDay] = useState(false);
  return (
    <div className={`min-w-0 space-y-3 ${embedded ? 'lg:min-h-0 lg:overflow-y-auto' : ''}`}>
      {embedded && (
        <div className="flex gap-1">
          {([['history', '投稿履歴'], ['day', '選択した日']] as const).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setRightTab(k)}
              className={`border px-3 py-1 text-sm ${rightTab === k ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {embedded && rightTab === 'history' && (
        <>
          <label className="flex items-center gap-2 text-xs text-neutral-600">
            <input type="checkbox" checked={historyByDay} onChange={(e) => setHistoryByDay(e.target.checked)} />
            カレンダーで選んだ日だけ表示
            {selectedDay && historyByDay && (
              <span className="text-neutral-500">
                （{selectedDay.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })}）
              </span>
            )}
          </label>
          <PostHistoryPanel
            jobs={scopedJobs}
            platformId={platformId}
            day={historyByDay ? selectedDay : null}
            onClearDay={() => setHistoryByDay(false)}
            onClone={setCloneJob}
            onRetry={handleRetry}
            busyId={busyId}
          />
        </>
      )}
      {(!embedded || rightTab === 'day') && (
        <>
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
        <div className="border border-neutral-200 bg-neutral-50 p-3">
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
            <p className="mt-2 text-xs text-neutral-500">
              下書きがありません。
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
              {job.createdBy === 'ai' && (
                <span className="ml-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800">AI作成</span>
              )}
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
              {statusLabel(job.status, job)}
            </span>
          </div>
          <div className="flex gap-3">
            {job.mediaUrls?.filter((u) => !/\.(mp4|mov|webm)(\?|$)/i.test(u))[0] && (
              <img
                src={job.mediaUrls.filter((u) => !/\.(mp4|mov|webm)(\?|$)/i.test(u))[0]}
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
          {job.tags && job.tags.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-1">
              {job.tags.map((t) => (
                <span key={t} className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] text-violet-800">#{t}</span>
              ))}
            </p>
          )}
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
                onClick={() => setApproveConfirmJob(job)}
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
            {job.mediaUrls?.map((u, i) => (
              <a
                key={u}
                href={u}
                target="_blank"
                rel="noreferrer"
                download
                className="inline-flex min-h-[44px] items-center border border-neutral-300 px-3 py-1.5 text-xs hover:border-neutral-900"
              >
                {/\.(mp4|mov|webm)(\?|$)/i.test(u) ? '動画' : '画像'}{job.mediaUrls!.length > 1 ? i + 1 : ''}を保存
              </a>
            ))}
          </div>
        </div>
      ))}
        </>
      )}
    </div>
  );
}
