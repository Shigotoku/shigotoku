import type { ScheduledJob } from '../../lib/api';

export type EditableStatus = 'pending' | 'pending_approval' | 'draft' | 'failed';

export function isEditableStatus(status: ScheduledJob['status']): status is EditableStatus {
  return status === 'pending' || status === 'pending_approval' || status === 'draft' || status === 'failed';
}

export const PLATFORM_LIMITS: Record<string, number> = { x_thread: 280, threads: 500, instagram: 2200, reels: 2200, carousel: 2200, facebook: 5000, line: 500, gbp: 1500, tiktok: 2200, youtube_shorts: 5000 };

export function CharCount({ platform, text }: { platform: string; text: string }) {
  const limit = PLATFORM_LIMITS[platform];
  const len = [...text].length;
  if (!limit) return <span className="text-neutral-400">{len}字</span>;
  const perPost = platform === 'x_thread' ? Math.max(...text.split(/\n---\n/).map((p) => [...p.trim()].length), 0) : len;
  const over = perPost > limit;
  return (
    <span className={over ? 'text-red-700' : 'text-neutral-400'}>
      {platform === 'x_thread' ? `最長 ${perPost}/${limit}字` : `${len}/${limit}字`}
    </span>
  );
}

export type FilterKey = 'all' | 'pending_approval' | 'pending' | 'failed' | 'done' | 'draft';
export type ViewMode = 'month' | 'week';

export const filterLabels: Record<FilterKey, string> = {
  all: 'すべて',
  pending_approval: '承認待ち',
  pending: '予約済み',
  failed: '失敗',
  draft: '下書き',
  done: '完了',
};

export function statusLabel(status: ScheduledJob['status'], job?: ScheduledJob) {
  switch (status) {
    case 'pending_approval':
      if (job?.dualApprovalRequired && job.firstApprovedBy) return '2人目承認待ち';
      if (job?.dualApprovalRequired) return '承認待ち（公式・2人体制）';
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

export function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
