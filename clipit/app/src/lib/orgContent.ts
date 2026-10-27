/** 組織変数 {{キー}} を展開 */
export function applyOrgVariables(text: string, variables?: Record<string, string>): string {
  if (!variables || !text) return text;
  return text.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => variables[key.trim()] ?? `{{${key}}}`);
}

export interface OrgSnippet {
  id: string;
  name: string;
  body: string;
}

/** 共通パーツ {{snippet:ID}} を展開 */
export function applySnippets(text: string, snippets?: OrgSnippet[]): string {
  if (!snippets?.length || !text) return text;
  return text.replace(/\{\{snippet:([^}]+)\}\}/g, (_, id: string) => {
    const s = snippets.find((x) => x.id === id.trim());
    return s?.body ?? `{{snippet:${id}}}`;
  });
}

export function expandOrgContent(
  text: string,
  vars?: Record<string, string>,
  snippets?: OrgSnippet[],
): string {
  return applySnippets(applyOrgVariables(text, vars), snippets);
}

export function parseVariablesText(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([^=:]+)[=:](.+)$/);
    if (m) out[m[1]!.trim()] = m[2]!.trim();
  }
  return out;
}

export function formatVariablesText(vars?: Record<string, string>): string {
  if (!vars) return '';
  return Object.entries(vars)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
}

export const DEFAULT_VARIABLES: Record<string, string> = {
  会社名: '（会社名を設定）',
  問い合わせ先: 'support@example.com',
  受付時間: '平日 9:00〜18:00',
};

export const DEFAULT_SNIPPETS: OrgSnippet[] = [
  {
    id: 'contact',
    name: '問い合わせ先ブロック',
    body: 'お問い合わせは {{問い合わせ先}} までご連絡ください。受付時間は {{受付時間}} です。',
  },
  {
    id: 'privacy',
    name: '個人情報の取り扱い',
    body: '画面に患者名・ID・電話番号が映る場合は、必ず黒塗りしてから共有・印刷してください。',
  },
];
