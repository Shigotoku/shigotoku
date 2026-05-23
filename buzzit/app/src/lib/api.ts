export const API_BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

let authTokenGetter: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(fn: () => Promise<string | null>) {
  authTokenGetter = fn;
}

async function authHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...extra };
  if (authTokenGetter) {
    const token = await authTokenGetter();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await authHeaders({
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  });

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = await authHeaders(init?.headers as Record<string, string>);
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

export function bootstrapAuth(email?: string, displayName?: string) {
  return request<{ uid: string; plan: string }>('/v1/auth/bootstrap', {
    method: 'POST',
    body: JSON.stringify({ email, displayName }),
  });
}

export interface DashboardResponse {
  metrics: {
    healthScore: number;
    healthTrend: number;
    reachRating: string;
    clickRating: string;
    funnel: { posts: number; reach: number; clicks: number; lineSignups: number; revenue: number };
    mission: { title: string; description: string };
  };
  plan: string;
}

export function fetchDashboard() {
  return request<DashboardResponse>('/v1/dashboard');
}

export interface AnalyticsResponse {
  metrics: {
    reach: number;
    saveRate: number;
    shareRate: number;
    clickRate: number;
    lineFriends: number;
    estimatedRevenue: number;
  };
  topPosts: Array<{ id: string; title: string; reach: number; revenue: number }>;
}

export function fetchAnalytics() {
  return request<AnalyticsResponse>('/v1/analytics');
}

export interface SettingsResponse {
  uid: string;
  plan: string;
  slackWebhookUrl?: string;
  ayrshareProfileKey?: string;
  autoModeEnabled?: boolean;
  slackTeamId?: string;
  snsConnections: Array<{ name: string; connected: boolean }>;
  canUseSlack: boolean;
  canUseAutoMode: boolean;
}

export function fetchSettings() {
  return request<SettingsResponse>('/v1/settings');
}

export function updateSettings(patch: Partial<SettingsResponse>) {
  return request<SettingsResponse>('/v1/settings', {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

export interface RepurposeApiRequest {
  idea: string;
  plan: string;
  mediaUrls?: string[];
}

export interface RepurposeApiResponse {
  results: Array<{
    platform: string;
    label: string;
    content: string;
    carouselSlides?: string[];
  }>;
  usedGemini?: boolean;
  safetyViolations?: string[];
}

export function repurposeViaApi(body: RepurposeApiRequest) {
  return request<RepurposeApiResponse>('/v1/repurpose', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export interface ScheduleApiRequest {
  contents: Array<{ platform: string; label: string; content: string }>;
  scheduledAt: string;
}

export function scheduleViaApi(body: ScheduleApiRequest) {
  return request<{ success: boolean; message: string }>('/v1/schedule', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function submitSlackIdea(text: string, author?: string) {
  return request<{ id: string; scriptPreview: string }>('/v1/slack/ideas', {
    method: 'POST',
    body: JSON.stringify({ text, author }),
  });
}

export function fetchSlackIdeas() {
  return request<{ ideas: Array<{ id: string; text: string; author: string; scriptPreview: string; status: string }> }>(
    '/v1/slack/ideas',
  );
}

export function approveSlackIdea(id: string) {
  return request<{ success: boolean }>(`/v1/slack/ideas/${id}/approve`, { method: 'POST' });
}

export function runAutoMode() {
  return request<{ mission: { title: string; description: string } }>('/v1/auto-mode/run', {
    method: 'POST',
  });
}

export function trackMetricEvent(event: 'reach' | 'click' | 'line_signup' | 'revenue', value: number) {
  return request<{ success: boolean }>('/v1/metrics/event', {
    method: 'POST',
    body: JSON.stringify({ event, value }),
  });
}
