import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

export async function assertAiQuota(orgId: string, steps = 1) {
  const db = getFirestore();
  const org = await db.collection('clipit_organizations').doc(orgId).get();
  const plan = (org.data()?.plan as string) ?? 'free';
  const limit = PLAN_AI_LIMIT[plan] ?? 30;
  const ref = db.collection('clipit_usage').doc(orgId).collection('months').doc(monthKey());
  const snap = await ref.get();
  const used = (snap.data()?.aiCalls as number) ?? 0;
  if (used + steps > limit) {
    throw Object.assign(new Error(`今月のAI生成上限（${limit}回）に達しました`), { status: 429 });
  }
  await ref.set({ aiCalls: FieldValue.increment(steps) }, { merge: true });
}

export async function getOrgIdForManual(manualId: string): Promise<string> {
  const snap = await getFirestore().collection('clipit_manuals').doc(manualId).get();
  return snap.data()?.organizationId as string;
}
