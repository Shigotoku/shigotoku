"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GEMINI_TRIAGE_MAX_OUTPUT_TOKENS = exports.GEMINI_MODEL = void 0;
exports.geminiGenerateContentUrl = geminiGenerateContentUrl;
/**
 * ShapeIt AI 用 Gemini モデル（トリアージは短い JSON → Lite で十分・最安寄り）
 * 変更時はここだけ更新し、API を再デプロイ。
 */
exports.GEMINI_MODEL = "gemini-2.5-flash-lite";
function geminiGenerateContentUrl(model = exports.GEMINI_MODEL) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}
/** トリアージ JSON 用の出力上限（コスト抑制） */
exports.GEMINI_TRIAGE_MAX_OUTPUT_TOKENS = 512;
