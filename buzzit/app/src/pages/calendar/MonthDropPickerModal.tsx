import type { ScheduledJob } from '../../lib/api';
import { WEEK_HOUR_SLOTS, suggestOpenSlotsForDay } from '../../lib/bulkSchedule';

/** 月表示でドロップしたとき、配置する時刻を選ぶダイアログ */
export default function MonthDropPickerModal({
  date,
  scopedJobs,
  preferredHourList,
  onPlace,
  onClose,
}: {
  date: Date;
  scopedJobs: ScheduledJob[];
  preferredHourList: number[];
  onPlace: (hour: number) => void;
  onClose: () => void;
}) {
  return (
  <div
    className="buzz-modal-overlay"
    onClick={() => onClose()}
  >
    <div
      className="w-full max-w-sm border border-neutral-200 bg-white p-5 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-lg font-bold">時刻を選んで配置</h3>
      <p className="mt-1 text-sm text-neutral-600">
        {date.toLocaleDateString('ja-JP', {
          month: 'long',
          day: 'numeric',
          weekday: 'short',
        })}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {suggestOpenSlotsForDay(date, scopedJobs, preferredHourList).map((slot) => (
          <button
            key={slot.hour}
            type="button"
            className="border border-neutral-300 bg-white px-3 py-2 text-sm hover:border-neutral-900"
            onClick={() => {
              onPlace(slot.hour);
            }}
          >
            {slot.label}
            {preferredHourList.includes(slot.hour) ? ' ★' : ''}
          </button>
        ))}
        {WEEK_HOUR_SLOTS.filter(
          (h) =>
            !suggestOpenSlotsForDay(date, scopedJobs, preferredHourList).some(
              (s) => s.hour === h,
            ),
        ).map((hour) => (
          <button
            key={`busy-${hour}`}
            type="button"
            className="border border-dashed border-neutral-200 px-3 py-2 text-sm text-neutral-500 hover:border-neutral-400"
            onClick={() => {
              onPlace(hour);
            }}
          >
            {String(hour).padStart(2, '0')}:00
          </button>
        ))}
      </div>
      <button
        type="button"
        className="mt-4 w-full border border-neutral-300 py-2 text-sm"
        onClick={() => onClose()}
      >
        キャンセル
      </button>
    </div>
  </div>
  );
}
