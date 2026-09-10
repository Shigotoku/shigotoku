import type { PlanTier } from './firestore';
import type { AccountRecord } from '../types/account';

function isAccountBillingExempt(account: AccountRecord): boolean {
  if (account.billingExempt) return true;
  if (account.billingStatus === 'monitor') return true;
  if (account.billingExemptExpiresAt) {
    return new Date(account.billingExemptExpiresAt) > new Date();
  }
  return false;
}

/** 個人が作成できるアカウント数の上限 */
export const INDIVIDUAL_MAX_ACCOUNTS = 1;

/** 法人アカウントの追加ユーザー席（2人目以降）月額 */
export const EXTRA_ACCOUNT_SEAT_MONTHLY = 1980;

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

/** 2店舗目以降の割引率 */
export const ADDITIONAL_STORE_DISCOUNT = 0.2;

/** SNSごとに2アカウント目以降の追加枠（月額・1枠） */
export const EXTRA_SNS_ACCOUNT_MONTHLY = 980;

/** プランごとの最大店舗数 */
export const MAX_STORES_BY_PLAN: Record<PlanTier, number> = {
  free: 1,
  line_lite: 1,
  line_pro: 1,
  starter: 1,
  pro: 2,
  growth: 5,
  team: 2,
  enterprise: 100,
};

/** プランごとの最大メンバー数（オーナー含む。Infinity = 無制限） */
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

export function computeMonthlyTotal(
  plan: PlanTier,
  storeCount: number,
  extraSnsAccounts = 0,
): number {
  const base = PLAN_BASE_MONTHLY[plan];
  if (storeCount <= 0) return 0;
  const additional = Math.max(0, storeCount - 1);
  const storeCost =
    base === 0 ? 0 : Math.round(base + additional * base * (1 - ADDITIONAL_STORE_DISCOUNT));
  const snsExtra = Math.max(0, extraSnsAccounts) * EXTRA_SNS_ACCOUNT_MONTHLY;
  return storeCost + snsExtra;
}

export function extraSnsAccountsCost(extraSnsAccounts: number): number {
  return Math.max(0, extraSnsAccounts) * EXTRA_SNS_ACCOUNT_MONTHLY;
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
  const max = MAX_STORES_BY_PLAN[plan];
  return `${max}店舗まで`;
}

/** アカウント単位の月額見積（基本料 + 追加席） */
export function computeAccountMonthlyTotal(account: AccountRecord, storeCount = 1): number {
  if (isAccountBillingExempt(account)) return 0;
  if (account.billingStatus !== 'active' && account.billingStatus !== 'past_due') return 0;

  const base = computeMonthlyTotal(account.plan, storeCount, 0);
  if (account.accountType === 'business') {
    const extraSeats = Math.max(0, account.seatCount - account.includedSeats);
    return base + extraSeats * EXTRA_ACCOUNT_SEAT_MONTHLY;
  }
  return base;
}

export const BILLING_STATUS_LABELS: Record<string, string> = {
  monitor: 'モニター',
  trial: 'トライアル',
  active: '課金中',
  past_due: '支払い遅延',
  cancelled: '解約済み',
};

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  individual: '個人',
  business: '法人',
};
