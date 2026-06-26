/** 作成導線の ?folder= クエリから folderId を取得 */
export function folderIdFromSearch(params: URLSearchParams): string | null {
  const f = params.get('folder');
  if (!f || f === 'all' || f === 'none') return null;
  return f;
}

export function appendFolderQuery(path: string, folderId: string | null): string {
  if (!folderId) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}folder=${encodeURIComponent(folderId)}`;
}

/** folder + layout クエリを付与 */
export function appendCreateQuery(path: string, folderId: string | null, layoutId?: string): string {
  let out = appendFolderQuery(path, folderId);
  if (layoutId) {
    const sep = out.includes('?') ? '&' : '?';
    out = `${out}${sep}layout=${encodeURIComponent(layoutId)}`;
  }
  return out;
}
