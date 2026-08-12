import type { Manual, ManualStep } from '../types';

export interface StaleAlert {
  manualId: string;
  manualTitle: string;
  stepOrder?: number;
  level: 'warn' | 'alert';
  message: string;
  keyword?: string;
}

const STALE_PATTERNS: Array<{ re: RegExp; message: string; level: 'warn' | 'alert' }> = [
  { re: /20(1[0-9]|2[0-3])年/, message: '古い年度表記が残っている可能性があります', level: 'warn' },
  { re: /今年度|昨年度/, message: '相対的な年度表記 — 更新日と合わせて確認してください', level: 'warn' },
  { re: /旧システム|旧予約|旧社名|旧URL/i, message: '「旧〜」の表記が残っています', level: 'alert' },
  { re: /freee|マネーフォワード|WebORCA|CLIUS/i, message: 'システム名 — 契約変更時はまとめて修正を検討', level: 'warn' },
  { re: /http:\/\/|www\.[^\s]+(?<!\.jp)/i, message: 'URL表記 — リンク切れの可能性', level: 'warn' },
  { re: /氏名|患者名|ID\d{4,}|090-\d{4}/, message: '個人情報らしき記述 — マスキングを確認', level: 'alert' },
  { re: /退職|前任|〇〇さん（担当）/, message: '担当者名が古い可能性があります', level: 'warn' },
];

export function detectStaleInText(
  manual: Manual,
  text: string,
  stepOrder?: number,
): StaleAlert[] {
  const alerts: StaleAlert[] = [];
  for (const p of STALE_PATTERNS) {
    if (p.re.test(text)) {
      alerts.push({
        manualId: manual.id,
        manualTitle: manual.title,
        stepOrder,
        level: p.level,
        message: p.message,
        keyword: text.match(p.re)?.[0],
      });
    }
  }
  if (manual.expiresAt) {
    const exp = manual.expiresAt.toMillis?.() ?? 0;
    if (exp > 0 && exp < Date.now()) {
      alerts.push({
        manualId: manual.id,
        manualTitle: manual.title,
        level: 'alert',
        message: '賞味期限（180日）を過ぎています',
      });
    }
  }
  const updated = manual.updatedAt?.toMillis?.() ?? 0;
  if (updated > 0 && Date.now() - updated > 180 * 86_400_000) {
    alerts.push({
      manualId: manual.id,
      manualTitle: manual.title,
      level: 'warn',
      message: '180日以上更新されていません',
    });
  }
  return alerts;
}

export function scanManualStaleInfo(manual: Manual, steps: ManualStep[]): StaleAlert[] {
  const seen = new Set<string>();
  const out: StaleAlert[] = [];
  const push = (a: StaleAlert) => {
    const key = `${a.manualId}-${a.stepOrder}-${a.message}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(a);
    }
  };
  for (const a of detectStaleInText(manual, manual.title)) push(a);
  for (const a of detectStaleInText(manual, manual.description)) push(a);
  for (const step of steps) {
    const blob = `${step.title} ${step.instruction} ${step.note}`;
    for (const a of detectStaleInText(manual, blob, step.order)) push(a);
  }
  return out;
}

export async function scanOrgStaleInfo(
  manuals: Manual[],
  listSteps: (id: string) => Promise<ManualStep[]>,
): Promise<StaleAlert[]> {
  const all: StaleAlert[] = [];
  for (const m of manuals.slice(0, 30)) {
    const steps = await listSteps(m.id);
    all.push(...scanManualStaleInfo(m, steps));
  }
  return all;
}
