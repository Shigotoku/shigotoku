/**
 * ShapeIt AI 用 Gemini モデル（トリアージは短い JSON → Lite で十分・最安寄り）
 * 変更時はここだけ更新し、API を再デプロイ。
 */
export const GEMINI_MODEL = "gemini-2.5-flash-lite";

export function geminiGenerateContentUrl(model = GEMINI_MODEL): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

/** トリアージ JSON 用の出力上限（コスト抑制） */
export const GEMINI_TRIAGE_MAX_OUTPUT_TOKENS = 512;
