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

export function isHpbUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes('hotpepper') || host.includes('beauty.hotpepper');
  } catch {
    return false;
  }
}

export function appendUtmParams(
  url: string,
  params: { campaign: string; source?: string; medium?: string; content?: string; hpbTracking?: boolean },
): string {
  try {
    const parsed = new URL(url);
    const hpb = params.hpbTracking ?? isHpbUrl(url);
    parsed.searchParams.set('utm_source', params.source ?? 'buzzit');
    parsed.searchParams.set('utm_medium', hpb ? 'buzzit_hpb' : (params.medium ?? 'social'));
    parsed.searchParams.set('utm_campaign', params.campaign);
    if (params.content) parsed.searchParams.set('utm_content', params.content);
    if (hpb) {
      parsed.searchParams.set('utm_term', 'hpb_reservation');
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

/** HPB トラッキング有効時のリダイレクト先を決定 */
export function resolveTrackingDestination(
  settings: { defaultDestinationUrl?: string; hpbStoreUrl?: string; hpbTrackingEnabled?: boolean },
  explicitDest?: string,
): string | undefined {
  if (explicitDest?.trim()) return explicitDest.trim();
  if (settings.hpbTrackingEnabled && settings.hpbStoreUrl?.trim()) {
    return settings.hpbStoreUrl.trim();
  }
  return settings.defaultDestinationUrl?.trim();
}

export function verifyLineSignature(body: string, signature: string, channelSecret: string): boolean {
  if (!signature || !channelSecret) return false;
  const hash = crypto.createHmac('sha256', channelSecret).update(body).digest('base64');
  return hash === signature;
}
