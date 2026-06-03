import type { PlanId } from '../types';

export interface PlanLimits {
  manualsPerMonth: number;
  maxStepsPerManual: number;
  /** 月あたり AI 文案生成の上限（API側でも強制推奨） */
  aiCallsPerMonth: number;
  maxStaff: number;
  watermark: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: { manualsPerMonth: 3, maxStepsPerManual: 15, aiCallsPerMonth: 30, maxStaff: 2, watermark: true },
  light: { manualsPerMonth: 10, maxStepsPerManual: 30, aiCallsPerMonth: 150, maxStaff: 5, watermark: false },
  standard: { manualsPerMonth: 50, maxStepsPerManual: 50, aiCallsPerMonth: 800, maxStaff: 20, watermark: false },
  business: { manualsPerMonth: 200, maxStepsPerManual: 80, aiCallsPerMonth: 3000, maxStaff: 100, watermark: false },
  developer: { manualsPerMonth: 200, maxStepsPerManual: 100, aiCallsPerMonth: 5000, maxStaff: 50, watermark: false },
  agency: { manualsPerMonth: 500, maxStepsPerManual: 100, aiCallsPerMonth: 10000, maxStaff: 500, watermark: false },
};

export const PLAN_PRICE_JPY: Record<PlanId, number> = {
  free: 0,
  light: 980,
  standard: 2980,
  business: 5980,
  developer: 9800,
  agency: 19800,
};

export function planLabel(plan: PlanId): string {
  const labels: Record<PlanId, string> = {
    free: 'フリー',
    light: 'ライト',
    standard: 'スタンダード',
    business: 'ビジネス',
    developer: '開発者',
    agency: '代理店',
  };
  return labels[plan];
}
