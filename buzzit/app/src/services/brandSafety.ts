const NG_WORDS = [
  '完全治癒',
  '必ず治る',
  '100%効果',
  '副作用なし',
  '医師推奨',
  '薬局',
  '処方',
  '痩せる',
  'ダイエット効果',
  '永久脱毛',
];

export interface BrandSafetyResult {
  safe: boolean;
  violations: string[];
}

export function checkBrandSafety(text: string): BrandSafetyResult {
  const violations = NG_WORDS.filter((word) => text.includes(word));
  return { safe: violations.length === 0, violations };
}

export function sanitizeForSalon(text: string): string {
  return text
    .replace(/完全治癒/g, 'ケア')
    .replace(/必ず治る/g, '改善を目指す')
    .replace(/100%効果/g, '期待できる変化');
}
