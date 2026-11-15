import { usingOwnAi } from './aiClient';
import type { PlanTier, UserSettings } from './firestore';
import { getUserSettings, updateUserSettings } from './firestore';

/** Free プランの月間 AI 生成・予約上限 */
export const FREE_MONTHLY_POST_LIMIT = 5;

const WATERMARK_PLANS = new Set<PlanTier>(['free', 'line_lite']);

export function shouldApplyWatermark(plan: string): boolean {
  return WATERMARK_PLANS.has(plan as PlanTier);
}

export const WATERMARK_SUFFIX = '\n\n— Powered by BuzzIt';

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function freePostLimitForPlan(plan: string): number | null {
  if (plan === 'free') return FREE_MONTHLY_POST_LIMIT;
  return null;
}

export async function getPostsThisMonth(uid: string, settings?: UserSettings): Promise<number> {
  const s = settings ?? await getUserSettings(uid);
  const key = currentMonthKey();
  if (s.postsMonthKey !== key) return 0;
  return s.postsThisMonth ?? 0;
}

export async function assertPostQuota(uid: string, settings?: UserSettings): Promise<UserSettings> {
  const s = settings ?? await getUserSettings(uid);
  const limit = freePostLimitForPlan(s.plan);
  if (limit == null) return s;
  const used = await getPostsThisMonth(uid, s);
  if (used >= limit) {
    throw new Error(`Freeプランの月間上限（${limit}件）に達しています。Starter以上で無制限になります`);
  }
  return s;
}

export async function incrementPostQuota(uid: string): Promise<number> {
  const key = currentMonthKey();
  const settings = await getUserSettings(uid);
  const prevKey = settings.postsMonthKey;
  const count = prevKey === key ? (settings.postsThisMonth ?? 0) + 1 : 1;
  await updateUserSettings(uid, { postsMonthKey: key, postsThisMonth: count });
  return count;
}

/**
 * 運営負担の Gemini API 呼び出しの月間上限（利用量に比例してコストが青天井にならないためのガード）。
 * 外部AI（ChatGPT/Claude/Cursor 等）から MCP 経由で作る分は、各自のAI契約で動くため対象外。
 */
export const AI_MONTHLY_LIMIT: Record<string, number> = {
  free: 10,
  starter: 60,
  pro: 200,
  team: 400,
  growth: 400,
  enterprise: 1000,
};

export async function consumeAiQuota(uid: string, plan: string): Promise<void> {
  if (usingOwnAi()) return; // 自分のAIキー利用中は運営の上限を消費しない
  const { getFirestore } = await import('firebase-admin/firestore');
  const limit = AI_MONTHLY_LIMIT[plan] ?? 60;
  const ref = getFirestore().doc(`users/${uid}/usage/ai-${currentMonthKey()}`);
  await getFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const used = (snap.data()?.count as number | undefined) ?? 0;
    if (used >= limit) {
      throw new AiQuotaError(`今月の「運営AI」利用上限（${limit}回）に達しました。「設定 > キャラ・AI」で自分のAIキーを登録するか、ChatGPT・Claude 等をMCP連携すれば、回数を気にせず下書きを作れます`);
    }
    tx.set(ref, { count: used + 1 }, { merge: true });
  });
}

export class AiQuotaError extends Error {}

export async function getAiUsage(uid: string, plan: string): Promise<{ used: number; limit: number }> {
  const { getFirestore } = await import('firebase-admin/firestore');
  const snap = await getFirestore().doc(`users/${uid}/usage/ai-${currentMonthKey()}`).get();
  return { used: (snap.data()?.count as number | undefined) ?? 0, limit: AI_MONTHLY_LIMIT[plan] ?? 60 };
}
