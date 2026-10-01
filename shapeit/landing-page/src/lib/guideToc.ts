export type GuideTocItem = { id: string; label: string };

export type GuideTocChapter = {
  id: string;
  title: string;
  items?: GuideTocItem[];
};

export const guideToc: GuideTocChapter[] = [
  { id: 'about', title: 'ShapeIt とは' },
  {
    id: 'prepare',
    title: '作業前の準備',
    items: [
      { id: 'prepare-checklist', label: '1. 必要なもの' },
      { id: 'prepare-signup', label: '2. 会社を登録する（管理者）' },
      { id: 'prepare-google', label: '3. Google アカウントで登録する理由' },
    ],
  },
  {
    id: 'invite',
    title: 'メンバーを招待する',
    items: [
      { id: 'invite-create', label: '4. 招待リンクを作成する' },
      { id: 'invite-join', label: '5. メンバーが参加する' },
    ],
  },
  {
    id: 'account',
    title: 'アカウントと Chrome 拡張',
    items: [
      { id: 'account-basics', label: '拡張は何と連携する？' },
      { id: 'account-pattern-google', label: 'Google で登録する（推奨）' },
      { id: 'account-pattern-email', label: 'メールで登録した場合' },
      { id: 'account-chrome-profile', label: 'Chrome のプロファイルが複数ある' },
      { id: 'account-reconnect', label: 'つながらないとき' },
    ],
  },
  {
    id: 'ui',
    title: '画面の見方',
    items: [
      { id: 'ui-sidebar', label: '6. サイドバーとメインメニュー' },
      { id: 'ui-settings', label: '7. 設定画面を開く' },
    ],
  },
  {
    id: 'capture',
    title: '気づきを投稿する（日常運用）',
    items: [
      { id: 'capture-app', label: '8. アプリから投稿する' },
      { id: 'capture-extension', label: '9. Chrome 拡張から投稿する' },
      { id: 'capture-mobile', label: '10. スマートフォンから投稿する' },
    ],
  },
  {
    id: 'inbox',
    title: '受信箱で整理する',
    items: [
      { id: 'inbox-review', label: '11. AI の整理結果を確認する' },
      { id: 'inbox-triage', label: '12. Issue にする・統合する' },
    ],
  },
  {
    id: 'board',
    title: 'ボードで直す',
    items: [
      { id: 'board-flow', label: '13. 状態を進める' },
      { id: 'board-packs', label: '14. 修正パックでまとめて直す' },
    ],
  },
  {
    id: 'closed-loop',
    title: '直したら確認する',
    items: [{ id: 'closed-loop-verify', label: '15. 投稿者へ確認が届く' }],
  },
  { id: 'faq', title: 'よくある質問' },
  { id: 'troubleshoot', title: '困ったときは' },
  { id: 'support', title: 'サポート' },
];

export function guideTocItemCount() {
  return guideToc.reduce((n, ch) => n + (ch.items?.length ?? 0), 0);
}
