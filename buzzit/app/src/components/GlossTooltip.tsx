import type { ReactNode } from 'react';

/** 店舗向けのかみ砕き用語 */
export const GLOSSARY: Record<string, string> = {
  Narrowcast: '送りたいお客さんだけにLINEを送る仕組み（一斉送信より安い）',
  publishMode: '投稿の出し方。通知だけ／承認後／自動投稿など',
  Audience: '配信の対象グループ（例: VIPタグの人だけ）',
  Webhook: 'LINEやSlackからBuzzItへ自動で知らせる受信口',
  Meta: 'Instagram / Facebook をまとめて扱うMeta社の連携',
  GBP: 'Googleマップの店舗ページ（Googleビジネスプロフィール）',
  HPB: 'ホットペッパービューティーなど予約サイト',
  Flex: '画像やボタン付きのきれいなLINEメッセージ',
  LIFF: 'LINEの中で開く小さなWeb画面（経路計測に強い）',
  Ayrshare: 'Xなど複数SNSへまとめて予約できる外部サービス',
};

export default function GlossTooltip({
  term,
  children,
}: {
  term: keyof typeof GLOSSARY | string;
  children?: ReactNode;
}) {
  const tip = GLOSSARY[term] ?? term;
  return (
    <span className="group relative inline-flex cursor-help items-center gap-0.5 border-b border-dotted border-neutral-400">
      {children ?? term}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-56 -translate-x-1/2 border border-neutral-800 bg-neutral-900 p-2 text-left text-[11px] leading-relaxed text-white group-hover:block group-focus-within:block">
        {tip}
      </span>
    </span>
  );
}
