import { getSnsNavPlatform } from './snsPlatforms';

export type PageMeta = {
  title: string;
  subtitle?: string;
};

/** ダッシュボード各画面のヘッダー表示（本文タイトルと重複させない） */
export function getPageMeta(pathname: string): PageMeta {
  if (pathname.startsWith('/sns/')) {
    const id = pathname.split('/')[2] ?? '';
    const sns = getSnsNavPlatform(id);
    return {
      title: sns ? sns.name : 'SNS',
      subtitle: '投稿内容・予約予定・カレンダー。媒体ごとに整えて予約します。',
    };
  }
  if (pathname.startsWith('/roadmap')) {
    return {
      title: '成長ロードマップ',
      subtitle: '業種別の順番つきガイド。公式登録から自動投稿まで伴走します。',
    };
  }
  if (pathname.startsWith('/inbox')) {
    return {
      title: 'ネタInbox',
      subtitle: '投稿ネタをためておく場所。写真1枚＋一言でOK。',
    };
  }
  if (pathname.startsWith('/magic-creator')) {
    return {
      title: 'ネタクリエイター',
      subtitle: 'Inboxや直接入力から、各SNS向けの投稿文・台本を自動生成します。',
    };
  }
  if (pathname.startsWith('/content-calendar')) {
    return {
      title: '30本カレンダー',
      subtitle: '業種テンプレから4週間分を自動展開。貼るだけで回り始めます。',
    };
  }
  if (pathname.startsWith('/calendar')) {
    return {
      title: '投稿カレンダー',
      subtitle: 'DnD・週シフト・テンポ複製・穴埋めで予約を一気に回せます。',
    };
  }
  if (pathname.startsWith('/x-series')) {
    return {
      title: 'Xシリーズ',
      subtitle: 'カテゴリ別キューを曜日×時刻で自動消化。投稿OKとジッター付き。',
    };
  }
  if (pathname.startsWith('/funnel')) {
    return {
      title: '導線ビルダー',
      subtitle: 'SNS → LINE → 予約を、プロフィール文言・短縮URL・QRでセット生成します。',
    };
  }
  if (pathname.startsWith('/line-crm')) {
    return {
      title: 'LINE CRM',
      subtitle: 'タグ・流入経路・セグメント・ステップ配信・リッチメニューを統合管理。',
    };
  }
  if (pathname.startsWith('/analytics')) {
    return {
      title: '分析・売上',
      subtitle: 'トレンド波乗り・A/B テスト・UTM/LINE 自動計測',
    };
  }
  if (pathname.startsWith('/settings')) {
    return {
      title: '設定',
      subtitle: '事業所 / SNS連携 / スタッフ / プラン / 高度な設定',
    };
  }
  if (pathname.startsWith('/dashboard')) {
    return {
      title: 'ダッシュボード',
      subtitle: '各SNSのまとめ。今日のミッション・健康スコア・承認待ちをひと目で',
    };
  }
  return { title: 'ダッシュボード' };
}
