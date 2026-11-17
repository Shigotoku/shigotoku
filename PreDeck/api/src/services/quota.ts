import { getFirestore, FieldValue } from "firebase-admin/firestore";

/**
 * 利用回数だけを記録する（本文は保存しない）。
 * usage/{uid}_{YYYY-MM-DD} に { count } のみ。
 */
export function dailyLimit(): number {
  const n = Number(process.env.PREDECK_FREE_DAILY_LIMIT ?? 20);
  return Number.isFinite(n) && n > 0 ? n : 20;
}

/** 同時通訳 1 セッションあたりの文数上限 */
export const SESSION_MAX_SEGMENTS = 300;
const SESSION_TTL_MS = 3 * 3600_000;

/**
 * 同時通訳セッションを開始する。1 日の無料枠を 1 回だけ消費し、sessionId を返す。
 * 以降の文ごとの翻訳は枠を消費せず、セッション内の文数上限だけを見る。
 */
export async function startSession(uid: string): Promise<{ ok: boolean; sessionId?: string }> {
  const q = await consumeQuota(uid);
  if (!q.ok) return { ok: false };
  const ref = getFirestore().collection("simulSessions").doc();
  await ref.set({ uid, count: 0, createdAt: Date.now() }); // 本文は保存しない
  return { ok: true, sessionId: ref.id };
}

export async function consumeSegment(uid: string, sessionId: string): Promise<{ ok: boolean; reason?: "invalid" | "limit" }> {
  const ref = getFirestore().collection("simulSessions").doc(sessionId);
  return getFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.data() as { uid?: string; count?: number; createdAt?: number } | undefined;
    if (!d || d.uid !== uid || Date.now() - (d.createdAt ?? 0) > SESSION_TTL_MS) return { ok: false, reason: "invalid" as const };
    if ((d.count ?? 0) >= SESSION_MAX_SEGMENTS) return { ok: false, reason: "limit" as const };
    tx.update(ref, { count: FieldValue.increment(1) });
    return { ok: true };
  });
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
