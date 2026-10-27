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
