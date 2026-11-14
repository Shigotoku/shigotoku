import type { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';

export interface AuthedRequest extends Request {
  uid?: string;
  rawBody?: Buffer;
}

/** 匿名ログイン・メール未確認のパスワード登録は利用不可（Google 等のプロバイダは確認済みメールで届く） */
function rejectReason(decoded: { firebase?: { sign_in_provider?: string }; email_verified?: boolean }): string | null {
  const provider = decoded.firebase?.sign_in_provider;
  if (provider === 'anonymous') return 'anonymous';
  if (provider === 'password' && decoded.email_verified !== true) return 'email_unverified';
  return null;
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'ログインが必要です' });
    return;
  }

  try {
    const token = header.slice(7);
    const decoded = await getAuth().verifyIdToken(token);
    const bad = rejectReason(decoded);
    if (bad) {
      res.status(403).json({
        code: bad,
        error:
          bad === 'anonymous'
            ? '匿名ログインは利用できません。Google またはメールアドレスでログインしてください'
            : 'メールアドレスが未確認です。確認メールのリンクを開いてから、もう一度ログインしてください',
      });
      return;
    }
    req.uid = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: '認証トークンが無効です' });
  }
}

export async function optionalAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  if (header?.startsWith('Bearer ')) {
    try {
      const decoded = await getAuth().verifyIdToken(header.slice(7));
      if (!rejectReason(decoded)) req.uid = decoded.uid;
    } catch {
      // ignore invalid token
    }
  }
  next();
}
