const API_BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export interface SignedUploadResponse {
  uploadUrl: string;
  storagePath: string;
  publicUrl: string;
}

export function getSignedUploadUrl(fileName: string, contentType: string, size: number) {
  return request<SignedUploadResponse>('/v1/upload/signed-url', {
    method: 'POST',
    body: JSON.stringify({ fileName, contentType, size }),
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

export function isApiConfigured(): boolean {
  return true;
}
