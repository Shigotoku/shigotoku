/** `<input type="datetime-local">` 用のローカル日時文字列 (YYYY-MM-DDTHH:mm) */
export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 予約の初期候補（現在+2時間、ローカル） */
export function defaultScheduleLocalValue(hoursAhead = 2): string {
  const d = new Date();
  d.setHours(d.getHours() + hoursAhead);
  return toDatetimeLocalValue(d);
}

/** datetime-local 値が現在より未来か（分単位） */
export function isFutureLocalDatetime(value: string, now = new Date()): boolean {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() > now.getTime();
}
