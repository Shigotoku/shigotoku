import type { SchedulePattern } from './bulkSchedule';

const DROP_HOUR_KEY = 'buzzit.schedule.dropHour.v1';
const PATTERN_KEY = 'buzzit.schedule.bulkPattern.v1';
const SPLIT_KEY = 'buzzit.schedule.bulkSplit.v1';

export function loadDropHourPref(): number | null {
  try {
    const raw = localStorage.getItem(DROP_HOUR_KEY);
    if (raw === null) return 12;
    if (raw === 'null') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 12;
  } catch {
    return 12;
  }
}

export function saveDropHourPref(hour: number | null) {
  try {
    localStorage.setItem(DROP_HOUR_KEY, hour === null ? 'null' : String(hour));
  } catch {
    /* ignore */
  }
}

export function loadBulkPatternPref(): SchedulePattern {
  try {
    const raw = localStorage.getItem(PATTERN_KEY);
    if (raw === 'same' || raw === 'stagger_hours' || raw === 'stagger_days' || raw === 'custom') {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return 'same';
}

export function saveBulkPatternPref(pattern: SchedulePattern) {
  try {
    localStorage.setItem(PATTERN_KEY, pattern);
  } catch {
    /* ignore */
  }
}

export function loadBulkSplitPref(defaultValue = true): boolean {
  try {
    const raw = localStorage.getItem(SPLIT_KEY);
    if (raw === '0') return false;
    if (raw === '1') return true;
  } catch {
    /* ignore */
  }
  return defaultValue;
}

export function saveBulkSplitPref(split: boolean) {
  try {
    localStorage.setItem(SPLIT_KEY, split ? '1' : '0');
  } catch {
    /* ignore */
  }
}

const VIEW_KEY = 'buzzit.schedule.viewMode.v1';

export function loadCalendarViewPref(): 'week' | 'month' {
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    if (raw === 'week' || raw === 'month') return raw;
  } catch {
    /* ignore */
  }
  return 'week';
}

export function saveCalendarViewPref(mode: 'week' | 'month') {
  try {
    localStorage.setItem(VIEW_KEY, mode);
  } catch {
    /* ignore */
  }
}
