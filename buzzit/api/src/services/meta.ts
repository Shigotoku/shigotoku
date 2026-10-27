/**
 * Meta Graph API — Instagram / Facebook Page / Threads 投稿
 * 各店舗の OAuth トークン（BYO）を使用
 */
import type { ScheduleContentItem } from '../types/schedule';

const GRAPH = 'https://graph.facebook.com/v21.0';

export interface MetaConnection {
  accessToken: string;
  igUserId?: string;
  pageId?: string;
  pageAccessToken?: string;
  expiresAt?: string;
}

export interface MetaPublishResult {
  platform: string;
  success: boolean;
  message: string;
  externalId?: string;
}

async function graphPost(
  path: string,
  token: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string }> {
  const res = await fetch(`${GRAPH}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
  });
  const data = (await res.json()) as Record<string, unknown> & { error?: { message?: string } };
  if (!res.ok) {
    return { ok: false, error: data.error?.message ?? res.statusText };
  }
  return { ok: true, data };
}

async function graphGet<T>(path: string, token: string): Promise<T | null> {
  const url = `${GRAPH}${path}${path.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

export async function exchangeMetaCode(
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string; expiresIn?: number } | null> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) return null;

  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch(`${GRAPH}/oauth/access_token?${params}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

export async function resolveMetaAccounts(accessToken: string): Promise<{
  igUserId?: string;
  pageId?: string;
  pageAccessToken?: string;
}> {
  const pages = await graphGet<{ data?: Array<{ id: string; access_token: string; instagram_business_account?: { id: string } }> }>(
    '/me/accounts?fields=id,access_token,instagram_business_account',
    accessToken,
  );

  const page = pages?.data?.find((p) => p.instagram_business_account?.id) ?? pages?.data?.[0];
  if (!page) return {};

  return {
    pageId: page.id,
    pageAccessToken: page.access_token,
    igUserId: page.instagram_business_account?.id,
  };
}

async function publishInstagramImage(
  igUserId: string,
  token: string,
  imageUrl: string,
  caption: string,
): Promise<MetaPublishResult> {
  const container = await graphPost(`/${igUserId}/media`, token, {
    image_url: imageUrl,
    caption: caption.slice(0, 2200),
  });
  if (!container.ok || !container.data?.id) {
    return { platform: 'instagram', success: false, message: container.error ?? 'IG container failed' };
  }

  const publish = await graphPost(`/${igUserId}/media_publish`, token, {
    creation_id: container.data.id,
  });
  if (!publish.ok) {
    return { platform: 'instagram', success: false, message: publish.error ?? 'IG publish failed' };
  }

  return {
    platform: 'instagram',
    success: true,
    message: 'Instagram に投稿しました',
    externalId: String(publish.data?.id ?? ''),
  };
}

async function publishFacebookPage(
  pageId: string,
  pageToken: string,
  message: string,
  imageUrl?: string,
): Promise<MetaPublishResult> {
  const body: Record<string, unknown> = { message: message.slice(0, 5000) };
  if (imageUrl) body.url = imageUrl;

  const endpoint = imageUrl ? `/${pageId}/photos` : `/${pageId}/feed`;
  const result = await graphPost(endpoint, pageToken, body);
  if (!result.ok) {
    return { platform: 'facebook', success: false, message: result.error ?? 'Facebook publish failed' };
  }

  return {
    platform: 'facebook',
    success: true,
    message: 'Facebook Page に投稿しました',
    externalId: String(result.data?.id ?? result.data?.post_id ?? ''),
  };
}

/** Threads 投稿（将来の明示的 threads プラットフォーム用） */
export async function publishThreads(
  igUserId: string,
  token: string,
  text: string,
  imageUrl?: string,
): Promise<MetaPublishResult> {
  const body: Record<string, unknown> = {
    media_type: imageUrl ? 'IMAGE' : 'TEXT',
    text: text.slice(0, 500),
  };
  if (imageUrl) body.image_url = imageUrl;

  const container = await graphPost(`/${igUserId}/threads`, token, body);
  if (!container.ok || !container.data?.id) {
    return { platform: 'threads', success: false, message: container.error ?? 'Threads container failed' };
  }

  const publish = await graphPost(`/${igUserId}/threads_publish`, token, {
    creation_id: container.data.id,
  });
  if (!publish.ok) {
    return { platform: 'threads', success: false, message: publish.error ?? 'Threads publish failed' };
  }

  return {
    platform: 'threads',
    success: true,
    message: 'Threads に投稿しました',
    externalId: String(publish.data?.id ?? ''),
  };
}

function pickMediaUrl(mediaUrls: string[] | undefined, index: number): string | undefined {
  return mediaUrls?.[index] ?? mediaUrls?.[0];
}

export async function publishToMeta(
  connection: MetaConnection,
  contents: ScheduleContentItem[],
  mediaUrls?: string[],
): Promise<MetaPublishResult[]> {
  const results: MetaPublishResult[] = [];
  const igToken = connection.pageAccessToken ?? connection.accessToken;
  const pageToken = connection.pageAccessToken ?? connection.accessToken;

  for (let i = 0; i < contents.length; i++) {
    const item = contents[i];
    const media = pickMediaUrl(mediaUrls, i);

    switch (item.platform) {
      case 'reels':
      case 'carousel':
        if (connection.igUserId && media) {
          results.push(await publishInstagramImage(connection.igUserId, igToken, media, item.content));
        } else if (connection.igUserId) {
          results.push({
            platform: item.platform,
            success: false,
            message: 'Instagram 投稿には画像/動画 URL が必要です',
          });
        } else {
          results.push({ platform: item.platform, success: false, message: 'Instagram 未連携' });
        }
        break;

      case 'x_thread':
        // X 公式 API は従量課金のため Meta 経路では投稿しない。
        // Threads へ誤投稿しないようスキップし、notify / ayrshare を案内する。
        results.push({
          platform: 'x_thread',
          success: false,
          message:
            'X は Meta 自動投稿の対象外です。予約モード「通知」でコピー投稿するか、Ayrshare 連携を使ってください',
        });
        break;

      case 'threads':
        if (connection.igUserId) {
          results.push(await publishThreads(connection.igUserId, igToken, item.content, media));
        } else {
          results.push({ platform: 'threads', success: false, message: 'Threads/IG 未連携' });
        }
        break;

      case 'line':
        if (connection.pageId) {
          results.push(await publishFacebookPage(connection.pageId, pageToken, item.content, media));
        } else {
          results.push({ platform: 'facebook', success: false, message: 'Facebook Page 未連携' });
        }
        break;

      default:
        if (connection.pageId) {
          results.push(await publishFacebookPage(connection.pageId, pageToken, item.content, media));
        } else {
          results.push({ platform: item.platform, success: false, message: 'Meta 未連携' });
        }
    }
  }

  return results;
}

export function getMetaOAuthUrl(state: string, redirectUri: string): string | null {
  const appId = process.env.META_APP_ID;
  if (!appId) return null;

  const scopes = [
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_insights',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'business_management',
  ].join(',');

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: scopes,
    response_type: 'code',
  });

  return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
}
