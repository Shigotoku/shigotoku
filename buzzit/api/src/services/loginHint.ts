import { getAuth } from 'firebase-admin/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LoginHintSuggest = 'google';

export interface LoginHintResult {
  /** 安全に案内できるログイン方法（Google 専用アカウントのみ） */
  suggest?: LoginHintSuggest;
}

/** IP 単位の簡易レート制限（メール列挙の抑止） */
const buckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 15;

export function checkLoginHintRateLimit(clientKey: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(clientKey);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(clientKey, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (bucket.count >= MAX_PER_WINDOW) return false;
  bucket.count++;
  return true;
}

export async function getLoginHint(email: string): Promise<LoginHintResult> {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalized)) {
    return {};
  }

  try {
    const user = await getAuth().getUserByEmail(normalized);
    const providerIds = user.providerData.map((p) => p.providerId);
    const hasGoogle = providerIds.includes('google.com');
    const hasPassword = providerIds.includes('password');

    if (hasGoogle && !hasPassword) {
      return { suggest: 'google' };
    }

    return {};
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'auth/user-not-found') {
      return {};
    }
    throw err;
  }
}
