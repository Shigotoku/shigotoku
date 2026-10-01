import type { Manual, ManualStep } from '../types';

export interface HealthIssue {
  level: 'ok' | 'warn' | 'alert';
  message: string;
}

export function runManualHealthCheck(manual: Manual, steps: ManualStep[]): HealthIssue[] {
  const issues: HealthIssue[] = [];

  if (!steps.length) {
    issues.push({ level: 'alert', message: '手順が1件もありません。' });
    return issues;
  }

  for (const step of steps) {
    if (!step.screenshotUrl) {
      issues.push({ level: 'warn', message: `手順${step.order}: スクショがありません。` });
    }
    if (step.instruction.length > 280) {
      issues.push({ level: 'warn', message: `手順${step.order}: 説明が長すぎる可能性があります。` });
    }
    const actionCount = (step.instruction.match(/。/g) ?? []).length;
    if (actionCount >= 3) {
      issues.push({ level: 'warn', message: `手順${step.order}: 複数の操作が1ステップに入っているかもしれません。` });
    }
    if (/氏名|患者名|ID\d|電話番号/.test(step.instruction + step.note)) {
      issues.push({ level: 'alert', message: `手順${step.order}: 個人情報らしき記述があります。マスキングを確認してください。` });
    }
  }

  const hasWarningStep = steps.some((s) => s.type === 'warning' || s.type === 'ng_example');
  const sensitive = steps.some((s) => /黒塗り|個人情報|確認/.test(s.instruction + s.note));
  if (sensitive && !hasWarningStep) {
    issues.push({ level: 'warn', message: '注意・NGの手順タイプを追加すると、読む人に伝わりやすくなります。' });
  }

  if (manual.expiresAt) {
    const exp = manual.expiresAt.toDate?.() ?? new Date(manual.expiresAt as unknown as string);
    if (exp.getTime() < Date.now()) {
      issues.push({ level: 'warn', message: '賞味期限を過ぎています。内容に変更はありませんか？' });
    }
  }

  if (!issues.length) {
    issues.push({ level: 'ok', message: '大きな問題は見つかりませんでした。公開前にプレビューで最終確認してください。' });
  }

  return issues;
}
