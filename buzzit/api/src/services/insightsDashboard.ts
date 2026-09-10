/**
 * SNS解析ダッシュボード（Buffer Insights / SocialDog ダッシュボード相当）
 */
import {
  getUserSettings,
  listPostInsights,
  getMetrics,
  getScheduledJobs,
  listInsightsDailySnapshots,
  upsertInsightsDailySnapshot,
  type PostInsightDoc,
  type UserSettings,
  type InsightsDailySnapshot,
} from './firestore';
import { buildInsightsSummary, type InsightsSummary } from './insightsSync';
import { getLineFollowerInsight } from './lineMessaging';
import { credentialsFromSettings } from './xApi';
import { generateInsightsTakeawaysWithGemini } from './gemini';

export type InsightsPlatformFilter = 'all' | 'x' | 'instagram' | 'facebook' | 'line';

export interface InsightsDailyPoint {
  date: string;
  impressions: number;
  reach: number;
  engagements: number;
  posts: number;
}

export interface InsightsTopPost {
  id: string;
  platform: string;
  preview: string;
  impressions: number;
  engagement: number;
  engagementRate: number;
  scheduledAt?: string;
}

export interface InsightsTakeaway {
  type: 'success' | 'warning' | 'tip';
  title: string;
  body: string;
  actionLabel?: string;
  actionPath?: string;
}

export interface InsightsDashboard {
  platform: InsightsPlatformFilter;
  periodDays: number;
  totals: {
    impressions: number;
    reach: number;
    engagements: number;
    postCount: number;
    clicks: number;
    lineSignups: number;
    revenue: number;
  };
  byPlatform: Record<
    string,
    { impressions: number; reach: number; engagements: number; postCount: number }
  >;
  dailySeries: InsightsDailyPoint[];
  topPosts: InsightsTopPost[];
  takeaways: InsightsTakeaway[];
  connections: {
    x: boolean;
    instagram: boolean;
    facebook: boolean;
    threads: boolean;
    line: boolean;
    meta: boolean;
  };
  lineFollowers: number | null;
  tiktok: { publishedCount: number; note: string };
  summary: InsightsSummary;
  funnel: {
    posts: number;
    reach: number;
    clicks: number;
    lineSignups: number;
    revenue: number;
  };
  lastSyncedAt?: string;
  aiPowered?: boolean;
  snapshotDays?: number;
}

const SNS_PLATFORMS = new Set(['x', 'instagram', 'facebook', 'threads']);

function postEngagement(p: PostInsightDoc): number {
  return (
    (p.likes ?? 0) +
    (p.comments ?? 0) +
    (p.replies ?? 0) +
    (p.reposts ?? 0) +
    (p.quotes ?? 0) +
    (p.bookmarks ?? 0) +
    (p.saved ?? 0)
  );
}

function matchesPlatform(p: PostInsightDoc, platform: InsightsPlatformFilter): boolean {
  if (platform === 'all') return SNS_PLATFORMS.has(p.platform);
  if (platform === 'x') return p.platform === 'x';
  if (platform === 'instagram') return p.platform === 'instagram';
  if (platform === 'facebook') return p.platform === 'facebook' || p.platform === 'threads';
  return false;
}

function postDateKey(p: PostInsightDoc): string {
  const raw = p.scheduledAt || p.fetchedAt;
  return raw.slice(0, 10);
}

function buildDailyBuckets(days: number): Map<string, InsightsDailyPoint> {
  const map = new Map<string, InsightsDailyPoint>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { date: key, impressions: 0, reach: 0, engagements: 0, posts: 0 });
  }
  return map;
}

function mergeDailyFromSnapshots(
  snapshots: InsightsDailySnapshot[],
  postBased: InsightsDailyPoint[],
  days: number,
): InsightsDailyPoint[] {
  if (snapshots.length < 3) return postBased;

  const snapMap = new Map(snapshots.map((s) => [s.date, s]));
  const buckets = buildDailyBuckets(days);
  const result: InsightsDailyPoint[] = [];

  for (const [date, bucket] of buckets) {
    const snap = snapMap.get(date);
    if (snap) {
      result.push({
        date,
        impressions: snap.impressions,
        reach: snap.reach,
        engagements: snap.engagements,
        posts: snap.postCount,
      });
    } else {
      const fallback = postBased.find((p) => p.date === date);
      result.push(fallback ?? bucket);
    }
  }
  return result;
}

function buildRuleTakeaways(input: {
  posts: PostInsightDoc[];
  summary: InsightsSummary;
  settings: UserSettings;
  topPosts: InsightsTopPost[];
  metrics: Awaited<ReturnType<typeof getMetrics>>;
  lineFollowers: number | null;
  byPlatform: InsightsDashboard['byPlatform'];
}): InsightsTakeaway[] {
  const tips: InsightsTakeaway[] = [];
  const { posts, summary, settings, topPosts, metrics, lineFollowers, byPlatform } = input;

  if (summary.postCount === 0) {
    tips.push({
      type: 'tip',
      title: 'まず投稿を自動化しましょう',
      body: 'Buzzit から予約投稿または Xシリーズで投稿すると、ここにインプレッションが集まります。',
      actionLabel: '投稿を作る',
      actionPath: '/magic-creator',
    });
  }

  if (!settings.metaAccessToken) {
    tips.push({
      type: 'tip',
      title: 'Instagram / Facebook を連携すると解析が始まります',
      body: 'Meta 連携後、投稿の表示・リーチ・いいねが自動で取り込まれます。',
      actionLabel: 'SNS設定',
      actionPath: '/settings?tab=sns',
    });
  }

  if (credentialsFromSettings(settings) && !settings.xInsightsEnabled) {
    tips.push({
      type: 'warning',
      title: 'X のインプレッション取得がオフです',
      body: summary.xInsightsBillingNote,
      actionLabel: '設定を開く',
      actionPath: '/settings?tab=sns',
    });
  }

  const ig = byPlatform.instagram;
  const x = byPlatform.x;
  if (ig && x && ig.postCount >= 2 && x.postCount >= 2) {
    const igRate = ig.impressions > 0 ? ig.engagements / ig.impressions : 0;
    const xRate = x.impressions > 0 ? x.engagements / x.impressions : 0;
    if (igRate > xRate * 1.3) {
      tips.push({
        type: 'success',
        title: 'Instagram の反応が X より高い',
        body: '同じネタをリール・カルーセル向けに最適化して IG に厚く投下するのがおすすめです。',
        actionLabel: 'IGで作る',
        actionPath: '/magic-creator?sns=instagram',
      });
    } else if (xRate > igRate * 1.3) {
      tips.push({
        type: 'success',
        title: 'X のエンゲージメントが好調',
        body: 'Xシリーズの在庫を増やし、同テーマで継続投稿すると伸びやすい状態です。',
        actionLabel: 'Xリストへ',
        actionPath: '/x-series',
      });
    }
  }

  if (topPosts[0] && topPosts[0].engagement > 0) {
    tips.push({
      type: 'success',
      title: '今期のベスト投稿',
      body: `「${topPosts[0].preview.slice(0, 40)}${topPosts[0].preview.length > 40 ? '…' : ''}」が最も反応がありました。`,
      actionLabel: '同テーマで作る',
      actionPath: '/magic-creator',
    });
  }

  if (metrics.funnel.clicks > 0 && metrics.funnel.lineSignups === 0) {
    tips.push({
      type: 'warning',
      title: 'クリックはあるが LINE 追加がゼロ',
      body: '導線ビルダーで LP → LINE 登録の流れを見直すと改善しやすいです。',
      actionLabel: '導線を確認',
      actionPath: '/funnel',
    });
  }

  if (lineFollowers != null && lineFollowers > 0 && metrics.funnel.lineSignups === 0) {
    tips.push({
      type: 'tip',
      title: `LINE友だち ${lineFollowers.toLocaleString()} 人`,
      body: 'SNS投稿に LINE 登録導線を入れて、友だち増加を計測しましょう。',
      actionLabel: 'LINE CRM',
      actionPath: '/line-crm',
    });
  }

  if (tips.length === 0 && posts.length > 0) {
    tips.push({
      type: 'tip',
      title: '順調にデータが集まっています',
      body: '週1回「解析を更新」して、好調な投稿パターンを見つけましょう。',
    });
  }

  return tips.slice(0, 3);
}

async function countTiktokPublished(uid: string): Promise<number> {
  const jobs = await getScheduledJobs(uid, 'published');
  return jobs.filter((j) =>
    (j.publishResults ?? []).some(
      (r) => r.success && String(r.platform).toLowerCase().includes('tiktok'),
    ),
  ).length;
}

export async function recordInsightsDailySnapshot(uid: string, dashboard: InsightsDashboard): Promise<void> {
  const date = new Date().toISOString().slice(0, 10);
  await upsertInsightsDailySnapshot(uid, {
    date,
    impressions: dashboard.totals.impressions,
    reach: dashboard.totals.reach,
    engagements: dashboard.totals.engagements,
    postCount: dashboard.totals.postCount,
    byPlatform: dashboard.byPlatform,
    lineFollowers: dashboard.lineFollowers,
    savedAt: new Date().toISOString(),
  });
}

export async function buildInsightsDashboard(
  uid: string,
  options: { platform?: InsightsPlatformFilter; days?: number; useAi?: boolean } = {},
): Promise<InsightsDashboard> {
  const platform = options.platform ?? 'all';
  const days = Math.min(90, Math.max(7, options.days ?? 30));
  const useAi = options.useAi === true;

  const settings = await getUserSettings(uid);
  const metrics = await getMetrics(uid);
  const allPosts = await listPostInsights(uid, { limit: 200 });
  const snapshots = await listInsightsDailySnapshots(uid, days);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);

  const validPosts = allPosts.filter((p) => !p.lastError && matchesPlatform(p, platform));
  const inPeriod = validPosts.filter((p) => {
    const d = new Date(p.scheduledAt || p.fetchedAt);
    return d >= cutoff;
  });

  const dailyMap = buildDailyBuckets(days);
  const byPlatform: InsightsDashboard['byPlatform'] = {};

  let totalImpressions = 0;
  let totalReach = 0;
  let totalEngagements = 0;

  for (const p of inPeriod) {
    const eng = postEngagement(p);
    totalImpressions += p.impressions || 0;
    totalReach += p.reach || 0;
    totalEngagements += eng;

    const key = p.platform;
    if (!byPlatform[key]) {
      byPlatform[key] = { impressions: 0, reach: 0, engagements: 0, postCount: 0 };
    }
    byPlatform[key].impressions += p.impressions || 0;
    byPlatform[key].reach += p.reach || 0;
    byPlatform[key].engagements += eng;
    byPlatform[key].postCount += 1;

    const dateKey = postDateKey(p);
    const bucket = dailyMap.get(dateKey);
    if (bucket) {
      bucket.impressions += p.impressions || 0;
      bucket.reach += p.reach || 0;
      bucket.engagements += eng;
      bucket.posts += 1;
    }
  }

  const postBasedDaily = Array.from(dailyMap.values());
  const dailySeries = mergeDailyFromSnapshots(snapshots, postBasedDaily, days);

  const topPosts: InsightsTopPost[] = [...inPeriod]
    .map((p) => {
      const engagement = postEngagement(p);
      const impressions = p.impressions || 0;
      return {
        id: p.id,
        platform: p.platform,
        preview: p.preview || p.externalId,
        impressions,
        engagement,
        engagementRate: impressions > 0 ? Math.round((engagement / impressions) * 1000) / 10 : 0,
        scheduledAt: p.scheduledAt,
      };
    })
    .sort((a, b) => b.engagement - a.engagement || b.impressions - a.impressions)
    .slice(0, 10);

  let lineFollowers: number | null = null;
  if (platform === 'all' || platform === 'line') {
    if (settings.lineChannelAccessToken) {
      try {
        const today = new Date();
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        const date = `${y.getFullYear()}${String(y.getMonth() + 1).padStart(2, '0')}${String(y.getDate()).padStart(2, '0')}`;
        const f = await getLineFollowerInsight(settings.lineChannelAccessToken, date);
        if (f.success) lineFollowers = f.followers ?? null;
      } catch {
        lineFollowers = null;
      }
    }
  }

  const summaryPlatform =
    platform === 'all' || platform === 'line' ? undefined : platform === 'facebook' ? 'facebook-threads' : platform;
  const summary = await buildInsightsSummary(uid, summaryPlatform);

  const tiktokPublished = await countTiktokPublished(uid);

  const totals = {
    impressions: totalImpressions,
    reach: totalReach,
    engagements: totalEngagements,
    postCount: inPeriod.length,
    clicks: metrics.funnel.clicks,
    lineSignups: metrics.funnel.lineSignups,
    revenue: metrics.funnel.revenue,
  };

  let takeaways = buildRuleTakeaways({
    posts: inPeriod,
    summary,
    settings,
    topPosts,
    metrics,
    lineFollowers,
    byPlatform,
  });

  let aiPowered = false;
  if (useAi) {
    const ai = await generateInsightsTakeawaysWithGemini({
      totals,
      byPlatform,
      topPosts,
      lineFollowers,
      periodDays: days,
    });
    if (ai.usedGemini && ai.takeaways.length > 0) {
      takeaways = [...ai.takeaways, ...takeaways].slice(0, 5);
      aiPowered = true;
    }
  }

  return {
    platform,
    periodDays: days,
    totals,
    byPlatform,
    dailySeries,
    topPosts,
    takeaways,
    connections: {
      x: !!credentialsFromSettings(settings),
      instagram: !!settings.metaAccessToken && !!settings.metaIgUserId,
      facebook: !!settings.metaPageId,
      threads: !!settings.metaIgUserId,
      line: !!settings.lineChannelAccessToken?.trim(),
      meta: !!settings.metaAccessToken,
    },
    lineFollowers,
    tiktok: {
      publishedCount: tiktokPublished,
      note:
        'TikTok の詳細インサイトは Business API 連携後に対応予定です。現時点は Buzzit 経由の投稿数のみ表示します。',
    },
    summary,
    funnel: metrics.funnel,
    lastSyncedAt: settings.insightsLastSyncedAt,
    aiPowered,
    snapshotDays: snapshots.length,
  };
}
