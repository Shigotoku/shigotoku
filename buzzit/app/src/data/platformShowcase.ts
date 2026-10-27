import type { IndustryTemplate } from './industryTemplates';

export type ProfileLayout =
  | 'instagram'
  | 'tiktok'
  | 'line'
  | 'youtube'
  | 'x'
  | 'facebook'
  | 'gbp';

export type ProfileAnnotation = {
  id: string;
  label: string;
  hint: string;
};

export type ProfileShowcase = {
  layout: ProfileLayout;
  displayName: string;
  username: string;
  bio: string[];
  linkLabel: string;
  highlights?: string[];
  extras?: string[];
  annotations: ProfileAnnotation[];
};

export type PostFormat = 'reel' | 'carousel' | 'photo' | 'video' | 'text' | 'short';

export type PostExample = {
  id: string;
  rank: number;
  format: PostFormat;
  formatLabel: string;
  title: string;
  hookOverlay: string;
  captionPreview: string;
  whyItWorks: string;
  /** Tailwind gradient for mock thumbnail */
  thumbClass: string;
};

export type PlatformShowcase = {
  profileTitle: string;
  postsTitle: string;
  profile: ProfileShowcase;
  posts: PostExample[];
};

const showcaseByPlatform: Record<string, PlatformShowcase> = {
  instagram: {
    profileTitle: 'プロフィール（ホーム）の見本',
    postsTitle: '伸びやすい投稿 TOP3（見本）',
    profile: {
      layout: 'instagram',
      displayName: '',
      username: 'salon_shibuya',
      bio: [],
      linkLabel: 'LINE友だち追加で初回クーポン',
      highlights: ['メニュー', '口コミ', 'アクセス', 'クーポン'],
      annotations: [
        { id: '1', label: '名前欄', hint: '地域＋業種＋強み。検索でヒットしやすいキーワードを入れる' },
        { id: '2', label: '自己紹介', hint: '誰向け・何が得意・次の行動の3行。絵文字は1〜2個まで' },
        { id: '3', label: 'リンク1本', hint: 'LINE or 予約URLに一本化。迷わせない' },
        { id: '4', label: 'ハイライト', hint: '新規が見る4本：メニュー/口コミ/アクセス/特典' },
        { id: '5', label: 'ピン留め', hint: 'お店紹介リール or 予約導線を固定' },
      ],
    },
    posts: [
      {
        id: 'ig-1',
        rank: 1,
        format: 'reel',
        formatLabel: 'リール · 15秒',
        title: 'ビフォーアフター（工程つき）',
        hookOverlay: '最初の1秒でAfterを見せる',
        captionPreview: '「実はこの工程だけ変えた」→ 保存されやすい教育系',
        whyItWorks: '冒頭で結果を見せるとスクロールが止まる。無音でもテロップで伝わる構成。',
        thumbClass: 'from-rose-200 via-neutral-100 to-amber-100',
      },
      {
        id: 'ig-2',
        rank: 2,
        format: 'carousel',
        formatLabel: 'カルーセル · 5枚',
        title: 'チェックリスト型（保存狙い）',
        hookOverlay: '保存して見返してね',
        captionPreview: '「〇〇な人だけ見て」→ 1枚目でターゲット指定',
        whyItWorks: '保存率が伸びるとリーチが広がりやすい。数字・箇条書きが効く。',
        thumbClass: 'from-sky-100 via-white to-emerald-100',
      },
      {
        id: 'ig-3',
        rank: 3,
        format: 'reel',
        formatLabel: 'リール · 20秒',
        title: 'スタッフの裏側＋人柄',
        hookOverlay: '美容師が絶対言わないこと',
        captionPreview: '親近感 → プロフィール遷移 → LINE/予約',
        whyItWorks: '顔出し＋共感フックでフォロー転換。最後3秒にCTAを入れる。',
        thumbClass: 'from-violet-100 via-neutral-50 to-orange-100',
      },
    ],
  },
  tiktok: {
    profileTitle: 'プロフィール（ホーム）の見本',
    postsTitle: '伸びやすい投稿 TOP3（見本）',
    profile: {
      layout: 'tiktok',
      displayName: '',
      username: 'salon_tiktok',
      bio: [],
      linkLabel: 'Instagram / 予約はこちら',
      annotations: [
        { id: '1', label: '名前', hint: '業種＋地域。TikTok検索にも効く' },
        { id: '2', label: '自己紹介', hint: '1行目で「誰の悩みを解決するか」' },
        { id: '3', label: 'リンク', hint: 'Instagram or 予約へ。複数は避ける' },
        { id: '4', label: '固定動画', hint: 'お店紹介 or 人気No.1ネタをピン留め' },
      ],
    },
    posts: [
      {
        id: 'tt-1',
        rank: 1,
        format: 'video',
        formatLabel: '縦動画 · 12秒',
        title: '変身系（Before→After）',
        hookOverlay: '0.5秒でBefore → パッとAfter',
        captionPreview: '音源トレンド＋テロップ大きめ',
        whyItWorks: '最初の2秒で離脱を防ぐ。ループ再生されやすい短尺が強い。',
        thumbClass: 'from-fuchsia-200 via-pink-50 to-yellow-100',
      },
      {
        id: 'tt-2',
        rank: 2,
        format: 'video',
        formatLabel: '縦動画 · 18秒',
        title: 'あるある共感',
        hookOverlay: '〇〇で失敗した人、これ見て',
        captionPreview: 'コメント欄で議論 → 拡散',
        whyItWorks: '共感→コメント→再視聴の循環。返信速度が重要。',
        thumbClass: 'from-cyan-100 via-white to-lime-100',
      },
      {
        id: 'tt-3',
        rank: 3,
        format: 'video',
        formatLabel: '縦動画 · 25秒',
        title: 'How-to（手順3ステップ）',
        hookOverlay: '自宅ケア、これだけで変わる',
        captionPreview: '保存・シェアされやすい実用系',
        whyItWorks: '教育系はフォロワー以外にも届きやすい。最後に「詳しくはプロフィール」',
        thumbClass: 'from-indigo-100 via-slate-50 to-teal-100',
      },
    ],
  },
  line: {
    profileTitle: 'LINE公式アカウント TOP画面の見本',
    postsTitle: '反応が取りやすい配信 TOP3（見本）',
    profile: {
      layout: 'line',
      displayName: '',
      username: '@公式アカウント名',
      bio: [],
      linkLabel: '',
      extras: ['リッチメニュー4分割', 'あいさつメッセージ', 'クーポンカード'],
      annotations: [
        { id: '1', label: 'あいさつ', hint: '追加直後30秒で価値が伝わる短文＋画像1枚' },
        { id: '2', label: 'リッチメニュー', hint: '予約/メニュー/アクセス/クーポンの4ボタン' },
        { id: '3', label: 'プロフィール', hint: '店名・住所・営業時間を正確に' },
        { id: '4', label: 'タグ設計', hint: '流入経路（Instagram/TikTok/チラシ）を最初から分ける' },
      ],
    },
    posts: [
      {
        id: 'ln-1',
        rank: 1,
        format: 'photo',
        formatLabel: '配信 · クーポン',
        title: '友だち限定クーポン',
        hookOverlay: '今週末まで · 初回500円OFF',
        captionPreview: '期限＋使い方1行。画像は文字大きめ',
        whyItWorks: '来店理由が明確。期限で urgency を作る。',
        thumbClass: 'from-green-100 via-emerald-50 to-lime-100',
      },
      {
        id: 'ln-2',
        rank: 2,
        format: 'carousel',
        formatLabel: '配信 · カード型',
        title: '空き枠のお知らせ',
        hookOverlay: '今週の残り枠 · 3席',
        captionPreview: '日時を具体的に。タップで予約URL',
        whyItWorks: '既存客の再予約・空き埋めに直結。週1ペースがおすすめ。',
        thumbClass: 'from-amber-100 via-orange-50 to-yellow-100',
      },
      {
        id: 'ln-3',
        rank: 3,
        format: 'text',
        formatLabel: '配信 · ステップ',
        title: '来店後フォロー（3日後）',
        hookOverlay: 'ご来店ありがとうございました',
        captionPreview: 'ケアのポイント1つ＋次回予約の軽い案内',
        whyItWorks: 'リピート率UP。売り込みより「ケアの続き」を渡す。',
        thumbClass: 'from-neutral-100 via-white to-neutral-200',
      },
    ],
  },
  'youtube-shorts': {
    profileTitle: 'チャンネル（ホーム）の見本',
    postsTitle: '伸びやすい Shorts TOP3（見本）',
    profile: {
      layout: 'youtube',
      displayName: '',
      username: '@店舗チャンネル',
      bio: [],
      linkLabel: '予約サイト / LINE',
      extras: ['チャンネルアート', '再生リスト「お店紹介」'],
      annotations: [
        { id: '1', label: 'チャンネル名', hint: '店名＋地域。検索用キーワードを含める' },
        { id: '2', label: '概要欄', hint: '予約リンク・営業時間・SNSリンクを整理' },
        { id: '3', label: '固定Shorts', hint: 'お店紹介1本をチャンネルトップに' },
        { id: '4', label: 'サムネ', hint: '顔 or ビフォーアフター＋大文字テロップ' },
      ],
    },
    posts: [
      {
        id: 'yt-1',
        rank: 1,
        format: 'short',
        formatLabel: 'Shorts · 30秒',
        title: 'お店30秒ツアー',
        hookOverlay: '駅から徒歩3分のサロン',
        captionPreview: '外観→店内→代表メニュー',
        whyItWorks: '初見の不安を解消。Google検索からの流入にも効く。',
        thumbClass: 'from-red-100 via-white to-neutral-100',
      },
      {
        id: 'yt-2',
        rank: 2,
        format: 'short',
        formatLabel: 'Shorts · 20秒',
        title: 'Q&A 1問1答',
        hookOverlay: 'カラー後、すぐシャンプーしていい？',
        captionPreview: '専門性を短く。概要欄に詳細リンク',
        whyItWorks: '検索流入向き。保存・再視聴されやすい。',
        thumbClass: 'from-blue-100 via-sky-50 to-indigo-100',
      },
      {
        id: 'yt-3',
        rank: 3,
        format: 'short',
        formatLabel: 'Shorts · 15秒',
        title: 'ビフォーアフター',
        hookOverlay: '3秒で仕上がりが変わる理由',
        captionPreview: 'テロップ必須。BGMは著作権フリー',
        whyItWorks: 'Shortsフィードで横展開。他SNSへ再利用しやすい。',
        thumbClass: 'from-purple-100 via-pink-50 to-rose-100',
      },
    ],
  },
  x: {
    profileTitle: 'プロフィール（ホーム）の見本',
    postsTitle: '伸びやすい投稿 TOP3（見本）',
    profile: {
      layout: 'x',
      displayName: '',
      username: '@salon_x',
      bio: [],
      linkLabel: '予約 / LINE',
      extras: ['固定ポスト', 'ヘッダー画像'],
      annotations: [
        { id: '1', label: '名前＋ID', hint: '業種が一目で分かる表示名' },
        { id: '2', label: '固定ポスト', hint: '予約導線 or 人気投稿を固定' },
        { id: '3', label: 'ヘッダー', hint: '店舗写真＋キャッチ1行' },
        { id: '4', label: 'リンク', hint: '予約1本。定期ポストの末尾にも同URL' },
      ],
    },
    posts: [
      {
        id: 'x-1',
        rank: 1,
        format: 'photo',
        formatLabel: '画像付き · 1枚',
        title: 'ビフォーアフター＋短文',
        hookOverlay: '今日の仕上がり',
        captionPreview: '140字以内。画像1枚で目を止める',
        whyItWorks: '拡散より指名・DM予約向き。返信速度が信頼になる。',
        thumbClass: 'from-neutral-200 via-stone-100 to-neutral-50',
      },
      {
        id: 'x-2',
        rank: 2,
        format: 'text',
        formatLabel: 'スレッド · 3ツイート',
        title: '悩み→原因→解決',
        hookOverlay: '【保存版】〇〇で困る人へ',
        captionPreview: '1ツイート目で結論。続きで詳細',
        whyItWorks: 'スレッドは滞在時間が伸びる。最後に予約リンク。',
        thumbClass: 'from-slate-100 via-gray-50 to-zinc-100',
      },
      {
        id: 'x-3',
        rank: 3,
        format: 'photo',
        formatLabel: '画像 · 空き枠',
        title: '本日の空き枠告知',
        hookOverlay: '本日17:00〜1枠',
        captionPreview: '具体日時＋予約URL。週2〜3回',
        whyItWorks: '即時予約に直結。フォロワー少なくても効く。',
        thumbClass: 'from-amber-50 via-yellow-50 to-orange-50',
      },
    ],
  },
  'facebook-threads': {
    profileTitle: 'プロフィール（ホーム）の見本',
    postsTitle: '伸びやすい投稿 TOP3（見本）',
    profile: {
      layout: 'facebook',
      displayName: '',
      username: '@salon_threads',
      bio: [],
      linkLabel: 'Instagram / 予約',
      annotations: [
        { id: '1', label: 'プロフィール', hint: 'Instagramと世界観を揃える' },
        { id: '2', label: 'リンク', hint: '予約 or Instagramへ' },
        { id: '3', label: '固定投稿', hint: 'お店紹介 or 人気ネタ' },
        { id: '4', label: 'トーン', hint: '短文＋会話調。ハッシュタグは少なめ' },
      ],
    },
    posts: [
      {
        id: 'fb-1',
        rank: 1,
        format: 'photo',
        formatLabel: 'Threads · 画像1枚',
        title: '共感フック＋写真',
        hookOverlay: '意外と知らない〇〇の話',
        captionPreview: 'コメントで会話を促す',
        whyItWorks: 'Meta系横展開。Instagramリールの静止画版として使える。',
        thumbClass: 'from-stone-100 via-neutral-50 to-stone-200',
      },
      {
        id: 'fb-2',
        rank: 2,
        format: 'carousel',
        formatLabel: 'Threads · カルーセル',
        title: '3枚でTips',
        hookOverlay: '1枚目で結論',
        captionPreview: '保存より「返信・引用」狙い',
        whyItWorks: '短い会話型コンテンツ向き。週3本から開始。',
        thumbClass: 'from-blue-50 via-indigo-50 to-violet-50',
      },
      {
        id: 'fb-3',
        rank: 3,
        format: 'text',
        formatLabel: 'Threads · テキスト',
        title: 'スタッフの一言',
        hookOverlay: '今日のひとこと',
        captionPreview: '人柄が伝わる短文。顔写真とセット',
        whyItWorks: 'フォロワー以外への露出。Instagramよりカジュアルに。',
        thumbClass: 'from-emerald-50 via-teal-50 to-cyan-50',
      },
    ],
  },
  gbp: {
    profileTitle: 'Googleビジネスプロフィールの見本',
    postsTitle: '反応が取りやすい投稿 TOP3（見本）',
    profile: {
      layout: 'gbp',
      displayName: '',
      username: 'Googleマップ上の店舗名',
      bio: [],
      linkLabel: '予約 / 電話 / ウェブサイト',
      extras: ['写真20枚以上', '口コミ返信', '最新情報'],
      annotations: [
        { id: '1', label: '店名・カテゴリ', hint: '正式名称＋正確な業種カテゴリ' },
        { id: '2', label: '写真', hint: '外観・内装・メニュー・スタッフを定期更新' },
        { id: '3', label: '投稿', hint: '週1「最新情報」で検索順位維持' },
        { id: '4', label: '口コミ返信', hint: '24時間以内。キーワードを自然に含める' },
      ],
    },
    posts: [
      {
        id: 'gb-1',
        rank: 1,
        format: 'photo',
        formatLabel: '最新情報 · 写真',
        title: '季節メニュー・キャンペーン',
        hookOverlay: '春限定メニュー開始',
        captionPreview: 'CTAボタン「予約」「詳細」を必ず設定',
        whyItWorks: 'Maps検索からの直接来店。写真付きがCTR高い。',
        thumbClass: 'from-green-50 via-emerald-50 to-teal-50',
      },
      {
        id: 'gb-2',
        rank: 2,
        format: 'photo',
        formatLabel: '最新情報 · イベント',
        title: '空き枠・特別営業',
        hookOverlay: '今週末 空き枠あり',
        captionPreview: '日時明記。電話ボタンも活用',
        whyItWorks: '近隣検索ユーザーに刺さる。更新頻度が評価される。',
        thumbClass: 'from-sky-50 via-blue-50 to-indigo-50',
      },
      {
        id: 'gb-3',
        rank: 3,
        format: 'photo',
        formatLabel: '最新情報 · お知らせ',
        title: '施術事例（許諾済み）',
        hookOverlay: 'ビフォーアフター',
        captionPreview: '誇大表現NG。事実ベースで',
        whyItWorks: '信頼構築。口コミとセットで予約率UP。',
        thumbClass: 'from-orange-50 via-amber-50 to-yellow-50',
      },
    ],
  },
};

function usernameFromIndustry(industry: IndustryTemplate, platformId: string): string {
  const slug = industry.id === 'food' ? 'cafe_local' : industry.id === 'fitness' ? 'gym_local' : 'shop_local';
  const map: Record<string, string> = {
    instagram: slug,
    tiktok: `${slug}_tt`,
    line: '@公式アカウント',
    'youtube-shorts': `@${slug}_channel`,
    x: `@${slug}`,
    'facebook-threads': `@${slug}_threads`,
    gbp: industry.profileNameExample.split('｜')[0]?.trim() ?? '店舗名',
  };
  return map[platformId] ?? slug;
}

/** 業種テンプレを反映した媒体別見本データ */
export function getPlatformShowcase(platformId: string, industry: IndustryTemplate): PlatformShowcase | null {
  const base = showcaseByPlatform[platformId];
  if (!base) return null;

  const bioLines = industry.bioExample.split('\n').filter(Boolean);
  const hook0 = industry.hooks[0]?.example ?? base.posts[0]?.hookOverlay ?? '';
  const hook1 = industry.hooks[1]?.example ?? base.posts[1]?.hookOverlay ?? '';
  const hook2 = industry.hooks[2]?.example ?? base.posts[2]?.hookOverlay ?? '';

  return {
    ...base,
    profile: {
      ...base.profile,
      displayName: industry.profileNameExample,
      username: usernameFromIndustry(industry, platformId),
      bio: bioLines.length > 0 ? bioLines : base.profile.bio,
    },
    posts: base.posts.map((post, i) => ({
      ...post,
      hookOverlay: [hook0, hook1, hook2][i] ?? post.hookOverlay,
    })),
  };
}

/** 業種の primaryPlatforms から companion id に変換 */
export function primaryPlatformToCompanionId(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('instagram')) return 'instagram';
  if (n.includes('tiktok')) return 'tiktok';
  if (n.includes('line')) return 'line';
  if (n.includes('youtube')) return 'youtube-shorts';
  if (n.includes('x') || n.includes('twitter')) return 'x';
  if (n.includes('threads') || n.includes('facebook')) return 'facebook-threads';
  if (n.includes('google') || n.includes('gbp')) return 'gbp';
  return 'instagram';
}
