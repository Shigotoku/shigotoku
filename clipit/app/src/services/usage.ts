import { collection, doc, getDoc, getCountFromServer, query, where, Timestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { effectivePlanId } from '../lib/internalAccess';
import { PLAN_LIMITS, planLabel, pricingPageUrl, type PlanLimits } from '../lib/plans';
import type { PlanId } from '../types';
import { getOrganization } from './bootstrap';

function monthStart(): Timestamp {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(d);
}

function monthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function countManualsCreatedThisMonth(orgId: string): Promise<number> {
  const q = query(
    collection(db, 'clipit_manuals'),
    where('organizationId', '==', orgId),
    where('createdAt', '>=', monthStart()),
  );
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

export async function getAiUsageThisMonth(orgId: string): Promise<number> {
  const snap = await getDoc(doc(db, 'clipit_usage', orgId, 'months', monthKey()));
  return (snap.data()?.aiCalls as number) ?? 0;
}

export async function assertCanCreateManual(orgId: string): Promise<PlanLimits> {
  const org = await getOrganization(orgId);
  const plan = effectivePlanId((org?.plan ?? 'free') as PlanId, auth.currentUser?.email);
  const limits = PLAN_LIMITS[plan];
  const used = await countManualsCreatedThisMonth(orgId);
  if (used >= limits.manualsPerMonth) {
    throw new Error(
      `「${planLabel(plan)}」は月${limits.manualsPerMonth}本までです。${pricingPageUrl()} でプランを確認するか、来月までお待ちください。`,
    );
  }
  return limits;
}

export async function assertCanAddSteps(orgId: string, currentCount: number, adding = 1): Promise<PlanLimits> {
  const org = await getOrganization(orgId);
  const plan = effectivePlanId((org?.plan ?? 'free') as PlanId, auth.currentUser?.email);
  const limits = PLAN_LIMITS[plan];
  if (currentCount + adding > limits.maxStepsPerManual) {
    throw new Error(
      `「${planLabel(plan)}」は1本あたり${limits.maxStepsPerManual}手順までです。不要な手順を削除するか、プランを上げてください。`,
    );
  }
  return limits;
}

export function planLimitMessage(plan: PlanId): string {
  const limits = PLAN_LIMITS[plan];
  return `${planLabel(plan)} — 月${limits.manualsPerMonth}本 / 手順${limits.maxStepsPerManual} / AI ${limits.aiCallsPerMonth}回`;
}
