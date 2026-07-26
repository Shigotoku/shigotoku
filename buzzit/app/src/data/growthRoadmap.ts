/**
 * 店舗向け SNS 成長ロードマップ（アプリ内ガイド）
 * 業界で共有されている運用知見（ショート動画・導線設計・PDCA）を
 * BuzzIt の機能導線と組み合わせた実践チェックリスト。
 */

export type RoadmapLink = {
  label: string;
  path: string;
};

/** 設定・CRMの状態から自動完了できるシグナル */
export type AutoSignal =
  | 'meta_or_line'
  | 'publish_mode'
  | 'team'
  | 'line_step'
  | 'destination_url'
  | 'slack';

export type ChecklistItem = {
  id: string;
  title: string;
  detail: string;
  tip?: string;
  link?: RoadmapLink;
  /** 連携状態が満たされると自動で完了扱い（手動解除不可） */
  autoSignal?: AutoSignal;
};

export type JourneyPhase = {
  id: string;
  dayLabel: string;
  title: string;
  subtitle: string;
  goal: string;
  items: ChecklistItem[];
};

export type PlatformGuide = {
  id: string;
  name: string;
  role: string;
  audience: string;
  frequency: string;
  startSteps: string[];
  profileUi: string[];
  buzzTips: string[];
  avoid: string[];
  buzzitHint: string;
  link?: RoadmapLink;
};

export type ContentPillar = {
  id: string;
  name: string;
  ratio: string;
  description: string;
  examples: string[];
};

export type HookPattern = {
  id: string;
  name: string;
  example: string;
};

export const STORAGE_KEY = 'buzzit.growthRoadmap.v1';

export type ConnectionSnapshot = {
  metaConnected: boolean;
  lineConnected: boolean;
  slackConnected: boolean;
  publishModeReady: boolean;
  hasTeam: boolean;
  hasLineStep: boolean;
  hasDestinationUrl: boolean;
};

export function signalsFromSnapshot(snap: ConnectionSnapshot): Set<AutoSignal> {
  const s = new Set<AutoSignal>();
  if (snap.metaConnected || snap.lineConnected) s.add('meta_or_line');
  if (snap.publishModeReady) s.add('publish_mode');
  if (snap.hasTeam) s.add('team');
  if (snap.hasLineStep) s.add('line_step');
  if (snap.hasDestinationUrl) s.add('destination_url');
  if (snap.slackConnected) s.add('slack');
  return s;
}

export function autoCompletedIds(activeSignals: Set<AutoSignal>): Set<string> {
  const ids = new Set<string>();
  for (const phase of journeyPhases) {
    for (const item of phase.items) {
      if (item.autoSignal && activeSignals.has(item.autoSignal)) {
        ids.add(item.id);
      }
    }
  }
  return ids;
}

/** 全体の進め方（迷ったらここ） */
export const quickStartRules = [
  '最初は媒体を1〜2つに絞る（美容・飲食なら Instagram＋LINE が王道）',
  '公式サイトで登録→プロフィール→初投稿の順。伴走ガイドの外部リンクから迷わず進む',
  'BuzzIt連携で予約投稿→コクピット承認の動線を一度通す',
  'バズは冒頭2〜3秒。フォロワー増はプロフィール特典と継続が本体',
  'マジック・クリエイターで1素材→多媒体に横展開する',
];

/** 30日ジャーニー */
export const journeyPhases: JourneyPhase[] = [
  {
    id: 'phase-foundation',
    dayLabel: 'Day 1–3',
    title: '土台づくり',
    subtitle: '目的・導線・アカウント設計',
    goal: '「誰に・何を・どこへ誘導するか」を言語化し、BuzzIt と主要SNSを接続する',
    items: [
      {
        id: 'f1',
        title: '目的を1つ決める',
        detail: '新規予約 / リピート / 採用 / 認知 のどれを最優先にするか。KPIは1つに絞る。',
        tip: '美容室なら「HPB経由の新規予約」、飲食なら「週末来店」など具体化する。',
      },
      {
        id: 'f2',
        title: '理想のお客様を言語化する',
        detail: '年齢・悩み・検索キーワード・来店の決め手を3行で書く。投稿のフックに直結する。',
      },
      {
        id: 'f3',
        title: '導線を決める（黄金パターン）',
        detail: 'SNS（認知）→ プロフィール / LINE（育成）→ 予約・来店（成果）。投稿だけで終わらせない。',
        tip: '店舗型: Instagram → LINE友だち → 予約。拡散重視なら TikTok を入口に足す。',
        link: { label: 'LINE CRMを開く', path: '/line-crm' },
        autoSignal: 'destination_url',
      },
      {
        id: 'f4',
        title: 'BuzzIt で Meta / LINE を接続',
        detail: '設定から Instagram・Facebook・Threads・LINE を連携。投稿と配信の土台になる。',
        link: { label: '設定へ', path: '/settings' },
        autoSignal: 'meta_or_line',
      },
      {
        id: 'f5',
        title: 'プロフィールを「看板」にする',
        detail: '名前欄に地域＋業種、自己紹介3行で価値、リンクに予約 or LINE。アイコンは顔 or 店頭写真。',
        tip: '「何のお店か3秒でわかる」が合格ライン。',
      },
    ],
  },
  {
    id: 'phase-companion',
    dayLabel: 'Day 2–10（並行）',
    title: 'SNS伴走スタート',
    subtitle: '公式登録 → 初投稿 → 自動投稿',
    goal: '選んだ媒体で「登録サイトへ行く→プロフィール→最初の1投稿→BuzzIt予約」まで迷わず通す',
    items: [
      {
        id: 'c1',
        title: 'メイン媒体を1つ決める',
        detail: '迷ったら Instagram。リピート重視なら LINE も同時開設。詳細手順は「SNS伴走ガイド」タブへ。',
        tip: '業種別テンプレの「集中する媒体」をそのまま採用してよい。',
      },
      {
        id: 'c2',
        title: '公式サイトでアカウント登録を完了',
        detail: '伴走ガイドの「登録」ステージから公式URLへ移動。ビジネス/プロアカウント切替まで終わらせる。',
      },
      {
        id: 'c3',
        title: '最初の投稿を1本出す',
        detail: 'ガイドの「初投稿ネタ」を使い、マジック・クリエイターで台本化してから投稿。',
        link: { label: 'クリエイターで初投稿台本', path: '/magic-creator' },
      },
      {
        id: 'c4',
        title: 'BuzzItで自動投稿（予約）動線を通す',
        detail: 'Meta/LINE連携 → 投稿モード設定 → 予約 → コクピット承認。一度通すと翌週から楽になる。',
        link: { label: '設定で連携', path: '/settings' },
        autoSignal: 'meta_or_line',
      },
      {
        id: 'c5',
        title: 'バズとフォロワー増の型を読む',
        detail: '伴走ガイド下部の「ばずらせ方」「フォロワーを増やす」を確認し、翌週のテストフックを1つ決める。',
      },
    ],
  },
  {
    id: 'phase-setup',
    dayLabel: 'Day 4–7',
    title: '運用の型を作る',
    subtitle: '投稿設計・ブランド・チーム',
    goal: 'ネタ切れしない「型」と、BuzzIt 上の承認・投稿フローを整える',
    items: [
      {
        id: 's1',
        title: 'コンテンツ3本柱を決める',
        detail: '教育 / 共感・日常 / オファー（予約誘導）の比率をざっくり決める（例: 5:3:2）。',
      },
      {
        id: 's2',
        title: 'フックテンプレを5つ用意',
        detail: '「〇〇な人だけ見て」「ビフォーを先出し」「常識を壊す断言」など、冒頭文をストックする。',
        link: { label: 'マジック・クリエイターで台本作成', path: '/magic-creator' },
      },
      {
        id: 's3',
        title: '投稿頻度を決める',
        detail: 'Instagram リール週3〜5、ストーリーズ毎日、LINEは週1〜2の価値配信が目安。',
      },
      {
        id: 's4',
        title: 'ブランドセーフティと投稿モードを確認',
        detail: 'いきなり自動投稿せず、最初は承認フローで品質を担保。慣れたら Auto Mode へ。',
        link: { label: '設定（投稿モード）', path: '/settings' },
        autoSignal: 'publish_mode',
      },
      {
        id: 's5',
        title: 'スタッフを巻き込む',
        detail: 'ネタは現場に眠っている。スタッフ招待と Slack ネタ会議で「孤独なSNS担当」をなくす。',
        link: { label: 'スタッフ管理', path: '/team' },
        autoSignal: 'team',
      },
    ],
  },
  {
    id: 'phase-habit',
    dayLabel: 'Week 2–4',
    title: '習慣化する',
    subtitle: '毎朝5分ルーティン',
    goal: 'コクピットのミッションをこなし、週次で数字を見て改善する',
    items: [
      {
        id: 'h1',
        title: '毎朝コクピットで今日やることを確認',
        detail: '承認待ち・配信結果・健康スコアを5分で片付ける。思考ゼロ運用の核。',
        link: { label: '経営コクピット', path: '/dashboard' },
      },
      {
        id: 'h2',
        title: '週3本のリールを4週間継続',
        detail: '完璧より継続。音声メモ→ボイスドラフト→Repurpose で制作時間を圧縮する。',
        link: { label: 'クリエイターを開く', path: '/magic-creator' },
      },
      {
        id: 'h3',
        title: '投稿後1時間はコメント・DMに返信',
        detail: '初期のエンゲージメントはおすすめ配信に効く。ストーリーズで質問箱も有効。',
      },
      {
        id: 'h4',
        title: '週1回インサイトを振り返る',
        detail: '見る指標は4つだけ: リーチ、視聴完了率、プロフィール訪問、予約/LINE追加。',
        link: { label: '分析・売上', path: '/analytics' },
      },
      {
        id: 'h5',
        title: '勝ちパターンを横展開',
        detail: '反応の良いフック・尺・CTAをメモし、次週の投稿の3割をその型で増やす。',
      },
    ],
  },
  {
    id: 'phase-scale',
    dayLabel: 'Month 2–3',
    title: '売上に直結させる',
    subtitle: 'LINE・MEO・多媒体',
    goal: '認知をリピートと予約に変換し、媒体を広げすぎず成果を伸ばす',
    items: [
      {
        id: 'sc1',
        title: 'LINE ステップ配信を1本立てる',
        detail: '友だち追加 → 歓迎クーポン → 来店リマインド → 再来促進。セグメントで配信コストも抑える。',
        link: { label: 'LINE CRM', path: '/line-crm' },
        autoSignal: 'line_step',
      },
      {
        id: 'sc2',
        title: 'Googleビジネスプロフィール（GBP）を整備',
        detail: '地図検索からの来店は店舗の生命線。投稿・写真・口コミ返信を週次で回す。',
        link: { label: '設定（GBP）', path: '/settings' },
      },
      {
        id: 'sc3',
        title: '検証済みリールを TikTok / Shorts へ',
        detail: 'Instagramで反応の良い動画を、ウォーターマークなしで横展開（ワンソース・マルチ配信）。',
      },
      {
        id: 'sc4',
        title: 'HPB / 予約トラッキングを有効化',
        detail: '投稿→予約の寄与が見えると改善が加速する。ファネルを経営コクピットで確認。',
        link: { label: '設定（HPB）', path: '/settings' },
      },
      {
        id: 'sc5',
        title: '月次PDCAを固定する',
        detail: '月初に「やめる投稿」「増やす投稿」「新しいフック1つ」を決め、チームで共有。',
        link: { label: '分析を見る', path: '/analytics' },
      },
    ],
  },
];

/** SNS別プレイブック */
export const platformGuides: PlatformGuide[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    role: '母艦（信頼・世界観・予約の受け皿）',
    audience: '20〜40代中心。美容・飲食・ライフスタイルに強い',
    frequency: 'リール週3〜5 / ストーリーズ毎日1〜3 / フィードは週1〜2で十分',
    startSteps: [
      'ビジネスアカウントに切り替え、カテゴリと連絡手段を設定',
      '名前欄: 「地域＋業種＋強み」（例: 渋谷｜髪質改善特化サロン）',
      '自己紹介3行: 誰の／何を解決／次の行動（LINE or 予約）',
      'ハイライトを「メニュー・口コミ・アクセス・クーポン」で整理',
      'プロフィールリンクに LINE または予約URLを設置',
    ],
    profileUi: [
      'アイコン: 顔出し or 店頭の明るい写真（ロゴのみは避ける）',
      'グリッド: 色味・余白を揃え、世界観が一目でわかる並び',
      'ピン留め: 代表メニュー・ビフォーアフター・来店の流れの3本',
      'ストーリーズ: 質問スタンプ・アンケートで双方向を作る',
    ],
    buzzTips: [
      '冒頭2〜3秒でフック（結論先出し / ビフォーアフター / 「〇〇な人だけ」）',
      '尺は15〜30秒、テロップは無音でもわかるように上部〜中央へ',
      '評価指標はいいねより「視聴完了率・保存・DMシェア」',
      'ハッシュタグは3〜5個。関連する中規模タグを中心に',
      '投稿後1時間の返信と、ストーリーズでの再シェアが伸びを支える',
    ],
    avoid: [
      'ハッシュタグを30個並べる古い手法',
      '他SNSのウォーターマーク付き動画の転載',
      '売り込みだけの投稿が連続すること',
    ],
    buzzitHint: 'マジック・クリエイターで Reels / カルーセル台本を生成 → Meta 連携で予約投稿',
    link: { label: 'クリエイターでリール台本', path: '/magic-creator' },
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    role: '拡散エンジン（フォロワー0でも新規リーチ）',
    audience: '10〜40代。飲食・美容・エンタメ・ノウハウ向き',
    frequency: '理想は週5〜7（最低でも週3）。短尺を高速で試す',
    startSteps: [
      'ビジネスアカウント化し、予約・地図・LINEリンクをプロフィールに',
      'ニックネームに地域＋業種を入れる（検索されやすくする）',
      '最初の10本は「完成度」より「フック実験」に振る',
      'トレンド音源は使いすぎず、無音でも伝わるテロップを優先',
      '伸びた型だけ Instagram / Shorts に横展開',
    ],
    profileUi: [
      'アイコンと名前は Instagram と揃えてブランド認知を統一',
      '固定動画に「初めての人向け」メニュー紹介を置く',
      'バイオは1行CTA（「予約はプロフィールのLINEへ」）',
    ],
    buzzTips: [
      'おすすめはフォロー関係より「動画ごとの反応」で決まる → 初日から勝負可能',
      '冒頭1〜2秒で動き（ズーム・カット・表情）を入れる',
      'ローカルネタ（駅名・あるある）で商圏内リーチを狙う',
      'コメント誘導（「どっち派？」）で滞在とアルゴリズム評価を上げる',
      'ロゴなし書き出しで他媒体へ。TikTokロゴ入りはリーチ低下しやすい',
    ],
    avoid: [
      '外注動画だけ投下して自社導線を放置すること',
      'バズ目的だけでCTAのない動画ばかり作ること',
    ],
    buzzitHint: 'IGで検証済みの台本をクリエイターで再利用し、TikTok用に短く整える',
    link: { label: '台本を作る', path: '/magic-creator' },
  },
  {
    id: 'line',
    name: 'LINE公式',
    role: 'リピート装置（プッシュで確実に届く）',
    audience: '全年代。来店型ビジネス必須',
    frequency: '一斉配信は週1〜2。ステップ配信で自動化を優先',
    startSteps: [
      '公式アカウント開設 → Messaging API / チャネルアクセストークンを BuzzIt に設定',
      'リッチメニューに「予約・クーポン・アクセス・相談」を配置',
      '流入経路URLを発行し、Instagram・店頭QRで経路を分ける',
      '歓迎メッセージ＋初回クーポンのステップを1本作る',
      '全配信ではなくタグ・セグメント配信でコストと反応を両立',
    ],
    profileUi: [
      'プロフィール画像とステータスメッセージを店舗ブランドに統一',
      'リッチメニューは写真多め・文言少なめ（タップ領域を大きく）',
      'あいさつメッセージは「特典→次にやること」の順',
    ],
    buzzTips: [
      'SNSで認知 → LINEで関係構築 → 予約、が店舗の黄金導線',
      '配信は「得がある情報」だけ。営業感の連投はブロックを招く',
      '2026年以降の料金改定を見据え、セグメント配信で無駄打ちを減らす',
      '来店後タグ（新規/常連）を付け、メッセージを出し分ける',
    ],
    avoid: [
      '毎日の売り込み一斉配信',
      '経路を分けずに「どこから来たか不明」な友だち管理',
    ],
    buzzitHint: 'LINE CRM でタグ・流入経路・ステップ・コスト見積りまで一気通貫',
    link: { label: 'LINE CRMへ', path: '/line-crm' },
  },
  {
    id: 'youtube-shorts',
    name: 'YouTube Shorts',
    role: '資産型ショート（検索で長く効く）',
    audience: '全年代。ハウツー・解説・信頼構築向き',
    frequency: '週2〜4。長尺は余裕ができてから',
    startSteps: [
      'チャンネルアイコン・バナー・概要欄に予約/LINEを明記',
      'Shorts は縦動画。タイトルにキーワード（地域＋施術名など）',
      '冒頭で結論、中盤で手順、最後にCTA',
      '関連する長尺や概要欄リンクで深掘りへ誘導',
    ],
    profileUi: [
      '再生リスト「初めての方へ」「よくある質問」を作成',
      'チャンネルトレーラーを15秒で用意',
    ],
    buzzTips: [
      'TikTok/リールより「検索流入」が強い。タイトルと話し言葉を意識',
      '動画寿命が長いので、季節ネタとエバーグリーンを混ぜる',
      'サムネは顔＋大きな文字1フレーズが基本',
    ],
    avoid: ['説明が長くて冒頭で離脱される構成', 'CTAなしの完結型ばかり'],
    buzzitHint: '同じ素材を Repurpose し、Shorts向けにタイトル案を別生成する',
    link: { label: 'クリエイターへ', path: '/magic-creator' },
  },
  {
    id: 'x',
    name: 'X（旧Twitter）',
    role: '速報・中の人の体温・採用・キャンペーン拡散',
    audience: '情報感度の高い層。リアルタイム告知向き',
    frequency: '1日1〜5投稿。ストックより鮮度',
    startSteps: [
      'プロフィールに地域・業種・予約リンク',
      '「今日の空き」「今日の一皿」など鮮度コンテンツを型化',
      'キャンペーンはハッシュタグ1つに絞って拡散しやすい形に',
      '炎上リスクのある発言ルールをチームで共有',
    ],
    profileUi: [
      'ヘッダーに店内写真、アイコンはスタッフ or ロゴ',
      '固定ポストにメニューとアクセス',
    ],
    buzzTips: [
      '短文＋写真1枚が基本。スレッドは「ノウハウまとめ」向き',
      'リプライ文化を活かし、地域アカウントやお客様と会話する',
      'BuzzIt の x_thread 台本でスレッド構成を整えてから投稿',
    ],
    avoid: ['感情的な返信', '他アカウントの無断転載'],
    buzzitHint: 'マジック・クリエイターの X スレッド出力を下書きとして使う（直接投稿は今後拡張）',
    link: { label: 'スレッド台本を作る', path: '/magic-creator' },
  },
  {
    id: 'facebook-threads',
    name: 'Facebook / Threads',
    role: 'Meta連携の副次チャネル（既存顧客・地域）',
    audience: 'Facebookは30〜50代・地域。Threadsはテキスト親和層',
    frequency: 'IG投稿の自動連携 or 週2〜3で十分',
    startSteps: [
      'Facebook ページを整備し、Meta Business で Instagram と接続',
      'BuzzIt の Meta OAuth で Page / IG / Threads をまとめて連携',
      '地域イベント・口コミ返信は Facebook も併用',
      'Threads は短文の裏側トークやQ&A向き',
    ],
    profileUi: [
      'ページの営業時間・地図・予約ボタンを最新に保つ',
      'カバー写真は季節で差し替え',
    ],
    buzzTips: [
      'メイン制作は IG リールに集中し、FB/Threads は横展開で効率化する',
      '地域のグループやイベント告知との相性が良い',
    ],
    avoid: ['Facebookだけに全力投球（主戦場はIG/LINEになりやすい）'],
    buzzitHint: '設定の Meta 連携後、publishMode: meta で一括配信',
    link: { label: 'Meta連携設定', path: '/settings' },
  },
  {
    id: 'gbp',
    name: 'Googleマップ（GBP）',
    role: '地域密着の来店導線（MEO）',
    audience: '「近くの〇〇」で検索する来店直前層',
    frequency: '投稿・写真追加を週1以上。口コミ返信は都度',
    startSteps: [
      'ビジネスプロフィールのオーナー確認を完了',
      'カテゴリ・営業時間・属性（予約可など）を正確に',
      '写真を最低15枚（外観・内観・メニュー・スタッフ）',
      '週次で「最新情報」投稿。BuzzIt の GBP 投稿モードも活用',
      '口コミは24〜48時間以内に返信（感謝＋具体）',
    ],
    profileUi: [
      'メイン写真は明るく混雑感のない店内 or 代表メニュー',
      '商品メニューがあれば価格帯を載せてミスマッチを減らす',
    ],
    buzzTips: [
      'SNSで認知 → マップで最終確認、の流れが多い。口コミと写真が成約率を左右',
      '投稿に予約URLやクーポンを入れ、Instagramとメッセージを揃える',
    ],
    avoid: ['口コミ無視', '営業時間の放置（信頼を落とす）'],
    buzzitHint: '設定で GBP 連携 → クリエイターから gbp モードで投稿予約',
    link: { label: 'GBP設定', path: '/settings' },
  },
];

/** 投稿の中身の配分 */
export const contentPillars: ContentPillar[] = [
  {
    id: 'educate',
    name: '教育・ノウハウ',
    ratio: '約40–50%',
    description: '保存されやすく、専門家としての信頼を作る。検索・おすすめ双方に強い。',
    examples: [
      '「初めてのカラーで失敗しない3つ」',
      '「ランチ難民が消える店の選び方」',
      'ビフォーアフター＋解説テロップ',
    ],
  },
  {
    id: 'relate',
    name: '共感・日常・舞台裏',
    ratio: '約30%',
    description: '人柄と世界観。フォロー維持とストーリーズ親和性が高い。',
    examples: [
      '仕込中のタイムラプス',
      'スタッフあるある',
      'お客様の喜びの声（許諾済み）',
    ],
  },
  {
    id: 'offer',
    name: 'オファー・予約誘導',
    ratio: '約20–30%',
    description: '成果直結。出しすぎると離脱するので「特典・空き・期限」を明確に。',
    examples: [
      '今週の空き枠',
      'LINE登録限定クーポン',
      '季節メニューの先行案内',
    ],
  },
];

/** バズる冒頭フック */
export const hookPatterns: HookPattern[] = [
  { id: 'h1', name: '結論先出し', example: '「髪のパサつき、実は洗い方より◯◯が原因です」' },
  { id: 'h2', name: 'ターゲット指定', example: '「渋谷で髪質改善を探してる人だけ見て」' },
  { id: 'h3', name: 'ビフォーアフター', example: '最初の1秒で「After」を見せ、理由を後から説明' },
  { id: 'h4', name: '常識壊し', example: '「毎日投稿しても伸びない店の共通点」' },
  { id: 'h5', name: '数字・期間', example: '「30秒でわかる、予約が埋まるプロフィールの作り方」' },
  { id: 'h6', name: '痛み共感', example: '「ネタ切れで投稿が止まった週、うちもそうでした」' },
];

/** おすすめ週間リズム */
export const weeklyRhythm: Array<{ day: string; focus: string; buzzit: string; path?: string }> = [
  { day: '毎日（5分）', focus: 'コクピットで承認・配信確認・健康スコア', buzzit: '経営コクピット', path: '/dashboard' },
  { day: '月・水・金', focus: 'リール or ショート1本（撮影→台本→予約）', buzzit: 'マジック・クリエイター', path: '/magic-creator' },
  { day: '毎日', focus: 'ストーリーズで日常・質問・再シェア', buzzit: '現場運用（アプリ外）' },
  { day: '火 or 木', focus: 'LINEセグメント配信 or ステップ確認', buzzit: 'LINE CRM', path: '/line-crm' },
  { day: '金曜', focus: '週次振り返り（完視聴・LINE追加・予約）', buzzit: '分析・売上', path: '/analytics' },
  { day: '日曜', focus: '翌週ネタ出し（Slack / スタッフ）', buzzit: 'スタッフ', path: '/team' },
];

/** よくあるつまずき */
export const faqs: Array<{ q: string; a: string }> = [
  {
    q: '全部のSNSを同時に始めないといけませんか？',
    a: 'いいえ。最初は Instagram＋LINE の2つで十分です。反応の良い動画だけ TikTok / Shorts に広げましょう。',
  },
  {
    q: 'フォロワーが少ないと意味がありませんか？',
    a: 'ショート動画（特に TikTok・リール）はフォロワーより視聴完了とシェアが評価されます。0人でも商圏に届きます。',
  },
  {
    q: 'バズらないと失敗ですか？',
    a: 'バズは手段です。週次で「プロフィール訪問→LINE追加→予約」が増えていれば成功です。BuzzIt のファネルで確認できます。',
  },
  {
    q: '何を投稿すればいいか分かりません',
    a: 'ボイスドラフトで現場の一言を録音→台本化が最速です。フックテンプレと3本柱に当てはめるだけで迷いません。',
  },
  {
    q: '営業時間外に投稿作業ができません',
    a: 'クリエイターでまとめて予約し、コクピットは開店前5分だけ。承認フローなら店長確認も分散できます。',
  },
];

export function allChecklistIds(): string[] {
  return journeyPhases.flatMap((p) => p.items.map((i) => i.id));
}
