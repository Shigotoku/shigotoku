import type { PublishMode } from './api';
import { toDatetimeLocalValue } from './datetime';

export type SchedulePattern = 'same' | 'stagger_hours' | 'stagger_days' | 'custom';

export type ScheduleContentItem = {
  platform: string;
  label: string;
  content: string;
  carouselSlides?: string[];
};

export type PlatformScheduleRow = {
  platform: string;
  label: string;
  content: string;
  carouselSlides?: string[];
  enabled: boolean;
  localAt: string;
  publishMode: PublishMode;
};

export type BulkSchedulePreview = {
  pattern: SchedulePattern;
  rows: PlatformScheduleRow[];
};

/** 生成コンテンツの platform → 推奨 publishMode */
export function preferredPublishMode(
  platform: string,
  connected: { x?: boolean; meta?: boolean; line?: boolean },
  fallback: PublishMode = 'notify',
): PublishMode {
  const p = platform.toLowerCase();
  if (p.includes('x_thread') || p === 'x') {
    return connected.x ? 'x_free' : fallback;
  }
  if (p.includes('reel') || p.includes('carousel') || p.includes('instagram')) {
    return connected.meta ? 'meta' : fallback;
  }
  if (p.includes('line')) {
    return connected.line ? 'line' : fallback;
  }
  return fallback;
}

function addHours(localValue: string, hours: number): string {
  const d = new Date(localValue);
  if (Number.isNaN(d.getTime())) return localValue;
  d.setHours(d.getHours() + hours);
  return toDatetimeLocalValue(d);
}

function addDays(localValue: string, days: number): string {
  const d = new Date(localValue);
  if (Number.isNaN(d.getTime())) return localValue;
  d.setDate(d.getDate() + days);
  return toDatetimeLocalValue(d);
}

/** パターンに応じて各媒体の予約日時を計算 */
export function buildBulkScheduleRows(input: {
  contents: ScheduleContentItem[];
  pattern: SchedulePattern;
  baseLocalAt: string;
  hourStep?: number;
  dayStep?: number;
  customTimes?: Record<string, string>;
  defaultPublishMode?: PublishMode;
  connected?: { x?: boolean; meta?: boolean; line?: boolean };
  enabledPlatforms?: Set<string>;
}): PlatformScheduleRow[] {
  const hourStep = input.hourStep ?? 2;
  const dayStep = input.dayStep ?? 1;
  const connected = input.connected ?? {};
  const fallback = input.defaultPublishMode ?? 'notify';

  return input.contents.map((c, index) => {
    let localAt = input.baseLocalAt;
    if (input.pattern === 'stagger_hours') {
      localAt = addHours(input.baseLocalAt, index * hourStep);
    } else if (input.pattern === 'stagger_days') {
      localAt = addDays(input.baseLocalAt, index * dayStep);
    } else if (input.pattern === 'custom' && input.customTimes?.[c.platform]) {
      localAt = input.customTimes[c.platform];
    }

    return {
      platform: c.platform,
      label: c.label,
      content: c.content,
      carouselSlides: c.carouselSlides,
      enabled: input.enabledPlatforms ? input.enabledPlatforms.has(c.platform) : true,
      localAt,
      publishMode: preferredPublishMode(c.platform, connected, fallback),
    };
  });
}

export const PATTERN_OPTIONS: Array<{
  id: SchedulePattern;
  title: string;
  detail: string;
}> = [
  {
    id: 'same',
    title: '同時投稿',
    detail: '選んだ媒体を同じ日時に一気に予約',
  },
  {
    id: 'stagger_hours',
    title: '時間ずらし',
    detail: '同じ日に、媒体ごとに数時間ずらして予約',
  },
  {
    id: 'stagger_days',
    title: '日ずらし',
    detail: '同じ内容を日を変えて各SNSへ予約',
  },
  {
    id: 'custom',
    title: 'カスタム',
    detail: '媒体ごとに日時を個別指定',
  },
];

/** 日付ドロップ時: 元の時刻を保ったまま日付だけ差し替え */
export function applyDateKeepTime(isoScheduledAt: string, targetDate: Date): string {
  const src = new Date(isoScheduledAt);
  if (Number.isNaN(src.getTime())) {
    const d = new Date(targetDate);
    d.setHours(12, 0, 0, 0);
    return d.toISOString();
  }
  const next = new Date(targetDate);
  next.setHours(src.getHours(), src.getMinutes(), 0, 0);
  if (next.getTime() <= Date.now()) {
    next.setTime(Date.now() + 60 * 60 * 1000);
  }
  return next.toISOString();
}

/** 日付＋時刻スロットへのドロップ */
export function applyDateAndHour(targetDate: Date, hour: number, minute = 0): string {
  const next = new Date(targetDate);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= Date.now()) {
    next.setTime(Date.now() + 60 * 60 * 1000);
  }
  return next.toISOString();
}

/** 週ビュー用の時間帯（2時間刻み） */
export const WEEK_HOUR_SLOTS = [8, 10, 12, 14, 16, 18, 20] as const;

export function nearestHourSlot(date: Date): number {
  const h = date.getHours();
  let best: number = WEEK_HOUR_SLOTS[0];
  let bestDiff = Infinity;
  for (const slot of WEEK_HOUR_SLOTS) {
    const d = Math.abs(slot - h);
    if (d < bestDiff) {
      best = slot;
      bestDiff = d;
    }
  }
  return best;
}

/** 既存投稿を他媒体へずらして複製するためのターゲット定義 */
export type CloneTarget = {
  platform: string;
  label: string;
  /** 元本文を流用（媒体向けに軽い前置きを足す場合あり） */
  adaptContent: (source: string) => string;
};

export const CLONE_TARGETS: CloneTarget[] = [
  {
    platform: 'reels',
    label: 'リール / Instagram',
    adaptContent: (s) => `【リール】\n${s}\n\n#投稿`,
  },
  {
    platform: 'carousel',
    label: 'カルーセル',
    adaptContent: (s) => s,
  },
  {
    platform: 'x_thread',
    label: 'X',
    adaptContent: (s) => (s.length > 240 ? `${s.slice(0, 220)}…` : s),
  },
  {
    platform: 'line',
    label: 'LINE公式',
    adaptContent: (s) => `お知らせです。\n\n${s}\n\nご予約・詳細はメニューからどうぞ。`,
  },
];

export function buildCloneStaggerPlan(input: {
  sourceContent: string;
  sourcePlatform: string;
  baseLocalAt: string;
  pattern: 'stagger_hours' | 'stagger_days' | 'same';
  hourStep?: number;
  dayStep?: number;
  targetPlatforms: string[];
  defaultPublishMode?: PublishMode;
  connected?: { x?: boolean; meta?: boolean; line?: boolean };
}): PlatformScheduleRow[] {
  const targets = CLONE_TARGETS.filter(
    (t) => input.targetPlatforms.includes(t.platform) && t.platform !== input.sourcePlatform,
  );
  const contents = targets.map((t) => ({
    platform: t.platform,
    label: t.label,
    content: t.adaptContent(input.sourceContent),
  }));
  return buildBulkScheduleRows({
    contents,
    pattern: input.pattern,
    baseLocalAt: input.baseLocalAt,
    hourStep: input.hourStep ?? 3,
    dayStep: input.dayStep ?? 1,
    defaultPublishMode: input.defaultPublishMode,
    connected: input.connected,
  });
}

export type GapDay = {
  date: Date;
  label: string;
};

/** これから N 日の平日で予約が空いている日 */
export function findEmptyWeekdays(
  jobs: Array<{ scheduledAt: string; status: string }>,
  daysAhead = 14,
): GapDay[] {
  const occupied = new Set<string>();
  for (const j of jobs) {
    if (j.status === 'draft') continue;
    const d = new Date(j.scheduledAt);
    if (!Number.isNaN(d.getTime())) occupied.add(d.toDateString());
  }
  const gaps: GapDay[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    if (occupied.has(d.toDateString())) continue;
    gaps.push({
      date: d,
      label: d.toLocaleDateString('ja-JP', { weekday: 'short', month: 'numeric', day: 'numeric' }),
    });
  }
  return gaps;
}

/** 過去・予定の投稿時刻からおすすめ時間帯を提案（多い順＋デフォルト補強） */
export function suggestBestHours(
  jobs: Array<{ scheduledAt: string }>,
  limit = 3,
): Array<{ hour: number; score: number; reason: string }> {
  const counts = new Map<number, number>();
  for (const slot of WEEK_HOUR_SLOTS) counts.set(slot, 0);
  for (const j of jobs) {
    const d = new Date(j.scheduledAt);
    if (Number.isNaN(d.getTime())) continue;
    const slot = nearestHourSlot(d);
    counts.set(slot, (counts.get(slot) ?? 0) + 1);
  }
  // 日本のSNSで効きやすい時間帯をベース加点
  const priors: Record<number, number> = { 8: 1, 10: 1, 12: 3, 14: 1, 16: 2, 18: 4, 20: 3 };
  const ranked = WEEK_HOUR_SLOTS.map((hour) => {
    const hist = counts.get(hour) ?? 0;
    const prior = priors[hour] ?? 0;
    const score = hist * 3 + prior;
    const reason =
      hist > 0 ? `あなたの投稿が${hist}件（近い時間帯）` : hour === 12 || hour === 18 || hour === 20
        ? '一般的に反応が取りやすい帯'
        : '空きやすい帯';
    return { hour, score, reason };
  }).sort((a, b) => b.score - a.score);
  return ranked.slice(0, limit);
}

/** 指定日で空いているおすすめスロット（その日の既存予約を避ける） */
export function suggestOpenSlotsForDay(
  day: Date,
  jobs: Array<{ scheduledAt: string; status: string }>,
  preferredHours?: number[],
): Array<{ hour: number; label: string }> {
  const occupied = new Set(
    jobs
      .filter((j) => j.status !== 'draft')
      .map((j) => new Date(j.scheduledAt))
      .filter((d) => !Number.isNaN(d.getTime()) && sameCalendarDay(d, day))
      .map((d) => nearestHourSlot(d)),
  );
  const order = preferredHours?.length
    ? [...preferredHours, ...WEEK_HOUR_SLOTS.filter((h) => !preferredHours.includes(h))]
    : [...WEEK_HOUR_SLOTS];
  const out: Array<{ hour: number; label: string }> = [];
  for (const hour of order) {
    if (occupied.has(hour)) continue;
    const candidate = new Date(day);
    candidate.setHours(hour, 0, 0, 0);
    if (candidate.getTime() <= Date.now()) continue;
    out.push({ hour, label: `${String(hour).padStart(2, '0')}:00` });
    if (out.length >= 4) break;
  }
  return out;
}

function sameCalendarDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** 同一スロットに他予約があるか */
export function findSlotConflicts(
  jobs: Array<{ id: string; scheduledAt: string; status: string; contents: Array<{ label: string }> }>,
  targetIso: string,
  excludeJobId?: string,
): Array<{ id: string; label: string }> {
  const target = new Date(targetIso);
  if (Number.isNaN(target.getTime())) return [];
  const slot = nearestHourSlot(target);
  return jobs
    .filter((j) => j.id !== excludeJobId && j.status !== 'draft' && j.status !== 'failed')
    .filter((j) => {
      const d = new Date(j.scheduledAt);
      return sameCalendarDay(d, target) && nearestHourSlot(d) === slot;
    })
    .map((j) => ({
      id: j.id,
      label: j.contents.map((c) => c.label).join('/') || '予約',
    }));
}

/** 衝突時に空いている次のスロットへずらす */
export function nudgeToOpenSlot(
  day: Date,
  preferredHour: number,
  jobs: Array<{ id: string; scheduledAt: string; status: string }>,
  excludeJobId?: string,
): { iso: string; hour: number } {
  const filtered = jobs.filter((j) => j.id !== excludeJobId);
  const open = suggestOpenSlotsForDay(day, filtered, [preferredHour, ...WEEK_HOUR_SLOTS]);
  const hour = open[0]?.hour ?? preferredHour;
  return { iso: applyDateAndHour(day, hour), hour };
}

/** ISO 日時を日数オフセット */
export function shiftIsoByDays(iso: string, days: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  d.setDate(d.getDate() + days);
  if (d.getTime() <= Date.now()) {
    d.setTime(Date.now() + 60 * 60 * 1000);
  }
  return d.toISOString();
}

/** テンポ複製: 同じ曜日・時刻で次の weeks 週分の日時 */
export function buildTempoDates(isoScheduledAt: string, weeks: number): string[] {
  const base = new Date(isoScheduledAt);
  if (Number.isNaN(base.getTime()) || weeks < 1) return [];
  const out: string[] = [];
  for (let w = 1; w <= weeks; w++) {
    const d = new Date(base);
    d.setDate(base.getDate() + w * 7);
    if (d.getTime() > Date.now()) out.push(d.toISOString());
  }
  return out;
}

/** おすすめ基準日時（今日/明日のおすすめ時間帯） */
export function suggestedBaseLocalAt(
  jobs: Array<{ scheduledAt: string }>,
): string {
  const best = suggestBestHours(jobs, 1)[0]?.hour ?? 18;
  const now = new Date();
  const today = new Date(now);
  today.setHours(best, 0, 0, 0);
  if (today.getTime() > now.getTime() + 30 * 60 * 1000) {
    return toDatetimeLocalValue(today);
  }
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(best, 0, 0, 0);
  return toDatetimeLocalValue(tomorrow);
}
