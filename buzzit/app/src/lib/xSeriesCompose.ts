/** サーバー composeTweetText と同じ結合ロジック（プレビュー用） */
export function composeTweetText(item: {
  text: string;
  tags?: string;
  title?: string;
  linkUrl?: string;
}): string {
  const parts: string[] = [item.text.trim()];
  if (item.tags?.trim()) parts.push(item.tags.trim());
  if (item.title?.trim() || item.linkUrl?.trim()) {
    parts.push('');
    if (item.title?.trim()) parts.push(item.title.trim());
    if (item.linkUrl?.trim()) parts.push(item.linkUrl.trim());
  }
  const normalized = parts.join('\n');
  if ([...normalized].length <= 280) return normalized;
  const chars = [...normalized];
  return `${chars.slice(0, 279).join('')}…`;
}

export function tweetCharCount(text: string): number {
  return [...text].length;
}
