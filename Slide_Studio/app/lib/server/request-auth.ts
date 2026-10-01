import { isMockDataMode } from '@/lib/config';
import { isFirebaseAdminConfigured, adminAuth } from '@/lib/server/firebase-admin';
import type { DecodedIdToken } from 'firebase-admin/auth';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 401,
    public retryable = false,
  ) {
    super(message);
  }
}

export async function verifyBearerToken(
  authorization: string | null,
): Promise<DecodedIdToken | null> {
  if (isMockDataMode()) {
    return null;
  }

  if (!authorization?.startsWith('Bearer ')) {
    throw new ApiError('AUTH', 'ログインが必要です', 401);
  }

  if (!isFirebaseAdminConfigured()) {
    throw new ApiError('INTERNAL', 'サーバー認証が未設定です', 503);
  }

  const token = authorization.slice('Bearer '.length);
  try {
    return await adminAuth().verifyIdToken(token);
  } catch {
    throw new ApiError('AUTH', 'セッションが無効です。再度ログインしてください。', 401);
  }
}

export function newRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
