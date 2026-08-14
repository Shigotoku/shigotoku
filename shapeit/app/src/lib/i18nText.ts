/** I18N-003: 原文言語検出 + 管理者向け翻訳要約（ルールベース） */
export function detectLanguage(text: string): "ja" | "en" | "unknown" {
  const jp = (text.match(/[\u3040-\u30ff\u4e00-\u9faf]/g) || []).length;
  const en = (text.match(/[A-Za-z]/g) || []).length;
  if (jp > en * 0.5 && jp > 2) return "ja";
  if (en > jp * 2 && en > 8) return "en";
  return "unknown";
}

export function translateSummaryForAdmin(rawText: string, adminLocale: "ja" | "en"): string {
  const lang = detectLanguage(rawText);
  if (lang === adminLocale || lang === "unknown") {
    return rawText.slice(0, 160);
  }
  if (adminLocale === "en" && lang === "ja") {
    return `[JA→EN summary] ${rawText.slice(0, 120)}`;
  }
  if (adminLocale === "ja" && lang === "en") {
    return `【EN→JA要約】${rawText.slice(0, 120)}`;
  }
  return rawText.slice(0, 160);
}
