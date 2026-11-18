export const pad = (n: number) => String(n).padStart(2, "0");
export const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const fmt = (d: Date) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
export const fmtShort = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
export const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const yen = (n: number) => `${Math.round(n).toLocaleString()}円`;
export const lastDayOfMonth = (y: number, m1: number) => new Date(y, m1, 0);

/** 土日なら翌月曜へ（祝日は考慮しない） */
export function shiftWeekend(d: Date) {
  const w = d.getDay();
  if (w === 6) return addDays(d, 2);
  if (w === 0) return addDays(d, 1);
  return d;
}

/** 開始日〜終了日の月数（1か月未満切捨て、最大12） */
export function monthsInPeriod(start: Date, end: Date) {
  const limit = addDays(end, 1);
  let m = 0;
  while (m < 12) {
    const next = new Date(start.getFullYear(), start.getMonth() + m + 1, start.getDate());
    if (next <= limit) m++;
    else break;
  }
  return Math.max(m, 0);
}

/** 基準日の属する月の末日から2か月後の月末（申告・納付期限の原則） */
export function twoMonthsAfterEnd(base: Date) {
  return new Date(base.getFullYear(), base.getMonth() + 3, 0);
}

/** 事業年度の各月（yyyy-mm）リスト */
export function monthKeys(start: Date, end: Date) {
  const keys: string[] = [];
  let y = start.getFullYear();
  let m = start.getMonth();
  while (y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth())) {
    keys.push(`${y}-${pad(m + 1)}`);
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }
  return keys;
}
