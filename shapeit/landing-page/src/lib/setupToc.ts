export type SetupTocItem = { id: string; label: string };

export type SetupTocChapter = {
  id: string;
  title: string;
  items?: SetupTocItem[];
};

export const setupToc: SetupTocChapter[] = [
  { id: 'overview', title: 'このページについて' },
  {
    id: 'before',
    title: 'はじめる前に',
    items: [
      { id: 'before-profile', label: 'Chrome プロファイル' },
      { id: 'before-google', label: 'Google アカウント' },
      { id: 'before-invite', label: '招待について' },
    ],
  },
  {
    id: 'login',
    title: 'ShapeIt にログインする',
    items: [
      { id: 'login-invited', label: '招待済みメンバー' },
      { id: 'login-admin', label: '初めての管理者' },
    ],
  },
  {
    id: 'extension',
    title: '拡張を開発者モードで入れる',
    items: [
      { id: 'ext-download', label: 'zip をダウンロード' },
      { id: 'ext-install', label: 'Chrome に読み込む' },
      { id: 'ext-update', label: '更新があったとき' },
    ],
  },
  {
    id: 'connect',
    title: '初回接続（1回だけ）',
    items: [
      { id: 'connect-google', label: 'Google で接続' },
      { id: 'connect-check', label: '接続の確認' },
    ],
  },
  {
    id: 'daily',
    title: '日常の使い方',
    items: [
      { id: 'daily-report', label: '画面から報告する' },
      { id: 'daily-shortcut', label: 'ショートカット' },
    ],
  },
  { id: 'troubleshoot', title: '困ったとき' },
];

export function setupTocItemCount() {
  return setupToc.reduce((n, ch) => n + (ch.items?.length ?? 0), 0);
}
