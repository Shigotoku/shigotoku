import type { Timestamp } from 'firebase/firestore';

export function formatRelativeTime(value: Timestamp | Date | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : value.toDate();
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'たった今';
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}日前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}ヶ月前`;
  return `${Math.floor(months / 12)}年前`;
}

export const AUDIENCE_LABELS: Record<string, string> = {
  new_staff: '新人スタッフ向け',
  admin: '管理者向け',
  patient: '患者向け',
  customer: '社内向け',
  developer: 'SaaSユーザー向け',
};

export const AUDIENCE_OPTIONS = Object.entries(AUDIENCE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function labelsToAudience(values: string[]): string[] {
  return values
    .map((label) => Object.entries(AUDIENCE_LABELS).find(([, l]) => l === label)?.[0])
    .filter((v): v is string => Boolean(v));
}
