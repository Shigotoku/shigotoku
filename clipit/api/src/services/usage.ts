import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { effectivePlanKey } from '../lib/internalAccess.js';

const PLAN_AI_LIMIT: Record<string, number> = {
  free: 30,
  light: 150,
  standard: 800,
  business: 3000,
  developer: 5000,
  agency: 10000,
};

function monthKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function assertAiQuota(orgId: string, steps = 1, userEmail?: string | null) {
  const db = getFirestore();
  const org = await db.collection('clipit_organizations').doc(orgId).get();
  const plan = effectivePlanKey((org.data()?.plan as string) ?? 'free', userEmail);
  const limit = PLAN_AI_LIMIT[plan] ?? 30;
  const ref = db.collection('clipit_usage').doc(orgId).collection('months').doc(monthKey());
  const snap = await ref.get();
  const used = (snap.data()?.aiCalls as number) ?? 0;
  if (used + steps > limit) {
    throw Object.assign(new Error(`今月のAI利用上限（${limit}回）に達しました`), { status: 429 });
  }
  await ref.set({ aiCalls: FieldValue.increment(steps) }, { merge: true });
}

/** 一括更新AIの月間上限（操作回数ベース） */
const PLAN_BULK_AI_OPS: Record<string, number> = {
  free: 0,
  light: 0,
  standard: 30,
  business: 100,
  developer: 200,
  agency: 500,
};

export async function assertBulkAiQuota(orgId: string, userEmail?: string | null, increment = true) {
  const db = getFirestore();
  const org = await db.collection('clipit_organizations').doc(orgId).get();
  const plan = effectivePlanKey((org.data()?.plan as string) ?? 'free', userEmail);
  const limit = PLAN_BULK_AI_OPS[plan] ?? 0;
  if (limit <= 0) {
    throw Object.assign(new Error('AI一括修正はスタンダードプラン以上で利用できます'), { status: 403 });
  }
  const ref = db.collection('clipit_usage').doc(orgId).collection('months').doc(monthKey());
  const snap = await ref.get();
  const used = (snap.data()?.bulkAiOps as number) ?? 0;
  if (used + 1 > limit) {
    throw Object.assign(new Error(`今月のAI一括修正上限（${limit}回）に達しました`), { status: 429 });
  }
  if (increment) {
    await ref.set({ bulkAiOps: FieldValue.increment(1) }, { merge: true });
  }
}

export async function getAiUsage(orgId: string, userEmail?: string | null) {
  const db = getFirestore();
  const org = await db.collection('clipit_organizations').doc(orgId).get();
  const plan = effectivePlanKey((org.data()?.plan as string) ?? 'free', userEmail);
  const ref = db.collection('clipit_usage').doc(orgId).collection('months').doc(monthKey());
  const snap = await ref.get();
  const data = snap.data() ?? {};
  return {
    aiCalls: (data.aiCalls as number) ?? 0,
    aiLimit: PLAN_AI_LIMIT[plan] ?? 30,
    bulkAiOps: (data.bulkAiOps as number) ?? 0,
    bulkAiLimit: PLAN_BULK_AI_OPS[plan] ?? 0,
  };
}

export async function getOrgIdForManual(manualId: string): Promise<string> {
  const snap = await getFirestore().collection('clipit_manuals').doc(manualId).get();
  return snap.data()?.organizationId as string;
}
