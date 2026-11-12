import { loadEnvConfig } from '@next/env';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { getApps, initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';

loadEnvConfig(process.cwd());
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function resolveCredentialsPath(): string | undefined {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!raw) return undefined;

  const candidates: string[] = [];
  if (path.isAbsolute(raw)) {
    candidates.push(raw);
  } else {
    const cwd = process.cwd();
    candidates.push(path.join(cwd, raw));
    candidates.push(path.join(cwd, raw.replace(/^\.\//, '')));
  }

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

function projectId(): string | undefined {
  return process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
}

function initAdmin() {
  if (getApps().length) return getApps()[0]!;

  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (saJson) {
    const parsed = JSON.parse(saJson) as { project_id?: string };
    return initializeApp({
      credential: cert(JSON.parse(saJson)),
      projectId: projectId() ?? parsed.project_id,
    });
  }

  const credPath = resolveCredentialsPath();
  if (credPath) {
    const parsed = JSON.parse(readFileSync(credPath, 'utf8')) as ServiceAccount;
    const pid =
      projectId() ??
      (typeof parsed.projectId === 'string' ? parsed.projectId : undefined) ??
      (parsed as { project_id?: string }).project_id;
    return initializeApp({
      credential: cert(parsed),
      projectId: pid,
    });
  }

  throw new Error(
    'Firebase Admin is not configured (FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS)',
  );
}

export function isFirebaseAdminConfigured(): boolean {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return true;
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) return false;
  if (!projectId()) return false;
  try {
    const credPath = resolveCredentialsPath();
    if (!credPath) return false;
    readFileSync(credPath, 'utf8');
    return true;
  } catch {
    return false;
  }
}

export function adminAuth() {
  initAdmin();
  return getAuth();
}

export function adminDb() {
  initAdmin();
  return getFirestore();
}
