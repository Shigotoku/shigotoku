/**
 * 保存先(Google Drive)の指定。
 * - auto:   WrapIt 専用フォルダを自動作成（既定）
 * - shared: ユーザー/組織が指定した共有フォルダ
 *
 * 注意: OAuth スコープ drive.file では「アプリが作成した or Picker で選択された」ファイルにしか
 * アクセスできない。本番で shared を使う場合は URL 貼り付けではなく Google Picker での選択が必要。
 * ここでの URL 解析は入力補助・表示・モック用。
 */

export type WorkspaceMode = 'auto' | 'shared';

export interface WorkspaceTarget {
  mode: WorkspaceMode;
  folderId?: string;
  folderUrl?: string;
}

export const DEFAULT_WORKSPACE_TARGET: WorkspaceTarget = { mode: 'auto' };

const ID_RE = /^[A-Za-z0-9_-]{10,}$/;

/**
 * Drive フォルダの URL または ID からフォルダ ID を取り出す。解釈できなければ null。
 * 対応: /drive/folders/<id>, /drive/u/0/folders/<id>, ?id=<id>, ID 単体
 */
export function parseDriveFolderInput(input: string): { id: string; url: string } | null {
  const raw = input.trim();
  if (!raw) return null;

  if (ID_RE.test(raw)) {
    return { id: raw, url: `https://drive.google.com/drive/folders/${raw}` };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.hostname !== 'drive.google.com') return null;

  const m = url.pathname.match(/\/folders\/([A-Za-z0-9_-]+)/);
  const id = m?.[1] ?? url.searchParams.get('id') ?? '';
  if (!ID_RE.test(id)) return null;
  return { id, url: `https://drive.google.com/drive/folders/${id}` };
}

export function resolveWorkspaceTarget(mode: WorkspaceMode, folderInput?: string): WorkspaceTarget | null {
  if (mode === 'auto') return { mode: 'auto' };
  const parsed = parseDriveFolderInput(folderInput ?? '');
  if (!parsed) return null;
  return { mode: 'shared', folderId: parsed.id, folderUrl: parsed.url };
}
