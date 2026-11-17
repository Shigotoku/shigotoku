/**
 * PreDeck API — AI 中継のみ。スライド画像・音声は受け取らず、テキストだけを LLM に渡す。
 * リクエスト／レスポンス本文は保存・ログ出力しない。
 */
import cors from "cors";
import express from "express";
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { requireAuth, type AuthedRequest } from "./middleware/auth";
import { MAX_INPUT_CHARS, MODEL_LIGHT, MODEL_QUALITY } from "./config/gemini";
import { AiError, generateJson } from "./services/gemini";
import { englishPrompt, improvePrompt, reviewPrompt, segmentPrompt } from "./services/prompts";
import { consumeQuota, consumeSegment, SESSION_MAX_SEGMENTS, startSession } from "./services/quota";

if (!getApps().length) initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "64kb" })); // テキスト専用。大きな本文（画像等）は受け付けない

const api = express.Router();

api.get("/health", (_req, res) => {
  res.json({ ok: true, service: "predeck-api", gemini: Boolean(process.env.GEMINI_API_KEY) });
});

function readText(body: unknown): string | null {
  const t = (body as { text?: unknown } | undefined)?.text;
  if (typeof t !== "string" || !t.trim()) return null;
  return t.slice(0, MAX_INPUT_CHARS);
}
function strList(v: unknown): string[] | undefined {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 80) : undefined;
}

/**
 * 利用者自身の API キー（BYOK）があればそれを使い、無料枠を消費しない。
 * キーは保存・ログ出力しない。
 */
function resolveKey(req: AuthedRequest): { key: string; byok: boolean } | null {
  const own = req.headers["x-user-gemini-key"];
  if (typeof own === "string" && own.length > 20) return { key: own, byok: true };
  const shared = process.env.GEMINI_API_KEY;
  return shared ? { key: shared, byok: false } : null;
}

function handler(model: string, build: (body: Record<string, unknown>, text: string) => string) {
  return async (req: AuthedRequest, res: express.Response) => {
    const text = readText(req.body);
    if (!text) {
      res.status(400).json({ error: "text が必要です" });
      return;
    }
    const k = resolveKey(req);
    if (!k) {
      res.status(503).json({ error: "AI が設定されていません" });
      return;
    }
    try {
      if (!k.byok) {
        const q = await consumeQuota(req.uid!);
        if (!q.ok) {
          res.status(429).json({ error: "本日の無料枠を使い切りました", code: "quota" });
          return;
        }
      }
      const prompt = build(req.body as Record<string, unknown>, text);
      const result = await generateJson<Record<string, unknown>>({ model, prompt, apiKey: k.key });
      res.json({ ...result, model, byok: k.byok });
    } catch (e) {
      if (e instanceof AiError) res.status(e.status).json({ error: e.message });
      else res.status(500).json({ error: "サーバーエラー" }); // 詳細・本文は出力しない
    }
  };
}

type Body = { purpose?: string; durationMin?: number; glossary?: unknown };
const opt = (b: Record<string, unknown>) => b as Body;

api.post("/v1/ai/improve", requireAuth, handler(MODEL_LIGHT, (b, text) =>
  improvePrompt({ text, purpose: opt(b).purpose, durationMin: opt(b).durationMin, glossary: strList(opt(b).glossary) })));

api.post("/v1/ai/english", requireAuth, handler(MODEL_QUALITY, (b, text) =>
  englishPrompt({ text, purpose: opt(b).purpose, glossary: strList(opt(b).glossary) })));

api.post("/v1/ai/review", requireAuth, handler(MODEL_LIGHT, (b, text) =>
  reviewPrompt({ text, purpose: opt(b).purpose, durationMin: opt(b).durationMin })));

/** 同時通訳セッション開始。無料枠を 1 回消費（BYOK は消費しない）。 */
api.post("/v1/ai/session/start", requireAuth, async (req: AuthedRequest, res) => {
  if (!resolveKey(req)) {
    res.status(503).json({ error: "AI が設定されていません" });
    return;
  }
  if (typeof req.headers["x-user-gemini-key"] === "string" && (req.headers["x-user-gemini-key"] as string).length > 20) {
    res.json({ sessionId: null, byok: true });
    return;
  }
  try {
    const s = await startSession(req.uid!);
    if (!s.ok) {
      res.status(429).json({ error: "本日の無料枠を使い切りました", code: "quota" });
      return;
    }
    res.json({ sessionId: s.sessionId, byok: false, maxSegments: SESSION_MAX_SEGMENTS });
  } catch {
    res.status(500).json({ error: "サーバーエラー" });
  }
});

/** 1 文の逐次翻訳（軽量モデル）。無料枠はセッション開始時に消費済み。 */
api.post("/v1/ai/translate-segment", requireAuth, async (req: AuthedRequest, res) => {
  const text = readText(req.body);
  if (!text) {
    res.status(400).json({ error: "text が必要です" });
    return;
  }
  const k = resolveKey(req);
  if (!k) {
    res.status(503).json({ error: "AI が設定されていません" });
    return;
  }
  const b = req.body as { sessionId?: unknown; context?: unknown; glossary?: unknown };
  try {
    if (!k.byok) {
      if (typeof b.sessionId !== "string") {
        res.status(400).json({ error: "sessionId が必要です" });
        return;
      }
      const c = await consumeSegment(req.uid!, b.sessionId);
      if (!c.ok) {
        res.status(c.reason === "limit" ? 429 : 400).json({
          error: c.reason === "limit" ? "このセッションの上限に達しました" : "セッションが無効です",
          code: c.reason === "limit" ? "session-limit" : "session-invalid",
        });
        return;
      }
    }
    const context = Array.isArray(b.context)
      ? b.context
          .filter((p): p is { ja: string; en: string } => typeof p?.ja === "string" && typeof p?.en === "string")
          .slice(-3)
          .map((p) => ({ ja: p.ja.slice(0, 500), en: p.en.slice(0, 800) }))
      : [];
    const prompt = segmentPrompt({ text: text.slice(0, 1000), context, glossary: strList(b.glossary) });
    const r = await generateJson<{ english?: string }>({ model: MODEL_LIGHT, prompt, apiKey: k.key });
    if (typeof r.english !== "string" || !r.english.trim()) {
      res.status(502).json({ error: "AI の応答を解釈できませんでした" });
      return;
    }
    res.json({ english: r.english.trim() });
  } catch (e) {
    if (e instanceof AiError) res.status(e.status).json({ error: e.message });
    else res.status(500).json({ error: "サーバーエラー" });
  }
});

app.use("/api", api);
app.use("/", api);

export const predeckApi = onRequest(
  { region: "asia-northeast1", memory: "256MiB", timeoutSeconds: 60, secrets: ["GEMINI_API_KEY"] },
  app,
);
