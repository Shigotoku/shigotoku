import type { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';

export interface AuthedRequest extends Request {
  uid?: string;
  rawBody?: Buffer;
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
      req.uid = decoded.uid;
    } catch {
      // ignore invalid token
    }
  }
  next();
}
