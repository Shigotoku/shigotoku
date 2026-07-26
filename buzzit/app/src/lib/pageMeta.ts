export type PageMeta = {
  title: string;
  subtitle?: string;
};

/** ダッシュボード各画面のヘッダー表示（本文タイトルと重複させない） */
export function getPageMeta(pathname: string): PageMeta {
  if (pathname.startsWith('/roadmap')) {
    return {
      title: '成長ロードマップ',
      subtitle: '業種別の順番つきガイド。公式登録から自動投稿まで伴走します。',
    };
  }
  if (pathname.startsWith('/inbox')) {
    return {
      title: 'ネタInbox',
      subtitle: '写真1枚＋一言でOK。チームのネタを集めて台本化します。',
    };
  }
  if (pathname.startsWith('/magic-creator')) {
    return {
      title: 'マジック・クリエイター',
      subtitle: '1つのアイデアから全SNS向けコンテンツを自動生成（Repurpose）。',
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
      subtitle: '予約・承認待ち・失敗を一覧で管理。失敗はワンタップで再試行できます。',
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
  if (pathname.startsWith('/team')) {
    return {
      title: 'スタッフ',
      subtitle: '店舗メンバーの招待と権限管理',
    };
  }
  if (pathname.startsWith('/settings')) {
    return {
      title: '設定',
      subtitle: 'プラン・連携（Meta / LINE / X / Slack）の管理',
    };
  }
  if (pathname.startsWith('/dashboard')) {
    return {
      title: '経営コクピット',
      subtitle: '今日のミッション・健康スコア・承認待ちをひと目で',
    };
  }
  return { title: '経営コクピット' };
}
