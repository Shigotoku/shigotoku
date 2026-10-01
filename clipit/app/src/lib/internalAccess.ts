import type { PlanId } from '../types';

/** 全プラン相当で利用可（運用アカウント） */
export const FULL_ACCESS_EMAIL = 'meditoku.jp@gmail.com';

export function hasFullAccess(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === FULL_ACCESS_EMAIL;
}

export const FULL_ACCESS_PLAN: PlanId = 'agency';

export function effectivePlanId(plan: PlanId, email?: string | null): PlanId {
  return hasFullAccess(email) ? FULL_ACCESS_PLAN : plan;
}
