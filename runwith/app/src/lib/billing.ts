import type { PlanTier } from '../store/subscription';

/** 会社1件あたりの月額（プラン基本料） */
export const PLAN_BASE_MONTHLY: Record<PlanTier, number> = {
  free: 0,
  growth: 2980,
  pro: 9800,
};

/** 基本料に含まれるユーザー数（オーナー含む） */
export const INCLUDED_SEATS = 2;

/** 3人目以降の追加ユーザー月額 */
export const EXTRA_SEAT_MONTHLY = 980;

/** 医療モード追加料金（Growth / Pro のみ） */
export const MEDICAL_ADDON_MONTHLY = 3000;

export interface SeatUsage {
  memberCount: number;
  pendingInviteCount: number;
  occupiedSeats: number;
  includedSeats: number;
  extraSeats: number;
  maxSeatsWithoutUpgrade: number;
}

export function computeSeatUsage(
  memberCount: number,
  pendingInviteCount: number,
  plan: PlanTier,
): SeatUsage {
  const occupiedSeats = memberCount + pendingInviteCount;
  const extraSeats = Math.max(0, occupiedSeats - INCLUDED_SEATS);
  const maxSeatsWithoutUpgrade = plan === 'free' ? INCLUDED_SEATS : Number.POSITIVE_INFINITY;

  return {
    memberCount,
    pendingInviteCount,
    occupiedSeats,
    includedSeats: INCLUDED_SEATS,
    extraSeats,
    maxSeatsWithoutUpgrade,
  };
}

export function canAddSeat(plan: PlanTier, occupiedSeats: number): boolean {
  if (plan !== 'free') return true;
  return occupiedSeats < INCLUDED_SEATS;
}

export function computeMonthlyTotal(
  plan: PlanTier,
  occupiedSeats: number,
  medicalAddon: boolean,
): number {
  const base = PLAN_BASE_MONTHLY[plan];
  const seats = Math.max(0, occupiedSeats - INCLUDED_SEATS) * EXTRA_SEAT_MONTHLY;
  const medical =
    medicalAddon && plan !== 'free' ? MEDICAL_ADDON_MONTHLY : 0;
  return base + seats + medical;
}

export function formatYen(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

/** この招待で3人目以降になり、追加席料金が発生するか */
export function inviteAddsExtraSeatCharge(currentOccupied: number): boolean {
  return currentOccupied >= INCLUDED_SEATS;
}
