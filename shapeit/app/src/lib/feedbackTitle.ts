const JP_STOP = new Set([
  "これ",
  "それ",
  "あれ",
  "この",
  "その",
  "よう",
  "こと",
  "ため",
  "など",
  "ます",
  "です",
  "ない",
  "ある",
  "いる",
  "する",
  "した",
  "して",
  "される",
  "られ",
  "から",
  "まで",
  "より",
  "とか",
  "けど",
  "でも",
  "ので",
  "には",
  "test",
  "the",
  "and",
  "for",
]);

/** 受信箱カード用: 本文から短いタイトル（重要語）を抽出 */
export function extractFeedbackTitle(rawText: string, aiTitle?: string | null): string {
  const text = rawText.trim();
  if (!text) return aiTitle?.trim() || "無題のフィードバック";

  const cleaned = text
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .trim();

  const line = cleaned.split(/[。．!?？\n]/)[0]?.trim() || cleaned;
  const tokens = line.match(/[一-龯ぁ-んァ-ンA-Za-z0-9]{2,}/g) ?? [];
  const picked: string[] = [];

  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (JP_STOP.has(token) || JP_STOP.has(lower)) continue;
    if (picked.includes(token)) continue;
    picked.push(token);
    if (picked.length >= 3) break;
  }

  if (picked.length >= 2) {
    const joined = picked.join("・");
    return joined.length > 42 ? `${joined.slice(0, 41)}…` : joined;
  }

  if (picked.length === 1) {
    const one = picked[0];
    const rest = line.replace(one, "").trim();
    const extra = rest.match(/[一-龯ぁ-んァ-ンA-Za-z0-9]{2,}/)?.[0];
    if (extra && !JP_STOP.has(extra)) {
      const joined = `${one}・${extra}`;
      return joined.length > 42 ? `${joined.slice(0, 41)}…` : joined;
    }
    return one.length > 42 ? `${one.slice(0, 41)}…` : one;
  }

  const slice = line.length > 40 ? `${line.slice(0, 39)}…` : line;
  if (slice) return slice;

  const fromAi = aiTitle?.trim();
  return fromAi || "無題のフィードバック";
}
