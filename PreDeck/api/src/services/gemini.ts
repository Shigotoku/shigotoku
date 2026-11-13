import { geminiUrl, MAX_OUTPUT_TOKENS } from "../config/gemini";

export class AiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Gemini に JSON を生成させる。
 * 注意: プロンプト・応答の本文をログに出さない（保存しない方針）。
 */
export async function generateJson<T>(opts: { model: string; prompt: string; apiKey: string }): Promise<T> {
  const res = await fetch(`${geminiUrl(opts.model)}?key=${encodeURIComponent(opts.apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: opts.prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!res.ok) throw new AiError(res.status === 429 ? 429 : 502, "AI サービスでエラーが発生しました");
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new AiError(502, "AI の応答が空でした");
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new AiError(502, "AI の応答を解釈できませんでした");
  }
}
