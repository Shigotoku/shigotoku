/** 組織用語辞書のデフォルト（医療・中小・SaaS） */
export const DEFAULT_TERM_GLOSSARY = [
  'ClipIt',
  'クリッピット',
  'WebORCA',
  'CLIUS',
  'レセコン',
  '受付リスト',
  '生活習慣病管理料',
  '外来データ提出加算',
  '特定健診',
  'Google Meet',
  'Google Workspace',
  'freee',
  'マネーフォワード',
  'SmartHR',
];

export function parseGlossaryText(text: string): string[] {
  return [...new Set(text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))];
}

export function formatGlossaryLines(terms?: string[]): string {
  return (terms?.length ? terms : DEFAULT_TERM_GLOSSARY).join('\n');
}
