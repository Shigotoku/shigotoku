import type { TranslateEngine, TranslatePair } from "./types";

const KEY = "predeck.localTranslate";

export interface LocalTranslateConfig {
  /** OpenAI 互換 API のベース URL（既定: Ollama） */
  baseUrl: string;
  /** PLaMo 等のモデル名。サーバー側に登録した名前を入れる */
  model: string;
}

export const DEFAULT_LOCAL_CONFIG: LocalTranslateConfig = {
  baseUrl: "http://127.0.0.1:11434/v1",
  model: "plamo-3",
};

/** ループバック以外は拒否（Strict Local: ADR-025/026 と同じ方針）。 */
export function isLoopbackUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h === "127.0.0.1" || h === "localhost" || h === "[::1]" || h === "::1";
  } catch {
    return false;
  }
}

export function loadLocalConfig(): LocalTranslateConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const c = { ...DEFAULT_LOCAL_CONFIG, ...(JSON.parse(raw) as Partial<LocalTranslateConfig>) };
      if (isLoopbackUrl(c.baseUrl)) return c;
    }
  } catch {
    /* 壊れた設定は無視して既定値 */
  }
  return DEFAULT_LOCAL_CONFIG;
}

export function saveLocalConfig(c: LocalTranslateConfig): void {
  if (!isLoopbackUrl(c.baseUrl)) throw new Error("ローカル（127.0.0.1 / localhost）の URL だけ指定できます");
  localStorage.setItem(KEY, JSON.stringify(c));
}

export function buildMessages(text: string, context: TranslatePair[], glossary?: string[]) {
  const sys = [
    "You are a simultaneous interpreter for scientific and medical presentations.",
    "Translate the Japanese segment into natural spoken English that is easy to say aloud.",
    "Keep numbers, units and proper nouns. Use standard international terminology.",
    "Use the previous segments only for context (consistent terminology, omitted subjects). Do NOT repeat them.",
    "Output ONLY the English translation of the final segment. No notes, no quotes.",
    glossary?.length ? `Preferred terms: ${glossary.slice(0, 80).join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const ctx = context.length
    ? "Previous segments:\n" + context.map((p) => `JA: ${p.ja}\nEN: ${p.en}`).join("\n") + "\n\n"
    : "";
  return [
    { role: "system", content: sys },
    { role: "user", content: `${ctx}Translate this segment:\n${text}` },
  ];
}

/** 余計な前置き・引用符を落とす（小型モデル対策）。 */
export function cleanOutput(s: string): string {
  return s
    .replace(/^\s*(EN|English|Translation)\s*[:：]\s*/i, "")
    .replace(/^["“「]|["”」]$/g, "")
    .trim();
}

export function createLocalEngine(getConfig: () => LocalTranslateConfig = loadLocalConfig): TranslateEngine {
  return {
    id: "local-openai-compat",
    label: "ローカル翻訳（PLaMo 等）",
    textLeavesDevice: false,
    async translate(text, context, opts) {
      const cfg = getConfig();
      if (!isLoopbackUrl(cfg.baseUrl)) throw new Error("ローカル翻訳の URL が不正です");
      const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: opts?.signal,
        body: JSON.stringify({
          model: cfg.model,
          messages: buildMessages(text, context.slice(-3), opts?.glossary),
          temperature: 0.2,
          max_tokens: 400,
          stream: false,
        }),
      });
      if (!res.ok) throw new Error(`ローカル翻訳サーバーのエラー (${res.status})`);
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const out = data.choices?.[0]?.message?.content;
      if (!out) throw new Error("ローカル翻訳の応答が空でした");
      return cleanOutput(out);
    },
  };
}
