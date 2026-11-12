/**
 * PreDeck API（AI 中継）クライアント。送るのはテキストだけ。
 * 認証トークンは Firebase Auth 導入後に setTokenProvider で差し込む。
 */
const BASE = (import.meta.env.VITE_PREDECK_API_URL as string | undefined) ?? "/api";
const BYOK_KEY = "predeck.byokGeminiKey";

let tokenProvider: () => Promise<string | null> = async () => null;
export function setTokenProvider(fn: () => Promise<string | null>) {
  tokenProvider = fn;
}

/** 自分の API キー（BYOK）。この端末の localStorage にのみ保存。 */
export function getByokKey(): string {
  return localStorage.getItem(BYOK_KEY) ?? "";
}
export function setByokKey(key: string) {
  if (key) localStorage.setItem(BYOK_KEY, key);
  else localStorage.removeItem(BYOK_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = await tokenProvider();
  if (token) headers.Authorization = `Bearer ${token}`;
  const byok = getByokKey();
  if (byok) headers["x-user-gemini-key"] = byok;
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? "AI の呼び出しに失敗しました", data.code);
  return data as T;
}

export type Common = { purpose?: string; durationMin?: number; glossary?: string[] };

export const improveScript = (text: string, o: Common = {}) =>
  post<{ improved: string; notes: string[]; byok: boolean }>("/v1/ai/improve", { text, ...o });

export const toEnglish = (text: string, o: Common = {}) =>
  post<{ english: string; pronunciationTips: string[] }>("/v1/ai/english", { text, ...o });

export const reviewScript = (text: string, o: Common = {}) =>
  post<{ structure: string[]; clarity: string[]; likelyQuestions: string[]; estimatedMinutes: number }>(
    "/v1/ai/review",
    { text, ...o },
  );
