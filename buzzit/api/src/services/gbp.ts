/**
 * Google Business Profile OAuth + 投稿・クチコミ取得
 */
import type { UserSettings } from './firestore';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GBP_SCOPE = 'https://www.googleapis.com/auth/business.manage';

export interface GbpLocation {
  name: string;
  locationId: string;
  title: string;
  address?: string;
}

function clientId(): string | undefined {
  return process.env.GOOGLE_OAUTH_CLIENT_ID;
}

function clientSecret(): string | undefined {
  return process.env.GOOGLE_OAUTH_CLIENT_SECRET;
}

export function getGoogleOAuthUrl(state: string, redirectUri: string): string | null {
  const id = clientId();
  if (!id) return null;
  const params = new URLSearchParams({
    client_id: id,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GBP_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number } | null> {
  const id = clientId();
  const secret = clientSecret();
  if (!id || !secret) return null;

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: id,
      client_secret: secret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!json.access_token) return null;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in,
  };
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const id = clientId();
  const secret = clientSecret();
  if (!id || !secret) return null;
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: id,
      client_secret: secret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string };
  return json.access_token ?? null;
}

export async function getValidGbpToken(settings: UserSettings): Promise<string | null> {
  if (!settings.gbpAccessToken) return null;
  const expiresAt = settings.gbpTokenExpiresAt ? new Date(settings.gbpTokenExpiresAt).getTime() : 0;
  if (expiresAt > Date.now() + 60_000) return settings.gbpAccessToken;
  if (settings.gbpRefreshToken) {
    return refreshAccessToken(settings.gbpRefreshToken);
  }
  return settings.gbpAccessToken;
}

export async function listGbpAccounts(accessToken: string): Promise<Array<{ name: string; accountName: string }>> {
  const res = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { accounts?: Array<{ name: string; accountName: string }> };
  return json.accounts ?? [];
}

export async function listGbpLocations(
  accessToken: string,
  accountName: string,
): Promise<GbpLocation[]> {
  const res = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return [];
  const json = (await res.json()) as {
    locations?: Array<{
      name: string;
      title?: string;
      storefrontAddress?: { addressLines?: string[] };
    }>;
  };
  return (json.locations ?? []).map((loc) => ({
    name: loc.name,
    locationId: loc.name.split('/').pop() ?? loc.name,
    title: loc.title ?? '店舗',
    address: loc.storefrontAddress?.addressLines?.join(' '),
  }));
}

export async function publishGbpLocalPost(
  settings: UserSettings,
  summary: string,
  mediaUrl?: string,
): Promise<{ success: boolean; message: string; postId?: string }> {
  const token = await getValidGbpToken(settings);
  if (!token) {
    return { success: false, message: 'GBP アクセストークンがありません。OAuth 連携を行ってください' };
  }

  const locationName = settings.gbpLocationResourceName ?? settings.gbpLocationName;
  if (!locationName) {
    return { success: false, message: 'GBP ロケーションが未設定です' };
  }

  const accountId = settings.gbpAccountName;
  const locationId = settings.gbpLocationId ?? locationName.split('/').pop();
  if (!accountId || !locationId) {
    return { success: false, message: 'GBP アカウント/ロケーション ID が未設定です。設定で再連携してください' };
  }

  const body: Record<string, unknown> = {
    languageCode: 'ja',
    summary: summary.slice(0, 1500),
    topicType: 'STANDARD',
  };
  if (mediaUrl) {
    body.media = [{ mediaFormat: 'PHOTO', sourceUrl: mediaUrl }];
  }

  const url = `https://mybusiness.googleapis.com/v4/${accountId}/locations/${locationId}/localPosts`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    return { success: false, message: `GBP投稿失敗: ${err.slice(0, 200)}` };
  }

  const json = (await res.json()) as { name?: string };
  return {
    success: true,
    message: 'Googleマップに投稿しました',
    postId: json.name,
  };
}

export async function listGbpReviews(
  settings: UserSettings,
): Promise<Array<{ id: string; reviewer: string; comment: string; starRating: string; createTime: string }>> {
  const token = await getValidGbpToken(settings);
  const accountId = settings.gbpAccountName;
  const locationId = settings.gbpLocationId;
  if (!token || !accountId || !locationId) return [];

  const url = `https://mybusiness.googleapis.com/v4/${accountId}/locations/${locationId}/reviews`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    reviews?: Array<{
      reviewId?: string;
      reviewer?: { displayName?: string };
      comment?: string;
      starRating?: string;
      createTime?: string;
    }>;
  };
  return (json.reviews ?? []).map((r) => ({
    id: r.reviewId ?? '',
    reviewer: r.reviewer?.displayName ?? '匿名',
    comment: r.comment ?? '',
    starRating: r.starRating ?? 'STAR_RATING_UNSPECIFIED',
    createTime: r.createTime ?? '',
  }));
}

export async function fetchGbpInsights(
  settings: UserSettings,
): Promise<{ views: number; searches: number; actions: number } | null> {
  const token = await getValidGbpToken(settings);
  const locationName = settings.gbpLocationResourceName;
  if (!token || !locationName) return null;

  const end = new Date();
  const start = new Date(end.getTime() - 28 * 24 * 60 * 60 * 1000);
  const url = `https://businessprofileperformance.googleapis.com/v1/${locationName}:fetchMultiDailyMetricsTimeSeries`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dailyMetrics: ['BUSINESS_IMPRESSIONS_DESKTOP_MAPS', 'BUSINESS_IMPRESSIONS_MOBILE_MAPS', 'CALL_CLICKS'],
      dailyRange: { startDate: { year: start.getFullYear(), month: start.getMonth() + 1, day: start.getDate() }, endDate: { year: end.getFullYear(), month: end.getMonth() + 1, day: end.getDate() } },
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { timeSeries?: { datedValues?: Array<{ value?: string }> }[] };
  const series = json.timeSeries ?? [];
  const sum = (idx: number) =>
    (series[idx]?.datedValues ?? []).reduce((a, v) => a + Number(v.value ?? 0), 0);
  return {
    views: sum(0) + sum(1),
    searches: 0,
    actions: sum(2),
  };
}
