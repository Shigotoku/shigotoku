/**
 * SNS インサイト取得（Meta Instagram / X）
 * - Meta: Graph API media insights（views / reach 等）
 * - X: tweet public_metrics（impression_count 等）※読み取りは従量課金の可能性あり
 */
import type { MetaConnection } from './meta';
import type { XCredentials } from './xApi';
import { createHmac, randomBytes } from 'node:crypto';

const GRAPH = 'https://graph.facebook.com/v21.0';

export type InsightPlatform = 'instagram' | 'x' | 'facebook' | 'threads';

export interface FetchedInsight {
  platform: InsightPlatform;
  externalId: string;
  /** 表示回数（IG views / X impressions） */
  impressions: number;
  reach?: number;
  likes?: number;
  comments?: number;
  replies?: number;
  reposts?: number;
  quotes?: number;
  bookmarks?: number;
  saved?: number;
  raw?: Record<string, unknown>;
}

function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function xOAuthHeader(
  method: string,
  url: string,
  creds: XCredentials,
  extraParams: Record<string, string> = {},
): string {
  const oauth: Record<string, string> = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: creds.accessToken,
    oauth_version: '1.0',
  };
  const all: Record<string, string> = { ...extraParams, ...oauth };
  const paramString = Object.keys(all)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(all[k])}`)
    .join('&');
  const base = [method.toUpperCase(), percentEncode(url), percentEncode(paramString)].join('&');
  const signingKey = `${percentEncode(creds.apiSecret)}&${percentEncode(creds.accessSecret)}`;
  oauth.oauth_signature = createHmac('sha1', signingKey).update(base).digest('base64');
  return (
    'OAuth ' +
    Object.keys(oauth)
      .sort()
      .map((k) => `${percentEncode(k)}="${percentEncode(oauth[k])}"`)
      .join(', ')
  );
}

function mapPublishPlatform(platform: string): InsightPlatform | null {
  const p = platform.toLowerCase();
  if (p.includes('instagram') || p === 'reels' || p === 'carousel') return 'instagram';
  if (p === 'x' || p.includes('x_thread') || p.includes('twitter')) return 'x';
  if (p.includes('thread')) return 'threads';
  if (p.includes('facebook') || p === 'page') return 'facebook';
  return null;
}

export function normalizeInsightPlatform(platform: string): InsightPlatform | null {
  return mapPublishPlatform(platform);
}

/** Instagram メディアの insights（views 優先、失敗時は reach 等） */
export async function fetchInstagramMediaInsights(
  mediaId: string,
  conn: MetaConnection,
): Promise<FetchedInsight | { error: string }> {
  const token = conn.pageAccessToken || conn.accessToken;
  if (!token) return { error: 'Meta トークンがありません' };
  if (!mediaId) return { error: 'mediaId が空です' };

  const metricSets = [
    'views,reach,likes,comments,saved',
    'views,reach,total_interactions',
    'impressions,reach,engagement',
  ];

  let lastError = '取得失敗';
  for (const metrics of metricSets) {
    const url = `${GRAPH}/${mediaId}/insights?metric=${encodeURIComponent(metrics)}&access_token=${encodeURIComponent(token)}`;
    try {
      const res = await fetch(url);
      const data = (await res.json()) as {
        data?: Array<{ name?: string; values?: Array<{ value?: number }> }>;
        error?: { message?: string };
      };
      if (!res.ok) {
        lastError = data.error?.message ?? `Meta insights ${res.status}`;
        continue;
      }
      const map = new Map<string, number>();
      for (const row of data.data ?? []) {
        const name = row.name ?? '';
        const value = Number(row.values?.[0]?.value ?? 0);
        if (name) map.set(name, value);
      }
      const views = map.get('views') ?? map.get('impressions') ?? 0;
      return {
        platform: 'instagram',
        externalId: mediaId,
        impressions: views,
        reach: map.get('reach'),
        likes: map.get('likes') ?? map.get('total_interactions'),
        comments: map.get('comments'),
        saved: map.get('saved'),
        raw: Object.fromEntries(map),
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Meta insights 例外';
    }
  }
  return { error: lastError };
}

/** X tweet public_metrics（読み取りは従量課金の可能性あり） */
export async function fetchXTweetMetrics(
  tweetId: string,
  creds: XCredentials,
): Promise<FetchedInsight | { error: string }> {
  if (!tweetId) return { error: 'tweetId が空です' };
  const url = 'https://api.x.com/2/tweets/' + encodeURIComponent(tweetId);
  const query: Record<string, string> = { 'tweet.fields': 'public_metrics' };
  try {
    const auth = xOAuthHeader('GET', url, creds, query);
    const qs = new URLSearchParams(query).toString();
    const res = await fetch(`${url}?${qs}`, { headers: { Authorization: auth } });
    const data = (await res.json()) as {
      data?: {
        id?: string;
        public_metrics?: {
          impression_count?: number;
          like_count?: number;
          reply_count?: number;
          retweet_count?: number;
          quote_count?: number;
          bookmark_count?: number;
        };
      };
      detail?: string;
      title?: string;
      errors?: Array<{ message?: string }>;
    };
    if (!res.ok) {
      return {
        error: data.detail ?? data.title ?? data.errors?.[0]?.message ?? `X metrics ${res.status}`,
      };
    }
    const m = data.data?.public_metrics ?? {};
    return {
      platform: 'x',
      externalId: tweetId,
      impressions: Number(m.impression_count ?? 0),
      likes: m.like_count,
      replies: m.reply_count,
      reposts: m.retweet_count,
      quotes: m.quote_count,
      bookmarks: m.bookmark_count,
      raw: { ...(m as Record<string, unknown>) },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'X metrics 例外' };
  }
}

/** Facebook Page 投稿の insights */
export async function fetchFacebookPostInsights(
  postId: string,
  pageToken: string,
): Promise<FetchedInsight | { error: string }> {
  if (!postId) return { error: 'postId が空です' };
  if (!pageToken) return { error: 'Page トークンがありません' };

  const metrics = 'post_impressions,post_impressions_unique,post_engaged_users,post_reactions_by_type_total';
  const url = `${GRAPH}/${postId}/insights?metric=${encodeURIComponent(metrics)}&access_token=${encodeURIComponent(pageToken)}`;
  try {
    const res = await fetch(url);
    const data = (await res.json()) as {
      data?: Array<{ name?: string; values?: Array<{ value?: number | Record<string, number> }> }>;
      error?: { message?: string };
    };
    if (!res.ok) {
      return { error: data.error?.message ?? `Facebook insights ${res.status}` };
    }
    const map = new Map<string, number>();
    for (const row of data.data ?? []) {
      const name = row.name ?? '';
      const raw = row.values?.[0]?.value;
      const value = typeof raw === 'number' ? raw : 0;
      if (name) map.set(name, value);
    }
    return {
      platform: 'facebook',
      externalId: postId,
      impressions: map.get('post_impressions') ?? 0,
      reach: map.get('post_impressions_unique'),
      likes: map.get('post_engaged_users'),
      raw: Object.fromEntries(map),
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Facebook insights 例外' };
  }
}

/** Threads 投稿の insights */
export async function fetchThreadsPostInsights(
  mediaId: string,
  token: string,
): Promise<FetchedInsight | { error: string }> {
  if (!mediaId) return { error: 'mediaId が空です' };
  if (!token) return { error: 'Meta トークンがありません' };

  const metricSets = ['views,likes,replies,reposts,quotes', 'views,likes'];
  let lastError = '取得失敗';
  for (const metrics of metricSets) {
    const url = `${GRAPH}/${mediaId}/insights?metric=${encodeURIComponent(metrics)}&access_token=${encodeURIComponent(token)}`;
    try {
      const res = await fetch(url);
      const data = (await res.json()) as {
        data?: Array<{ name?: string; values?: Array<{ value?: number }> }>;
        error?: { message?: string };
      };
      if (!res.ok) {
        lastError = data.error?.message ?? `Threads insights ${res.status}`;
        continue;
      }
      const map = new Map<string, number>();
      for (const row of data.data ?? []) {
        const name = row.name ?? '';
        const value = Number(row.values?.[0]?.value ?? 0);
        if (name) map.set(name, value);
      }
      return {
        platform: 'threads',
        externalId: mediaId,
        impressions: map.get('views') ?? 0,
        likes: map.get('likes'),
        replies: map.get('replies'),
        reposts: map.get('reposts'),
        quotes: map.get('quotes'),
        raw: Object.fromEntries(map),
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Threads insights 例外';
    }
  }
  return { error: lastError };
}
