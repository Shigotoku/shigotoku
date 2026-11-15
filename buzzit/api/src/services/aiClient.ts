/**
 * AI 呼び出しの共通層。
 * - 運営AI（運営負担の Gemini・月間上限あり）と、ユーザー自身の AI キー（Gemini / OpenAI / Anthropic・上限なし）を
 *   ユーザーごとに切り替えられる。
 * - 既存の Gemini 形式のリクエスト/レスポンスをそのまま使えるよう、aiFetch は Gemini 形式で受け取り Gemini 形式で返す。
 * - キーは AES-256-GCM で暗号化し、クライアントから読めないコレクション（userAiKeys）にだけ保存する。
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import { getFirestore } from 'firebase-admin/firestore';

export type AiMode = 'platform' | 'own';
export type AiProvider = 'gemini' | 'openai' | 'anthropic';

export const AI_PROVIDERS: Record<AiProvider, { label: string; defaultModel: string }> = {
  gemini: { label: 'Google Gemini', defaultModel: 'gemini-2.0-flash' },
  openai: { label: 'OpenAI（ChatGPT）', defaultModel: 'gpt-4o-mini' },
  anthropic: { label: 'Anthropic（Claude）', defaultModel: 'claude-3-5-haiku-latest' },
};

interface Ctx {
  uid: string;
  own?: { provider: AiProvider; model: string; key: string };
}

const als = new AsyncLocalStorage<Ctx>();

interface StoredAi {
  mode?: AiMode;
  provider?: AiProvider;
  model?: string;
  enc?: { iv: string; tag: string; data: string };
  last4?: string;
  updatedAt?: string;
}

function encKey(): Buffer {
  const base = process.env.AI_KEY_SECRET || process.env.STRIPE_WEBHOOK_SECRET || '';
  if (!base) throw new Error('暗号化キー（AI_KEY_SECRET）が未設定です');
  return Buffer.from(hkdfSync('sha256', base, 'buzzit-ai-key', 'userAiKeys', 32));
}

function encrypt(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', encKey(), iv);
  const data = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return { iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), data: data.toString('base64') };
}

function decrypt(e: { iv: string; tag: string; data: string }): string {
  const d = createDecipheriv('aes-256-gcm', encKey(), Buffer.from(e.iv, 'base64'));
  d.setAuthTag(Buffer.from(e.tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(e.data, 'base64')), d.final()]).toString('utf8');
}

const doc = (uid: string) => getFirestore().doc(`userAiKeys/${uid}`);

const cache = new Map<string, { at: number; ctx: Ctx }>();

async function loadCtx(uid: string): Promise<Ctx> {
  const hit = cache.get(uid);
  if (hit && Date.now() - hit.at < 60_000) return hit.ctx;
  let ctx: Ctx = { uid };
  try {
    const s = (await doc(uid).get()).data() as StoredAi | undefined;
    if (s?.mode === 'own' && s.enc && s.provider) {
      ctx = { uid, own: { provider: s.provider, model: s.model || AI_PROVIDERS[s.provider].defaultModel, key: decrypt(s.enc) } };
    }
  } catch (e) {
    console.warn('ai settings load failed', e);
  }
  cache.set(uid, { at: Date.now(), ctx });
  return ctx;
}

/** このユーザーの AI 設定を有効にして fn を実行（認証ミドルウェア・スケジューラから使う） */
export async function withUserAi<T>(uid: string, fn: () => T | Promise<T>): Promise<T> {
  const ctx = await loadCtx(uid);
  return als.run(ctx, fn);
}

export function usingOwnAi(): boolean {
  return !!als.getStore()?.own;
}

/** 使える AI があるか（旧 process.env.GEMINI_API_KEY の代わり）。truthy/falsy で判定する */
export function aiKey(): string | undefined {
  return als.getStore()?.own?.key || process.env.GEMINI_API_KEY || undefined;
}

type GeminiPart = { text?: string; inline_data?: unknown };
interface GeminiBody {
  contents: Array<{ parts: GeminiPart[] }>;
  generationConfig?: { temperature?: number; maxOutputTokens?: number };
}

function geminiResponse(text: string): Response {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function callProvider(provider: AiProvider, model: string, key: string, body: GeminiBody): Promise<Response> {
  const gc = body.generationConfig ?? {};
  const parts = body.contents.flatMap((c) => c.parts);
  if (provider === 'gemini') {
    return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }
  if (parts.some((p) => p.inline_data)) {
    return new Response(JSON.stringify({ error: 'この機能（音声）は Gemini のキーでのみ利用できます' }), { status: 400 });
  }
  const text = parts.map((p) => p.text ?? '').join('\n');
  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: text }],
        temperature: gc.temperature,
        max_tokens: gc.maxOutputTokens,
      }),
    });
    if (!res.ok) return res;
    const d = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return geminiResponse(d.choices?.[0]?.message?.content ?? '');
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model,
      max_tokens: gc.maxOutputTokens ?? 1024,
      temperature: gc.temperature,
      messages: [{ role: 'user', content: text }],
    }),
  });
  if (!res.ok) return res;
  const d = (await res.json()) as { content?: Array<{ text?: string }> };
  return geminiResponse(d.content?.map((c) => c.text ?? '').join('') ?? '');
}

/** Gemini 形式のリクエストを、現在のユーザー設定の AI に送り、Gemini 形式のレスポンスで返す */
export async function aiFetch(init: { method?: string; headers?: Record<string, string>; body: string }): Promise<Response> {
  const own = als.getStore()?.own;
  const body = JSON.parse(init.body) as GeminiBody;
  if (own) return callProvider(own.provider, own.model, own.key, body);
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('AI が設定されていません');
  return callProvider('gemini', AI_PROVIDERS.gemini.defaultModel, key, body);
}

// ---- 設定の取得・保存 ----

export interface AiSettingsView {
  mode: AiMode;
  provider: AiProvider;
  model: string;
  hasKey: boolean;
  last4?: string;
}

export async function getAiSettings(uid: string): Promise<AiSettingsView> {
  const s = ((await doc(uid).get()).data() ?? {}) as StoredAi;
  const provider = s.provider ?? 'gemini';
  return {
    mode: s.mode === 'own' && s.enc ? 'own' : 'platform',
    provider,
    model: s.model || AI_PROVIDERS[provider].defaultModel,
    hasKey: !!s.enc,
    last4: s.last4,
  };
}

/** キーが実際に使えるか小さなリクエストで確認する */
async function verifyKey(provider: AiProvider, model: string, key: string): Promise<string | null> {
  try {
    const res = await callProvider(provider, model, key, {
      contents: [{ parts: [{ text: '「OK」とだけ返してください。' }] }],
      generationConfig: { maxOutputTokens: 16, temperature: 0 },
    });
    if (res.ok) return null;
    if (res.status === 401 || res.status === 403 || res.status === 400) return 'APIキーが正しくないか、権限がありません';
    if (res.status === 404) return 'モデル名が見つかりません';
    if (res.status === 429) return null; // キー自体は有効（利用枠の都合）
    return `キーの確認に失敗しました（HTTP ${res.status}）`;
  } catch {
    return 'キーの確認に失敗しました（通信エラー）';
  }
}

export async function saveAiSettings(
  uid: string,
  input: { mode: AiMode; provider?: AiProvider; model?: string; apiKey?: string },
): Promise<AiSettingsView> {
  const cur = ((await doc(uid).get()).data() ?? {}) as StoredAi;
  const provider = input.provider && input.provider in AI_PROVIDERS ? input.provider : cur.provider ?? 'gemini';
  const model = (input.model ?? '').trim() || AI_PROVIDERS[provider].defaultModel;
  const patch: StoredAi = { mode: input.mode, provider, model, updatedAt: new Date().toISOString() };

  const newKey = input.apiKey?.trim();
  if (newKey) {
    const bad = await verifyKey(provider, model, newKey);
    if (bad) throw new Error(bad);
    patch.enc = encrypt(newKey);
    patch.last4 = newKey.slice(-4);
  } else if (input.mode === 'own') {
    if (!cur.enc) throw new Error('自分のAIを使うには、APIキーを入力してください');
    if (cur.provider && cur.provider !== provider) throw new Error('提供元を変えた場合は、新しいAPIキーを入力してください');
    const bad = await verifyKey(provider, model, decrypt(cur.enc));
    if (bad) throw new Error(`モデル名の変更後に確認できませんでした: ${bad}`);
  }
  await doc(uid).set(patch, { merge: true });
  cache.delete(uid);
  return getAiSettings(uid);
}

export async function deleteAiKey(uid: string): Promise<AiSettingsView> {
  const { FieldValue } = await import('firebase-admin/firestore');
  await doc(uid).set({ mode: 'platform', enc: FieldValue.delete(), last4: FieldValue.delete(), updatedAt: new Date().toISOString() }, { merge: true });
  cache.delete(uid);
  return getAiSettings(uid);
}
