/**
 * Xシリーズ拡張: プレビュー・エクスポート・URL補完・並び替え・在庫分析
 */
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { generateXSeriesBatchWithGemini } from './gemini';
import {
  composeTweetText,
  dailyJitterMinutes,
  listXScheduleRules,
  listXSeries,
  listXSeriesItems,
  matchScheduleDay,
  type XScheduleRule,
  type XSeriesItem,
} from './xSeries';
import { getUserSettings, type UserSettings } from './firestore';
import { getXApiPostsThisMonth } from './firestore';
import { X_FREE_MONTHLY_SOFT_LIMIT } from './xApi';
import { xSeriesCapabilities } from './xSeriesFeatures';
import { postToSlackWebhook } from './slack';
import { sendLineBroadcast } from './lineMessaging';

function db() {
  return getFirestore();
}

function col(uid: string, name: string) {
  return db().collection(`users/${uid}/${name}`);
}

export interface XSeriesInsights {
  approvedStock: number;
  pendingStock: number;
  postsPerWeek: number;
  weeksOfStock: number | null;
  xPostsRemaining: number;
  stockRunsOutBeforeMonthEnd: boolean;
  lowStockWarning: boolean;
  nextFireAt: string | null;
}

export interface NextScheduledPost {
  at: string;
  seriesId: string;
  seriesName: string;
  ruleId: string;
  previewText: string;
  itemId?: string;
}

function postsPerWeekForRules(rules: XScheduleRule[]): number {
  return rules.reduce((sum, r) => {
    if (!r.enabled) return sum;
    const d = r.days.replace(/[・,\s]/g, '');
    let days = 7;
    if (d === '平日') days = 5;
    else if (d === '土日') days = 2;
    else if (/^[日月火水木金土]+$/.test(d)) days = d.length;
    return sum + days * r.take;
  }, 0);
}

export async function buildXSeriesInsights(
  uid: string,
  seriesId: string,
  settings?: UserSettings,
): Promise<XSeriesInsights> {
  const s = settings ?? await getUserSettings(uid);
  const items = await listXSeriesItems(uid, seriesId, { limit: 400 });
  const rules = (await listXScheduleRules(uid)).filter((r) => r.seriesId === seriesId && r.enabled);
  const approved = items.filter((i) => i.status === 'pending' && i.approved);
  const pending = items.filter((i) => i.status === 'pending');
  const postsPerWeek = postsPerWeekForRules(rules);
  const weeksOfStock = postsPerWeek > 0 ? Math.floor(approved.length / postsPerWeek) : null;
  const xUsed = getXApiPostsThisMonth(s);
  const xRemaining = Math.max(0, X_FREE_MONTHLY_SOFT_LIMIT - xUsed);
  const daysLeftInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();
  const postsLeftThisMonth = Math.ceil((daysLeftInMonth / 7) * postsPerWeek);
  const stockRunsOutBeforeMonthEnd =
    postsPerWeek > 0 && approved.length < postsLeftThisMonth && approved.length < xRemaining;
  const caps = xSeriesCapabilities(s.plan);
  const lowStockWarning =
    caps.stockAlertWeeks > 0 && weeksOfStock != null && weeksOfStock < caps.stockAlertWeeks;

  let nextFireAt: string | null = null;
  const now = new Date();
  for (let d = 0; d < 14; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);
    const jst = new Date(day.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    for (const rule of rules) {
      if (!matchScheduleDay(rule.days, jst)) continue;
      const m = /^(\d{1,2}):(\d{2})$/.exec(rule.timeHHMM);
      if (!m) continue;
      const jitter = dailyJitterMinutes(rule.seriesId, jst, rule.jitterMaxMin, 5);
      const target = new Date(jst);
      target.setHours(Number(m[1]), Number(m[2]) + jitter, 0, 0);
      if (target.getTime() > now.getTime()) {
        nextFireAt = target.toISOString();
        break;
      }
    }
    if (nextFireAt) break;
  }

  return {
    approvedStock: approved.length,
    pendingStock: pending.length,
    postsPerWeek,
    weeksOfStock,
    xPostsRemaining: xRemaining,
    stockRunsOutBeforeMonthEnd,
    lowStockWarning,
    nextFireAt,
  };
}

export async function computeNextScheduledPosts(
  uid: string,
  seriesId: string,
  limit = 7,
): Promise<NextScheduledPost[]> {
  const settings = await getUserSettings(uid);
  const caps = xSeriesCapabilities(settings.plan);
  const max = Math.min(limit, caps.nextPostsPreview || limit);
  const seriesList = await listXSeries(uid);
  const seriesName = seriesList.find((s) => s.id === seriesId)?.name ?? '';
  const rules = (await listXScheduleRules(uid)).filter((r) => r.seriesId === seriesId && r.enabled);
  const items = await listXSeriesItems(uid, seriesId, { status: 'pending', limit: 400 });
  const queue = items.filter((i) => i.approved);
  let qi = 0;
  const out: NextScheduledPost[] = [];
  const now = new Date();

  for (let d = 0; d < 60 && out.length < max; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);
    const jst = new Date(day.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    for (const rule of rules) {
      if (!matchScheduleDay(rule.days, jst)) continue;
      const m = /^(\d{1,2}):(\d{2})$/.exec(rule.timeHHMM);
      if (!m) continue;
      const jitter = dailyJitterMinutes(rule.seriesId, jst, rule.jitterMaxMin, 5);
      const target = new Date(jst);
      target.setHours(Number(m[1]), Number(m[2]) + jitter, 0, 0);
      if (target.getTime() <= now.getTime()) continue;
      for (let t = 0; t < rule.take && out.length < max; t++) {
        const item = queue[qi];
        if (!item) break;
        out.push({
          at: target.toISOString(),
          seriesId,
          seriesName,
          ruleId: rule.id,
          itemId: item.id,
          previewText: composeTweetText(item),
        });
        qi++;
      }
    }
  }
  return out;
}

export function exportSeriesToCsv(items: XSeriesItem[]): string {
  const header = '投稿OK,投稿済/未,ツイートのコメント,タグ,タイトル,X用URL,画像ALT,画像URL,投稿時刻';
  const rows = items.map((item) => {
    const ok = item.approved ? '○' : '';
    const status = item.status === 'published' ? '済' : '未';
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    return [
      ok,
      status,
      esc(item.text),
      esc(item.tags ?? ''),
      esc(item.title ?? ''),
      esc(item.linkUrl ?? ''),
      esc(item.imageAlt ?? ''),
      esc(item.imageUrl ?? ''),
      item.publishedAt ? new Date(item.publishedAt).toLocaleString('ja-JP') : '',
    ].join(',');
  });
  return `\uFEFF${header}\n${rows.join('\n')}`;
}

export async function enrichUrlForXPost(url: string): Promise<{
  title?: string;
  suggestedText?: string;
  linkUrl: string;
}> {
  const linkUrl = url.trim();
  if (!/^https?:\/\//i.test(linkUrl)) {
    throw new Error('有効な URL を入力してください');
  }
  let title = '';
  try {
    const res = await fetch(linkUrl, {
      headers: { 'User-Agent': 'BuzzIt/1.0 (+https://shigotoku.com/buzzit)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    const og =
      html.match(/property=["']og:title["']\s+content=["']([^"']+)["']/i) ??
      html.match(/content=["']([^"']+)["']\s+property=["']og:title["']/i);
    const tit = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    title = (og?.[1] ?? tit?.[1] ?? '').replace(/\s+/g, ' ').trim();
  } catch {
    /* ignore fetch errors */
  }

  const { items } = await generateXSeriesBatchWithGemini([linkUrl], 'starter', title);
  const first = items[0];
  return {
    title: first?.title ?? title,
    suggestedText: first?.text,
    linkUrl,
  };
}

export async function reorderXSeriesItems(
  uid: string,
  seriesId: string,
  orderedIds: string[],
): Promise<void> {
  const batch = db().batch();
  orderedIds.forEach((id, index) => {
    const ref = col(uid, 'xSeries').doc(seriesId).collection('items').doc(id);
    batch.update(ref, { sortOrder: index, updatedAt: FieldValue.serverTimestamp() });
  });
  await batch.commit();
}

export async function moveXSeriesItems(
  uid: string,
  fromSeriesId: string,
  toSeriesId: string,
  itemIds: string[],
): Promise<number> {
  if (fromSeriesId === toSeriesId) return 0;
  const toRef = col(uid, 'xSeries').doc(toSeriesId);
  if (!(await toRef.get()).exists) throw new Error('移動先シリーズが見つかりません');

  const existing = await toRef.collection('items').orderBy('sortOrder', 'desc').limit(1).get();
  let sortOrder = existing.empty ? 0 : Number(existing.docs[0].data().sortOrder ?? 0) + 1;

  let moved = 0;
  for (const itemId of itemIds) {
    const fromDoc = await col(uid, 'xSeries').doc(fromSeriesId).collection('items').doc(itemId).get();
    if (!fromDoc.exists) continue;
    const data = fromDoc.data()!;
    const newRef = toRef.collection('items').doc();
    await newRef.set({
      ...data,
      sortOrder,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await fromDoc.ref.delete();
    sortOrder++;
    moved++;
  }
  return moved;
}

export async function retryFailedXSeriesItem(
  uid: string,
  seriesId: string,
  itemId: string,
): Promise<boolean> {
  const ref = col(uid, 'xSeries').doc(seriesId).collection('items').doc(itemId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  if (snap.data()?.status !== 'failed') return false;
  await ref.update({
    status: 'pending',
    errorMessage: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return true;
}

export async function voiceToXSeriesBatch(
  uid: string,
  seriesId: string,
  transcript: string,
  plan: string,
  approved = false,
): Promise<{ items: XSeriesItem[]; usedGemini: boolean }> {
  const chunks = transcript
    .split(/\n{2,}|。(?=\s)|\n(?=\d+[\.\/])/)
    .map((c) => c.trim())
    .filter((c) => c.length > 20);
  const lines = chunks.length > 1 ? chunks : [transcript.trim()];
  const { items, usedGemini } = await generateXSeriesBatchWithGemini(lines.slice(0, 20), plan, '音声メモから分割');
  const { addXSeriesItems } = await import('./xSeries');
  const created = await addXSeriesItems(
    uid,
    seriesId,
    items.map((it) => ({ ...it, approved })),
  );
  return { items: created, usedGemini };
}

/** Pro+ : 在庫が2週未満のシリーズを Slack/LINE 通知（1日1回まで） */
export async function sendLowStockAlertsIfNeeded(uid: string, settings: UserSettings): Promise<boolean> {
  const caps = xSeriesCapabilities(settings.plan);
  if (!caps.stockAlertWeeks) return false;

  const dayKey = new Date().toISOString().slice(0, 10);
  const flagRef = db().collection(`users/${uid}/xSeriesMeta`).doc('stockAlert');
  const flag = await flagRef.get();
  if (flag.exists && flag.data()?.dayKey === dayKey) return false;

  const series = await listXSeries(uid);
  const rules = await listXScheduleRules(uid);
  const warnings: string[] = [];

  for (const s of series) {
    const seriesRules = rules.filter((r) => r.seriesId === s.id && r.enabled);
    const ppw = postsPerWeekForRules(seriesRules);
    if (!ppw) continue;
    const items = await listXSeriesItems(uid, s.id, { status: 'pending', limit: 400 });
    const approved = items.filter((i) => i.approved).length;
    const weeks = Math.floor(approved / ppw);
    if (weeks < caps.stockAlertWeeks) {
      warnings.push(`「${s.name}」在庫 ${approved}本（約${weeks}週分）`);
    }
  }

  if (!warnings.length) return false;

  const text = `⚠️ Xシリーズ在庫が少なくなっています\n${warnings.join('\n')}\n👉 https://app.buzzit.shigotoku.com/x-series`;
  let sent = false;
  if (settings.slackWebhookUrl) {
    sent = await postToSlackWebhook(settings.slackWebhookUrl, text);
  }
  if (settings.lineChannelAccessToken) {
    const r = await sendLineBroadcast(settings.lineChannelAccessToken, text);
    sent = sent || r.success;
  }
  await flagRef.set({ dayKey, sentAt: FieldValue.serverTimestamp() });
  return sent;
}

export async function getXSeriesWeeklyStats(uid: string): Promise<{
  publishedThisWeek: number;
  failedThisWeek: number;
  approvedStockTotal: number;
}> {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const series = await listXSeries(uid);
  let publishedThisWeek = 0;
  let failedThisWeek = 0;
  let approvedStockTotal = 0;

  for (const s of series) {
    const items = await listXSeriesItems(uid, s.id, { limit: 400 });
    for (const item of items) {
      if (item.status === 'pending' && item.approved) approvedStockTotal++;
      if (item.status === 'published' && item.publishedAt && new Date(item.publishedAt).getTime() >= weekAgo) {
        publishedThisWeek++;
      }
      if (item.status === 'failed' && item.publishedAt && new Date(item.publishedAt).getTime() >= weekAgo) {
        failedThisWeek++;
      }
    }
  }
  return { publishedThisWeek, failedThisWeek, approvedStockTotal };
}
