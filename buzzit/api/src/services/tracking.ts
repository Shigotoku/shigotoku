import crypto from 'crypto';

const APP_BASE =
  process.env.BUZZIT_APP_URL?.replace(/\/$/, '') ?? 'https://app.buzzit.shigotoku.com';

export function trackingClickUrl(token: string): string {
  return `${APP_BASE}/api/v1/track/click/${token}`;
}

export function lineWebhookUrl(uid: string): string {
  return `${APP_BASE}/api/v1/webhooks/line?uid=${encodeURIComponent(uid)}`;
}

export function generateTrackingToken(): string {
  return crypto.randomBytes(12).toString('hex');
}

export function appendUtmParams(
  url: string,
  params: { campaign: string; source?: string; medium?: string; content?: string },
): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('utm_source', params.source ?? 'buzzit');
    parsed.searchParams.set('utm_medium', params.medium ?? 'social');
    parsed.searchParams.set('utm_campaign', params.campaign);
    if (params.content) parsed.searchParams.set('utm_content', params.content);
    return parsed.toString();
  } catch {
    return url;
  }
}

export function verifyLineSignature(body: string, signature: string, channelSecret: string): boolean {
  if (!signature || !channelSecret) return false;
  const hash = crypto.createHmac('sha256', channelSecret).update(body).digest('base64');
  return hash === signature;
}
