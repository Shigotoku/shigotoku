import { translateSegment } from "@/lib/aiClient";
import type { TranslateEngine } from "./types";

/** クラウド（軽量 LLM）で 1 文ずつ訳す標準エンジン。テキストのみ送信する。 */
export function createCloudEngine(sessionId: string | null): TranslateEngine {
  return {
    id: "cloud-segment",
    label: "クラウド翻訳（標準）",
    textLeavesDevice: true,
    async translate(text, context, opts) {
      const r = await translateSegment(text, { sessionId, context: context.slice(-3), glossary: opts?.glossary });
      return r.english;
    },
  };
}
