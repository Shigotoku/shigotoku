import type { DragEvent } from 'react';
import { CheckCircle2, GripVertical, MoreHorizontal, Pencil, RefreshCw } from 'lucide-react';
import type { ScheduledJob } from '../../lib/api';
import { isEditableStatus, isMovableJob, statusLabel } from './calendarUtils';

export type JobCardHandlers = {
  canApprove: boolean;
  busyId: string | null;
  draggingId: string | null;
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

type Props = JobCardHandlers & {
  job: ScheduledJob;
  /** 日付も表示する（複数日をまたぐ一覧用） */
  showDate?: boolean;
};

const isVideo = (u: string) => /\.(mp4|mov|webm)(\?|$)/i.test(u);

/** 予約・下書き 1 件のコンパクトなカード（主操作は「編集」、その他は「…」にまとめる） */
export default function JobCard({
  job,
  showDate,
  canApprove,
  busyId,
  draggingId,
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
  const editable = isEditableStatus(job.status);
  const movable = isMovableJob(job);
  const busy = busyId === job.id;
  const thumb = job.mediaUrls?.find((u) => !isVideo(u));
  const when = new Date(job.scheduledAt);
  const timeLabel = showDate
    ? when.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : when.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  const canRevert = job.status === 'failed' || job.status === 'pending_approval' || job.status === 'pending';
  const canTempo = job.status === 'pending' || job.status === 'draft' || job.status === 'pending_approval';
  const menuItem = 'block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50';

  return (
    <div
      draggable={movable}
      onDragStart={(e) => movable && beginDrag(job, e)}
      onDragEnd={endDrag}
      className={`rounded-xl border border-neutral-200 bg-white p-3 ${movable ? 'cursor-grab active:cursor-grabbing' : ''} ${
        draggingId === job.id ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="inline-flex items-center gap-1 font-medium text-neutral-900">
          {editable && <GripVertical className="h-3.5 w-3.5 text-neutral-400" aria-hidden />}
          {job.status === 'draft' ? `${timeLabel}（仮）` : timeLabel}
          {job.createdBy === 'ai' && (
            <span className="ml-1 rounded-full bg-sky-100 px-1.5 py-0.5 text-[11px] font-medium text-sky-800">AI</span>
          )}
        </span>
        <span
          className={`text-xs ${
            job.status === 'failed' ? 'text-red-700' : job.status === 'pending_approval' ? 'text-amber-700' : 'text-neutral-500'
          }`}
        >
          {statusLabel(job.status, job)}
        </span>
      </div>

      <div className="mt-2 flex gap-2">
        {thumb && <img src={thumb} alt="" className="h-12 w-12 shrink-0 rounded-md border border-neutral-200 object-cover" />}
        <p className="line-clamp-2 text-sm text-neutral-700">{job.contents[0]?.content ?? ''}</p>
      </div>

      {job.tags && job.tags.length > 0 && (
        <p className="mt-1.5 flex flex-wrap gap-1">
          {job.tags.slice(0, 4).map((t) => (
            <span key={t} className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] text-violet-800">
              #{t}
            </span>
          ))}
        </p>
      )}
      {job.errorMessage && <p className="mt-1.5 line-clamp-2 text-xs text-red-700">{job.errorMessage}</p>}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {editable && (
          <button
            type="button"
            onClick={() => openEdit(job)}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-neutral-900 px-3 text-xs font-semibold text-white"
          >
            <Pencil className="h-3.5 w-3.5" />
            編集
          </button>
        )}
        {job.status === 'pending_approval' && canApprove && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setApproveConfirmJob(job)}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-neutral-900 px-3 text-xs font-semibold disabled:opacity-60"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {busy ? '承認中...' : '承認'}
          </button>
        )}
        {job.status === 'failed' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => handleRetry(job.id)}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-3 text-xs font-semibold text-red-800 disabled:opacity-60"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            再送
          </button>
        )}

        <details className="relative ml-auto">
          <summary className="flex min-h-[36px] cursor-pointer list-none items-center rounded-lg border border-neutral-200 px-2 text-neutral-600 hover:bg-neutral-50 [&::-webkit-details-marker]:hidden">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">その他の操作</span>
          </summary>
          <div
            className="absolute right-0 z-10 mt-1 w-52 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
            onClick={(e) => (e.currentTarget.parentElement as HTMLDetailsElement | null)?.removeAttribute('open')}
          >
            {canRevert && (
              <button type="button" disabled={busy} className={menuItem} onClick={() => handleDraft(job.id)}>
                下書きに戻す
              </button>
            )}
            {job.contents[0] && (
              <button type="button" className={menuItem} onClick={() => setCloneJob(job)}>
                他SNSへずらして複製
              </button>
            )}
            {canTempo && (
              <button
                type="button"
                className={menuItem}
                onClick={() => {
                  setTempoJob(job);
                  setTempoWeeks(4);
                }}
              >
                毎週同じ枠に複製
              </button>
            )}
            <button
              type="button"
              className={menuItem}
              onClick={() => {
                const text = job.contents.map((c) => `【${c.label}】\n${c.content}`).join('\n\n---\n\n');
                void navigator.clipboard?.writeText(text);
                setMessage('手動投稿用に全文をコピーしました');
              }}
            >
              全文をコピー
            </button>
            {job.mediaUrls?.map((u, i) => (
              <a key={u} href={u} target="_blank" rel="noreferrer" download className={menuItem}>
                {isVideo(u) ? '動画' : '画像'}
                {job.mediaUrls!.length > 1 ? i + 1 : ''}を保存
              </a>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
