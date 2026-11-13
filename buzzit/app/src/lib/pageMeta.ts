import { getSnsNavPlatform } from './snsPlatforms';

export type PageMeta = {
  title: string;
  subtitle?: string;
};

/** ダッシュボード各画面のヘッダー表示（サイドバー項目名と一致させる） */
export function getPageMeta(pathname: string): PageMeta {
  if (pathname.startsWith('/sns/')) {
    const id = pathname.split('/')[2] ?? '';
    const sns = getSnsNavPlatform(id);
    return {
      title: sns ? sns.name : 'SNS',
    };
  }
  if (pathname.startsWith('/guide') || pathname.startsWith('/roadmap')) {
    return { title: '使い方の手順', subtitle: '迷ったらここから。初期設定と毎日の流れ' };
  }
  if (pathname.startsWith('/inbox')) {
    return { title: '① ネタを溜める', subtitle: '思いついたことを写真1枚＋一言でメモ' };
  }
  if (pathname.startsWith('/magic-creator')) {
    return { title: '② 投稿を作る', subtitle: 'ネタから各SNS向けの投稿文を自動で作ります' };
  }
  if (pathname.startsWith('/content-calendar') || pathname.startsWith('/x-series')) {
    return { title: 'まとめて作る', subtitle: '4週間分の投稿や、Xの自動投稿キューをまとめて用意' };
  }
  if (pathname.startsWith('/calendar')) {
    return { title: '投稿カレンダー', subtitle: '全SNSの予約を確認・調整' };
  }
  if (pathname.startsWith('/funnel') || pathname.startsWith('/line-crm')) {
    return { title: '集客（LINE・導線）', subtitle: 'LINEの友だち管理と、SNSからの導線づくり' };
  }
  if (pathname.startsWith('/analytics')) {
    return { title: '分析・売上', subtitle: '反応と売上の数字を確認' };
  }
  if (pathname.startsWith('/settings')) {
    return { title: '設定', subtitle: '配信キャラ・SNS連携・スタッフ・プラン' };
  }
  if (pathname.startsWith('/dashboard')) {
    return { title: 'ダッシュボード', subtitle: '投稿予定と数字をひと目で' };
  }
  return { title: 'ダッシュボード' };
}
