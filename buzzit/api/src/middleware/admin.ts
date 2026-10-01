import type { Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import type { AuthedRequest } from './auth';

const DEFAULT_ADMIN_EMAILS = ['r.tokunaga@meditoku.com'];

function adminEmails(): string[] {
  const env = process.env.BUZZIT_ADMIN_EMAILS;
  if (env) {
    return env.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  }
  return DEFAULT_ADMIN_EMAILS.map((e) => e.toLowerCase());
}

export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.uid) {
    res.status(401).json({ error: 'ログインが必要です' });
    return;
  }

  try {
    const user = await getAuth().getUser(req.uid);
    const email = user.email?.toLowerCase();
    if (!email || !adminEmails().includes(email)) {
      res.status(403).json({ error: '管理者権限が必要です' });
      return;
    }
    next();
  } catch {
    res.status(403).json({ error: '管理者権限の確認に失敗しました' });
  }
}

export async function isAdminUid(uid: string): Promise<boolean> {
  try {
    const user = await getAuth().getUser(uid);
    const email = user.email?.toLowerCase();
    return !!email && adminEmails().includes(email);
  } catch {
    return false;
  }
}
