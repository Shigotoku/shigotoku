import type { Request, Response, NextFunction } from "express";
import { getAuth } from "firebase-admin/auth";

export type AuthedRequest = Request & { uid?: string };

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const decoded = await getAuth().verifyIdToken(header.slice(7));
    req.uid = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
