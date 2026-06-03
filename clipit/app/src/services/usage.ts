import { collection, getCountFromServer, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PLAN_LIMITS, planLabel, type PlanLimits } from '../lib/plans';
import type { PlanId } from '../types';
import { getOrganization } from './bootstrap';

function monthStart(): Timestamp {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(d);
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

export async function assertCanCreateManual(orgId: string): Promise<PlanLimits> {
  const org = await getOrganization(orgId);
  const plan = (org?.plan ?? 'free') as PlanId;
  const limits = PLAN_LIMITS[plan];
  const used = await countManualsCreatedThisMonth(orgId);
  if (used >= limits.manualsPerMonth) {
    throw new Error(
      `「${planLabel(plan)}」は月${limits.manualsPerMonth}本までです。プランを上げるか、来月までお待ちください。`,
    );
  }
  return limits;
}
