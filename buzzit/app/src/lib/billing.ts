import type { PlanTier } from '../types';

/** 1店舗目の月額基本料 */
export const PLAN_BASE_MONTHLY: Record<PlanTier, number> = {
  free: 0,
  line_lite: 980,
  line_pro: 4980,
  starter: 4980,
  pro: 9800,
  team: 9800,
  growth: 24800,
  enterprise: 0,
};

export const PLAN_LABELS: Record<PlanTier, string> = {
  free: 'Free',
  line_lite: 'LINE CRM Lite',
  line_pro: 'LINE CRM Pro',
  starter: 'Starter',
  pro: 'Pro',
  team: 'Team',
  growth: 'Growth OS',
  enterprise: 'Enterprise',
};

/** 2店舗目以降の割引率 */
export const ADDITIONAL_STORE_DISCOUNT = 0.2;

export const MAX_STORES_BY_PLAN: Record<PlanTier, number> = {
  free: 1,
  line_lite: 1,
  line_pro: 1,
  starter: 1,
  pro: 2,
  team: 2,
  growth: 5,
  enterprise: 100,
};

export const MAX_STAFF_BY_PLAN: Record<PlanTier, number> = {
  free: 1,
  line_lite: 1,
  line_pro: 3,
  starter: 3,
  pro: 10,
  team: 10,
  growth: Number.POSITIVE_INFINITY,
  enterprise: Number.POSITIVE_INFINITY,
};

export function computeMonthlyTotal(plan: PlanTier, storeCount: number): number {
  const base = PLAN_BASE_MONTHLY[plan];
  if (storeCount <= 0 || base === 0) return 0;
  const additional = Math.max(0, storeCount - 1);
  const additionalCost = additional * base * (1 - ADDITIONAL_STORE_DISCOUNT);
  return Math.round(base + additionalCost);
}

export function canAddStore(plan: PlanTier, currentStoreCount: number): boolean {
  return currentStoreCount < MAX_STORES_BY_PLAN[plan];
}

export function canAddStaff(plan: PlanTier, currentMemberCount: number, pendingInvites = 0): boolean {
  const max = MAX_STAFF_BY_PLAN[plan];
  if (!Number.isFinite(max)) return true;
  return currentMemberCount + pendingInvites + 1 <= max;
}

export function staffLimitLabel(plan: PlanTier): string {
  const max = MAX_STAFF_BY_PLAN[plan];
  if (!Number.isFinite(max)) return '無制限';
  return `${max}人まで`;
}

export function storeLimitLabel(plan: PlanTier): string {
  return `${MAX_STORES_BY_PLAN[plan]}店舗まで`;
}

export function formatYen(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

export function additionalStorePrice(plan: PlanTier): number {
  const base = PLAN_BASE_MONTHLY[plan];
  return Math.round(base * (1 - ADDITIONAL_STORE_DISCOUNT));
}
