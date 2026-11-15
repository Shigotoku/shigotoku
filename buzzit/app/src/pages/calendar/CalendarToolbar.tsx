import { AlertTriangle, Undo2 } from 'lucide-react';
import { saveCalendarViewPref } from '../../lib/schedulePrefs';
import { filterLabels, type FilterKey, type ViewMode } from './calendarUtils';

type Props = {
  embedded?: boolean;
  alertCount: number;
  setAlertsOpen: (fn: (v: boolean) => boolean) => void;
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  undoCount: number;
  undoLastMove: () => Promise<void> | void;
  filter: FilterKey;
  setFilter: (k: FilterKey) => void;
  search: string;
  setSearch: (v: string) => void;
};

/** 注意ボタン・週/月切替・元に戻す・絞り込み・検索（CalendarPage から分離） */
export default function CalendarToolbar({
  embedded,
  alertCount,
  setAlertsOpen,
  viewMode,
  setViewMode,
  undoCount,
  undoLastMove,
  filter,
  setFilter,
  search,
  setSearch,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {embedded && (
        <button
          type="button"
          onClick={() => setAlertsOpen((v) => !v)}
          className={`inline-flex min-h-[36px] items-center gap-1.5 border px-3 text-sm font-medium ${
            alertCount > 0 ? 'border-amber-600 bg-amber-50 text-amber-900' : 'border-neutral-200 bg-white text-neutral-500'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          注意{alertCount > 0 ? ` (${alertCount})` : ''}
        </button>
      )}
      {(['week', 'month'] as ViewMode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => {
            setViewMode(m);
            saveCalendarViewPref(m);
          }}
          className={`border px-3 text-sm ${embedded ? 'min-h-[36px]' : 'min-h-[44px]'} ${
            viewMode === m ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white'
          }`}
        >
          {m === 'week' ? '週次' : '月次'}
        </button>
      ))}
      {embedded && undoCount > 0 && (
        <button
          type="button"
          onClick={() => void undoLastMove()}
          className="inline-flex min-h-[36px] items-center gap-1 border border-neutral-300 bg-white px-3 text-sm"
        >
          <Undo2 className="h-4 w-4" />
          元に戻す
        </button>
      )}
      {(Object.keys(filterLabels) as FilterKey[]).map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => setFilter(key)}
          className={`border px-3 py-1.5 text-sm ${
            filter === key
              ? 'border-neutral-900 bg-neutral-900 text-white'
              : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
          }`}
        >
          {filterLabels[key]}
        </button>
      ))}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="本文・#タグで検索"
        className="ml-auto w-full border border-neutral-200 sm:w-44 bg-white px-3 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
      />
    </div>
  );
}
