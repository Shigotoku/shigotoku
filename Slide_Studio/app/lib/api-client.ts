'use client';

import type { BootstrapPayload } from '@deckit/domain';
import { getFirebaseAuth, isFirebaseClientConfigured } from '@/lib/firebase/client';
import { isMockDataMode } from '@/lib/config';

async function authHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!isMockDataMode() && isFirebaseClientConfigured) {
    const user = getFirebaseAuth().currentUser;
    if (user) {
      headers.Authorization = `Bearer ${await user.getIdToken()}`;
    }
  }

  return headers;
}

export async function fetchBootstrap(): Promise<BootstrapPayload> {
  const res = await fetch('/api/bootstrap', { headers: await authHeaders() });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `bootstrap failed: ${res.status}`);
  }
  return res.json() as Promise<BootstrapPayload>;
}

export async function createProjectApi(name: string, styleId?: string): Promise<{ id: string; name: string }> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: {
      ...(await authHeaders()),
      'Idempotency-Key': `create-project-${Date.now()}`,
    },
    body: JSON.stringify({ name, styleId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? 'プロジェクト作成に失敗しました');
  }
  return res.json() as Promise<{ id: string; name: string }>;
}

export async function fetchGoogleDriveStatus(): Promise<{ connected: boolean; message: string }> {
  const res = await fetch('/api/google/drive/status', { headers: await authHeaders() });
  if (!res.ok) {
    return { connected: false, message: '状態を取得できませんでした' };
  }
  return res.json() as Promise<{ connected: boolean; message: string }>;
}
