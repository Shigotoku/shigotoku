import { getFirestore, FieldValue } from "firebase-admin/firestore";

/**
 * 利用回数だけを記録する（本文は保存しない）。
 * usage/{uid}_{YYYY-MM-DD} に { count } のみ。
 */
export function dailyLimit(): number {
  const n = Number(process.env.PREDECK_FREE_DAILY_LIMIT ?? 20);
  return Number.isFinite(n) && n > 0 ? n : 20;
}

export async function consumeQuota(uid: string, limit = dailyLimit()): Promise<{ ok: boolean; used: number }> {
  const day = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10); // JST
  const ref = getFirestore().collection("usage").doc(`${uid}_${day}`);
  return getFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const used = (snap.data()?.count as number | undefined) ?? 0;
    if (used >= limit) return { ok: false, used };
    tx.set(ref, { uid, day, count: FieldValue.increment(1) }, { merge: true });
    return { ok: true, used: used + 1 };
  });
}
