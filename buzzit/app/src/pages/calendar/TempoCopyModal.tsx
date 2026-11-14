import type { ScheduledJob } from '../../lib/api';
import { buildTempoDates } from '../../lib/bulkSchedule';

/** 毎週同じ枠に複製するダイアログ */
export default function TempoCopyModal({
  job,
  weeks,
  setWeeks,
  busy,
  onRun,
  onClose,
}: {
  job: ScheduledJob;
  weeks: number;
  setWeeks: (w: number) => void;
  busy: boolean;
  onRun: () => Promise<void> | void;
  onClose: () => void;
}) {
  return (
  <div
    className="buzz-modal-overlay"
    onClick={() => !busy && onClose()}
  >
    <div
      className="w-full max-w-sm border border-neutral-200 bg-white p-5 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-lg font-bold">テンポ複製（毎週同じ枠）</h3>
      <p className="mt-1 text-sm text-neutral-600">
        {new Date(job.scheduledAt).toLocaleString('ja-JP', {
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
            onClick={() => setWeeks(w)}
            className={`border px-3 py-2 text-sm ${
              weeks === w ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200'
            }`}
          >
            {w}週
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-neutral-500">
        作成予定: {buildTempoDates(job.scheduledAt, weeks).length} 件
        {job.mediaUrls?.length ? ` · 素材 ${job.mediaUrls.length}件も引き継ぎ` : ''}
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onRun()}
          className="buzz-btn-primary disabled:opacity-70"
        >
          {busy ? '複製中...' : `${weeks}週分を予約する`}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onClose()}
          className="border border-neutral-300 py-2 text-sm"
        >
          キャンセル
        </button>
      </div>
    </div>
  </div>
  );
}
