/** 軽い処理（添削・分析）は最安クラス、英訳のみ一段上のモデル */
export const MODEL_LIGHT = "gemini-2.5-flash-lite";
export const MODEL_QUALITY = "gemini-2.5-flash";

export const MAX_INPUT_CHARS = 8000;
export const MAX_OUTPUT_TOKENS = 2048;

export function geminiUrl(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}
