import { auth } from './firebase';

const API_BASE = (import.meta.env.VITE_API_URL ?? 'https://app.clipit.shigotoku.com/api').replace(/\/$/, '');

async function authHeaders(): Promise<HeadersInit> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('ログインが必要です');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...(await authHeaders()), ...init?.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `API error ${res.status}`);
  return data as T;
}

export async function checkApiHealth(): Promise<{ ok: boolean; gemini: boolean }> {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}
