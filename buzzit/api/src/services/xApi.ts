/**
 * X (Twitter) API — ユーザーBYOK（OAuth 1.0a）で投稿
 * Free / pay-per-use いずれでも、Read and Write 権限のユーザートークンが必要。
 * 投稿: POST /2/tweets
 * 画像: v1.1 media/upload + media/metadata/create（ALT）
 */
import { createHmac, randomBytes } from 'node:crypto';

export interface XCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
}

export interface XPublishResult {
  success: boolean;
  message: string;
  tweetId?: string;
}

const TWEET_MAX = 280;
export const X_FREE_MONTHLY_SOFT_LIMIT = Number(process.env.X_FREE_MONTHLY_LIMIT ?? 500);

function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function oauthHeader(
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
  const signature = createHmac('sha1', signingKey).update(base).digest('base64');
  oauth.oauth_signature = signature;

  return (
    'OAuth ' +
    Object.keys(oauth)
      .sort()
      .map((k) => `${percentEncode(k)}="${percentEncode(oauth[k])}"`)
      .join(', ')
  );
}

export function truncateForX(text: string, max = TWEET_MAX): string {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if ([...normalized].length <= max) return normalized;
  const chars = [...normalized];
  return `${chars.slice(0, max - 1).join('')}…`;
}

export function pickXPostText(
  contents: Array<{ platform: string; label: string; content: string }>,
): string {
  const x =
    contents.find((c) => c.platform === 'x_thread') ??
    contents.find((c) => c.platform === 'reels') ??
    contents[0];
  return truncateForX(x?.content ?? '');
}

async function uploadMediaSimple(
  creds: XCredentials,
  imageUrl: string,
  altText?: string,
): Promise<string | null> {
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg';
    if (!contentType.startsWith('image/')) return null;
    if (buf.length > 5 * 1024 * 1024) return null;

    const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';
    const form = new FormData();
    form.append('media', new Blob([new Uint8Array(buf)], { type: contentType }), 'media.jpg');

    const auth = oauthHeader('POST', uploadUrl, creds);
    const up = await fetch(uploadUrl, {
      method: 'POST',
      headers: { Authorization: auth },
      body: form,
    });
    const data = (await up.json()) as { media_id_string?: string; errors?: Array<{ message?: string }> };
    if (!up.ok || !data.media_id_string) return null;

    if (altText?.trim()) {
      const metaUrl = 'https://upload.twitter.com/1.1/media/metadata/create.json';
      const metaBody = JSON.stringify({
        media_id: data.media_id_string,
        alt_text: { text: altText.slice(0, 1000) },
      });
      const metaAuth = oauthHeader('POST', metaUrl, creds);
      await fetch(metaUrl, {
        method: 'POST',
        headers: {
          Authorization: metaAuth,
          'Content-Type': 'application/json',
        },
        body: metaBody,
      });
    }

    return data.media_id_string;
  } catch {
    return null;
  }
}

export async function verifyXCredentials(creds: XCredentials): Promise<{ ok: boolean; message: string; username?: string }> {
  const url = 'https://api.x.com/2/users/me';
  try {
    const auth = oauthHeader('GET', url, creds);
    const res = await fetch(url, { headers: { Authorization: auth } });
    const data = (await res.json()) as {
      data?: { username?: string; name?: string };
      detail?: string;
      title?: string;
      errors?: Array<{ message?: string }>;
    };
    if (!res.ok) {
      return {
        ok: false,
        message: data.detail ?? data.title ?? data.errors?.[0]?.message ?? `認証失敗 (${res.status})`,
      };
    }
    return {
      ok: true,
      message: `接続OK (@${data.data?.username ?? 'unknown'})`,
      username: data.data?.username,
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : '接続確認に失敗しました' };
  }
}

/** `---` 区切り、または 1/ 2/ 形式でスレッド分割（最大5投稿） */
export function splitThreadParts(text: string): string[] {
  const raw = text.replace(/\r\n/g, '\n').trim();
  if (!raw) return [];
  if (raw.includes('\n---\n')) {
    return raw
      .split(/\n---\n/)
      .map((p) => truncateForX(p.trim()))
      .filter(Boolean)
      .slice(0, 5);
  }
  const numbered = raw.split(/\n(?=\d+\/\s)/).map((p) => p.trim()).filter(Boolean);
  if (numbered.length > 1) {
    return numbered.map((p) => truncateForX(p)).slice(0, 5);
  }
  return [truncateForX(raw)];
}

async function postSingleTweet(
  creds: XCredentials,
  bodyText: string,
  mediaIds: string[],
  replyTo?: string,
): Promise<XPublishResult> {
  const tweetUrl = 'https://api.x.com/2/tweets';
  const payload: Record<string, unknown> = { text: bodyText };
  if (mediaIds.length > 0) payload.media = { media_ids: mediaIds };
  if (replyTo) payload.reply = { in_reply_to_tweet_id: replyTo };

  const auth = oauthHeader('POST', tweetUrl, creds);
  const res = await fetch(tweetUrl, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as {
    data?: { id?: string; text?: string };
    detail?: string;
    title?: string;
    errors?: Array<{ message?: string; detail?: string }>;
  };

  if (!res.ok) {
    const errMsg =
      data.detail ??
      data.title ??
      data.errors?.[0]?.detail ??
      data.errors?.[0]?.message ??
      `X投稿失敗 (${res.status})`;
    return { success: false, message: errMsg };
  }

  return {
    success: true,
    message: 'Xに投稿しました',
    tweetId: data.data?.id,
  };
}

export async function postTweetWithXApi(
  creds: XCredentials,
  text: string,
  mediaUrls?: string[],
): Promise<XPublishResult> {
  const parts = splitThreadParts(text);
  if (!parts.length) {
    return { success: false, message: '投稿本文が空です' };
  }

  const mediaIds: string[] = [];
  for (const url of (mediaUrls ?? []).slice(0, 4)) {
    const id = await uploadMediaSimple(creds, url);
    if (id) mediaIds.push(id);
  }

  try {
    let replyTo: string | undefined;
    let firstId: string | undefined;
    for (let i = 0; i < parts.length; i++) {
      const result = await postSingleTweet(
        creds,
        parts[i],
        i === 0 ? mediaIds : [],
        replyTo,
      );
      if (!result.success) {
        if (i === 0) return result;
        return {
          success: true,
          message: `スレッド ${i}/${parts.length} まで投稿（続き失敗: ${result.message}）`,
          tweetId: firstId,
        };
      }
      if (i === 0) firstId = result.tweetId;
      replyTo = result.tweetId;
    }
    return {
      success: true,
      message:
        parts.length > 1
          ? `Xスレッド ${parts.length} 投稿しました${mediaIds.length ? `（画像${mediaIds.length}枚）` : ''}`
          : `Xに投稿しました${mediaIds.length ? `（画像${mediaIds.length}枚）` : ''}`,
      tweetId: firstId,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'X投稿に失敗しました',
    };
  }
}

export function credentialsFromSettings(settings: {
  xApiKey?: string;
  xApiSecret?: string;
  xAccessToken?: string;
  xAccessSecret?: string;
}): XCredentials | null {
  const { xApiKey, xApiSecret, xAccessToken, xAccessSecret } = settings;
  if (!xApiKey || !xApiSecret || !xAccessToken || !xAccessSecret) return null;
  return {
    apiKey: xApiKey,
    apiSecret: xApiSecret,
    accessToken: xAccessToken,
    accessSecret: xAccessSecret,
  };
}
