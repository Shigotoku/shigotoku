/**
 * SNS別・伴走ガイド
 * 公式登録サイトへの誘導 → 初投稿 → BuzzIt自動投稿 → バズ / フォロワー増
 */

import { settingsPath } from '../lib/settingsUrls';

export type CompanionStep = {
  id: string;
  title: string;
  detail: string;
  tip?: string;
  /** 公式サイトなど外部URL */
  externalUrl?: string;
  externalLabel?: string;
  /** BuzzIt内導線 */
  appPath?: string;
  appLabel?: string;
};

export type CompanionStage = {
  id: string;
  title: string;
  subtitle: string;
  /** 所要目安 */
  eta: string;
  steps: CompanionStep[];
};

export type PlatformCompanion = {
  id: string;
  name: string;
  priorityNote: string;
  signupUrl: string;
  signupLabel: string;
  helpUrl?: string;
  helpLabel?: string;
  /** 最初の投稿のおすすめネタ */
  firstPostIdea: {
    title: string;
    hook: string;
    body: string;
    cta: string;
  };
  stages: CompanionStage[];
  viralPlaybook: string[];
  followerGrowth: string[];
  commonMistakes: string[];
};

export const COMPANION_STORAGE_KEY = 'buzzit.platformCompanion.v1';

export const platformCompanions: PlatformCompanion[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    priorityNote: '美容・飲食なら最初の母艦。ここを整えてから他媒体へ広げると失敗しにくい。',
    signupUrl: 'https://www.instagram.com/accounts/emailsignup/',
    signupLabel: 'Instagramに新規登録する',
    helpUrl: 'https://help.instagram.com/',
    helpLabel: 'Instagramヘルプセンター',
    firstPostIdea: {
      title: 'お店を30秒で紹介するリール',
      hook: '「〇〇駅から徒歩3分。初めての方へ、うちの強みはこれです」',
      body: '外観→店内→代表メニュー/施術→スタッフの笑顔。テロップで地域名を必ず入れる。',
      cta: '詳しくはプロフィールのLINEへ / 予約リンクへ',
    },
    stages: [
      {
        id: 'ig-register',
        title: '1. アカウント登録',
        subtitle: '公式サイトで開設し、ビジネスアカウントへ',
        eta: '15分',
        steps: [
          {
            id: 'ig-r1',
            title: 'Instagram公式でアカウントを作る',
            detail:
              'メールまたは電話番号で登録。店舗用なら個人アカウントと分け、パスワードをチーム共有可能な形で管理する。',
            externalUrl: 'https://www.instagram.com/accounts/emailsignup/',
            externalLabel: '新規登録ページを開く',
          },
          {
            id: 'ig-r2',
            title: 'プロフェッショナルアカウントに切り替える',
            detail:
              '設定 → アカウントの種類とツール → プロフェッショナルアカウントに切り替え → 「ビジネス」を選択。カテゴリは業種に近いものを選ぶ。',
            tip: 'クリエイターではなく「ビジネス」にすると連絡ボタンや広告連携がしやすい。',
            externalUrl: 'https://help.instagram.com/502981923235522',
            externalLabel: '切替手順（公式ヘルプ）',
          },
          {
            id: 'ig-r3',
            title: 'Meta Business Suite / ビジネスポートフォリオを用意',
            detail:
              '後でBuzzItのMeta連携に必要。FacebookページとInstagramを同じビジネスポートフォリオに紐づける。',
            externalUrl: 'https://business.facebook.com/',
            externalLabel: 'Meta Business Suiteを開く',
            tip: '「Facebookページが無い」場合は新規作成してからInstagramを接続。',
          },
        ],
      },
      {
        id: 'ig-profile',
        title: '2. プロフィールを看板にする',
        subtitle: '3秒で「何のお店か」が分かる状態へ',
        eta: '20分',
        steps: [
          {
            id: 'ig-p1',
            title: '名前欄・ユーザーネームを最適化',
            detail:
              '名前欄: 地域＋業種＋強み（例: 渋谷｜髪質改善サロン ○○）。ユーザーネームは短く覚えやすい英数字。',
          },
          {
            id: 'ig-p2',
            title: '自己紹介3行＋リンク',
            detail:
              '①誰向け ②何が得意 ③次の行動（LINE登録/予約）。リンクは1本に絞る（Linktreeより単一URLの方が迷わない）。',
            tip: 'まずはLINE友だち追加URLか予約ページ。BuzzItの流入経路短縮URLも使える。',
            appPath: '/line-crm',
            appLabel: 'LINE流入経路を発行',
          },
          {
            id: 'ig-p3',
            title: 'ハイライト4本を用意',
            detail: 'メニュー / 口コミ / アクセス / クーポン。表紙は文字大きめの静止画で統一感を出す。',
          },
        ],
      },
      {
        id: 'ig-first',
        title: '3. 最初の投稿',
        subtitle: '完璧より「型」を1本書く',
        eta: '30分',
        steps: [
          {
            id: 'ig-f1',
            title: 'スマホ縦動画でお店紹介を撮る',
            detail:
              '9:16、15〜30秒。冒頭2秒で店名と地域。無音でも分かるテロップを入れる。',
          },
          {
            id: 'ig-f2',
            title: 'BuzzItで台本・キャプションを整える',
            detail:
              'マジック・クリエイターに「初めての人向けお店紹介」と録音/メモを渡す。Reels用にRepurpose。',
            appPath: '/magic-creator',
            appLabel: 'クリエイターで台本作成',
          },
          {
            id: 'ig-f3',
            title: 'ハッシュタグは3〜5個だけ',
            detail: '巨大タグより、地域＋業種の中規模タグ。投稿後1時間はコメント・DMに返信。',
          },
        ],
      },
      {
        id: 'ig-auto',
        title: '4. 自動投稿の動線（BuzzIt）',
        subtitle: '撮影→予約→承認→Meta投稿までを型化',
        eta: '25分',
        steps: [
          {
            id: 'ig-a1',
            title: '設定でMeta（Instagram）を連携',
            detail: 'OAuthでIGビジネスアカウントとFacebookページを接続。連携バッジが付くまで完了。',
            appPath: settingsPath({ section: 'meta' }),
            appLabel: '設定でMeta連携',
          },
          {
            id: 'ig-a2',
            title: '投稿モードを「承認後」または「Meta」に',
            detail:
              '最初の2週間は「承認後」推奨。慣れたら Meta 直接 / Auto Mode。ブランドセーフティも確認。',
            appPath: settingsPath({ section: 'publish-mode' }),
            appLabel: '投稿モードを設定',
          },
          {
            id: 'ig-a3',
            title: 'クリエイターで予約投稿→コクピットで承認',
            detail:
              '週3本分をまとめて予約。毎朝コクピットで承認するだけで運用が回る。',
            appPath: '/dashboard',
            appLabel: 'コクピットを開く',
            tip: 'スタッフにネタ投稿を依頼し、店長だけ承認、が続きやすい分担。',
          },
        ],
      },
      {
        id: 'ig-grow',
        title: '5. 伸ばす（バズ・フォロワー）',
        subtitle: '再生とフォローを分ける',
        eta: '継続',
        steps: [
          {
            id: 'ig-g1',
            title: 'バズる投稿の型を週1回テスト',
            detail:
              'フックを変えた同テーマを比較。完視聴率と保存・シェアを見る（いいねは参考程度）。',
            appPath: '/analytics',
            appLabel: '分析を見る',
          },
          {
            id: 'ig-g2',
            title: 'フォロワー増は「プロフ→特典」設計',
            detail:
              '伸びたリールのCTAを「フォローしてハイライトのクーポンへ」に統一。ストーリーズで日常接触を増やす。',
          },
        ],
      },
    ],
    viralPlaybook: [
      '冒頭2秒で2カット＋結論テロップ（スクロールを止める）',
      '15〜30秒、顔出し or ビフォーアフターを優先',
      '「保存したくなる」チェックリスト型・数字型を混ぜる',
      '投稿直後にストーリーズへ再シェア＋質問スタンプ',
      '反応の良い音・テンポをメモし、勝ちパターンを横展開',
    ],
    followerGrowth: [
      'プロフィールを「特典付きLP」にする（何がもらえるか明示）',
      'リール終わりのCTAを毎週同じ文言に固定し、習慣化する',
      'ハイライトに「初めての方へ」を置き、フォロー後の迷子を防ぐ',
      'UGC（お客様投稿）を許可取りのうえ週1リポスト',
      '週3リール＋毎日ストーリーズを4週間止めない（フォローは継続の関数）',
    ],
    commonMistakes: [
      '個人アカウントのまま連携できず詰まる → ビジネスへ切替',
      'リンク先がホームページだけで予約できない',
      '売り込み投稿が連続してフォロー解除される',
    ],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    priorityNote: 'フォロワー0でもリーチできる拡散口。IGで型ができた後に始めると効率的。',
    signupUrl: 'https://www.tiktok.com/signup',
    signupLabel: 'TikTokに新規登録する',
    helpUrl: 'https://support.tiktok.com/',
    helpLabel: 'TikTokサポート',
    firstPostIdea: {
      title: '商圏あるある＋お店の解決策',
      hook: '「〇〇駅周辺で△△に困ってる人、これ知ってる？」',
      body: 'あるある→解決の一言→店内ワンカット。コメントで「どっち派？」を聞く。',
      cta: '予約/詳細はプロフィールのリンクへ',
    },
    stages: [
      {
        id: 'tt-register',
        title: '1. アカウント登録',
        subtitle: '公式登録→ビジネスアカウント',
        eta: '15分',
        steps: [
          {
            id: 'tt-r1',
            title: 'TikTok公式でアカウント作成',
            detail: '店舗用メールで登録。表示名に地域＋業種を入れる。',
            externalUrl: 'https://www.tiktok.com/signup',
            externalLabel: 'TikTok新規登録',
          },
          {
            id: 'tt-r2',
            title: 'ビジネスアカウントに切り替え',
            detail:
              'プロフィール → メニュー → 設定とプライバシー → アカウントを管理 → ビジネスアカウントに切り替え。',
            externalUrl: 'https://www.tiktok.com/business/ja-JP',
            externalLabel: 'TikTok for Business',
            tip: 'ウェブサイト・電話・メッセージの導線をプロフィールに追加できる。',
          },
          {
            id: 'tt-r3',
            title: 'プロフィールリンクにLINE/予約を設定',
            detail: 'BuzzItの流入経路URLや予約URLを1本置く。Instagramと同じ導線に揃える。',
            appPath: '/line-crm',
            appLabel: 'LINE経路URLを作る',
          },
        ],
      },
      {
        id: 'tt-first',
        title: '2. 最初の10本（実験期間）',
        subtitle: '完成度よりフック検証',
        eta: '1週間',
        steps: [
          {
            id: 'tt-f1',
            title: '冒頭1秒の型を5つ用意',
            detail: 'ズーム / 結論テロップ / あるある / BeforeAfter / 問いかけ。BuzzItで台本化。',
            appPath: '/magic-creator',
            appLabel: 'フック台本を生成',
          },
          {
            id: 'tt-f2',
            title: 'ウォーターマークなしで書き出す',
            detail: '後でIG/Shortsへ横展開するため、編集アプリでロゴなし書き出しを徹底。',
          },
          {
            id: 'tt-f3',
            title: 'コメントに即返信',
            detail: '投稿後2時間は通知を見る。返信自体がおすすめ配信のシグナルになる。',
          },
        ],
      },
      {
        id: 'tt-auto',
        title: '3. BuzzItでの制作自動化',
        subtitle: 'IG検証済み→TikTok用に短縮',
        eta: '継続',
        steps: [
          {
            id: 'tt-a1',
            title: '反応の良いリール台本を再利用',
            detail:
              'クリエイターで「TikTok向けに15秒・テンポ速め」と指示してRepurpose。投稿自体はTikTokアプリ or 今後の連携。',
            appPath: '/magic-creator',
            appLabel: 'Repurposeする',
          },
          {
            id: 'tt-a2',
            title: '週次で勝ちパターンだけ残す',
            detail: 'コクピットと分析で「保存・コメントが付いた型」をメモし、翌週の3割をそれに寄せる。',
            appPath: '/analytics',
            appLabel: '分析へ',
          },
        ],
      },
      {
        id: 'tt-grow',
        title: '4. バズとフォロワー',
        subtitle: '再生≠フォロー。導線で回収',
        eta: '継続',
        steps: [
          {
            id: 'tt-g1',
            title: 'バズったらプロフィール誘導を強化',
            detail: '固定動画を「初めての人向け」に差し替え。バイオCTAを明確に。',
          },
          {
            id: 'tt-g2',
            title: 'シリーズ化でフォロー動機を作る',
            detail: '「第1話」「毎週火曜」など続きが見たくなる設計。',
          },
        ],
      },
    ],
    viralPlaybook: [
      'おすすめはフォロー数より視聴完了・共有で決まる → 初日から勝負',
      '最初の1秒で動きとテロップ',
      'ローカルネタ（駅・あるある）で商圏リーチ',
      'コメント誘導の問いを必ず1つ入れる',
      'トレンド音は補助。無音理解できる構成が本命',
    ],
    followerGrowth: [
      '固定動画＋バイオで「フォローする理由」を一文で示す',
      'シリーズ名・曜日を固定し、期待値を作る',
      '伸びた動画の型だけ量産（新規アイデアに散らさない）',
      'プロフィールからLINEへ通し、フォロー以外の成果も取る',
    ],
    commonMistakes: [
      '他SNSのロゴ入り動画を上げてリーチを落とす',
      'バズだけで予約導線がない',
    ],
  },
  {
    id: 'line',
    name: 'LINE公式アカウント',
    priorityNote: 'リピートと予約の受け皿。SNSと同時に開設するのが店舗の正解。',
    signupUrl: 'https://www.linebiz.com/jp/entry/',
    signupLabel: 'LINE公式アカウントを開設する',
    helpUrl: 'https://www.linebiz.com/jp/manual/OfficialAccountManager/',
    helpLabel: '管理画面マニュアル',
    firstPostIdea: {
      title: '友だち追加お礼＋初回特典',
      hook: '「追加ありがとう！初回限定クーポンはこちら」',
      body: '特典内容→使い方→予約方法。リッチメニューからも同じ導線。',
      cta: '予約する / メニューを見る',
    },
    stages: [
      {
        id: 'ln-register',
        title: '1. 公式アカウント開設',
        subtitle: 'LINE Bizから開設→Messaging API',
        eta: '30分',
        steps: [
          {
            id: 'ln-r1',
            title: 'LINE公式アカウントを新規作成',
            detail:
              'LINE Bizのエントリーから開設。アカウント名は店舗名＋地域が分かりやすい。',
            externalUrl: 'https://www.linebiz.com/jp/entry/',
            externalLabel: 'LINE Bizで開設',
          },
          {
            id: 'ln-r2',
            title: 'LINE Developersでチャネルを作成',
            detail:
              'Messaging APIチャネルを用意し、Channel Secret と Channel Access Token（長期）を発行。',
            externalUrl: 'https://developers.line.biz/console/',
            externalLabel: 'LINE Developersコンソール',
            tip: 'Webhook をオンにし、BuzzIt設定画面のWebhook URLを貼る。',
          },
          {
            id: 'ln-r3',
            title: 'BuzzItの設定にトークンを保存',
            detail: 'Channel Access Token / Secret を貼り付け保存。Webhook URLをコピーしてDevelopersへ。',
            appPath: settingsPath({ section: 'line' }),
            appLabel: '設定でLINE連携',
          },
        ],
      },
      {
        id: 'ln-setup',
        title: '2. 受け皿を整える',
        subtitle: 'あいさつ・リッチメニュー・経路',
        eta: '40分',
        steps: [
          {
            id: 'ln-s1',
            title: 'あいさつメッセージを設定',
            detail: '特典→次にやること、の順。管理画面またはステップ配信で歓迎を自動化。',
            appPath: '/line-crm',
            appLabel: 'ステップ配信を作る',
          },
          {
            id: 'ln-s2',
            title: 'リッチメニューを作成',
            detail: '予約・クーポン・アクセス・相談の4区画が基本。BuzzItから画像付きで作成可。',
            appPath: '/line-crm',
            appLabel: 'リッチメニュータブへ',
          },
          {
            id: 'ln-s3',
            title: '流入経路URLを媒体別に発行',
            detail: 'Instagram用・店頭QR用など分けて発行し、どこから友だちが増えたか計測。',
            appPath: '/line-crm',
            appLabel: '流入経路を発行',
          },
        ],
      },
      {
        id: 'ln-auto',
        title: '3. 自動フォロー（ステップ）',
        subtitle: '追加→歓迎→リマインド→再来',
        eta: '30分',
        steps: [
          {
            id: 'ln-a1',
            title: 'ウェルカムシナリオを1本有効化',
            detail:
              '0分: お礼＋クーポン / 翌日: 予約案内 / 7日後: 来店リマインド。status=activeでワーカーが送信。',
            appPath: '/line-crm',
            appLabel: 'ステップ配信',
          },
          {
            id: 'ln-a2',
            title: 'セグメント配信でコスト抑制',
            detail: '全員配信せずタグ別（新規/常連）に分ける。料金改定対策にもなる。',
            appPath: '/line-crm',
            appLabel: 'セグメント配信',
          },
        ],
      },
      {
        id: 'ln-grow',
        title: '4. 友だちを増やす・育てる',
        subtitle: 'SNSと店頭の両方から',
        eta: '継続',
        steps: [
          {
            id: 'ln-g1',
            title: '全SNSのプロフィールにLINEを置く',
            detail: '同じ特典文言に揃えると転換率が安定する。',
          },
          {
            id: 'ln-g2',
            title: '来店時にQRを必ず案内',
            detail: '会計時・待機時。経路を「店頭」に分けて効果測定。',
          },
        ],
      },
    ],
    viralPlaybook: [
      'LINE単体の「バズ」より、SNSで認知→LINEで関係、が本筋',
      '配信は得情報のみ。営業連投はブロック率悪化',
      'リッチメニューの画像を季節で差し替え注目を維持',
      'クーポン期限を短くして来店を前倒し',
    ],
    followerGrowth: [
      'SNSプロフィール・ストーリーズ・店頭QRの三本柱',
      '特典を「今だけ」にして追加動機を明確に',
      'ステップで価値を先出しし、ブロックされない関係を作る',
      'タグ付けして「自分向けの情報」と感じさせる',
    ],
    commonMistakes: [
      'Messaging API未設定でBuzzIt連携できない',
      '全員一斉配信だけでコストとブロックが増える',
    ],
  },
  {
    id: 'youtube-shorts',
    name: 'YouTube Shorts',
    priorityNote: '検索で長期間効く資産型。ハウツー業種と相性が良い。',
    signupUrl: 'https://accounts.google.com/signup',
    signupLabel: 'Googleアカウントを作成',
    helpUrl: 'https://support.google.com/youtube/answer/15451632',
    helpLabel: 'Shortsの公式ヘルプ',
    firstPostIdea: {
      title: 'よくある質問に30秒で答える',
      hook: '「初めての〇〇、何から始めればいい？」',
      body: '結論→3ステップ→CTA。タイトルに地域や施術名キーワード。',
      cta: '概要欄のLINE/予約へ',
    },
    stages: [
      {
        id: 'yt-register',
        title: '1. チャンネル開設',
        subtitle: 'Googleアカウント→YouTubeチャンネル',
        eta: '20分',
        steps: [
          {
            id: 'yt-r1',
            title: 'Googleアカウントを用意',
            detail: '店舗用Googleアカウントが望ましい（マップ/GBPと共通化できる）。',
            externalUrl: 'https://accounts.google.com/signup',
            externalLabel: 'Googleアカウント作成',
          },
          {
            id: 'yt-r2',
            title: 'YouTubeチャンネルを作成',
            detail: 'YouTube → 設定 → チャンネルを作成。アイコン・バナー・概要欄を埋める。',
            externalUrl: 'https://www.youtube.com/create_channel',
            externalLabel: 'チャンネル作成',
          },
          {
            id: 'yt-r3',
            title: '概要欄に予約/LINEリンク',
            detail: 'Shortsからも概要欄経由で遷移できるよう、リンクを明記。',
          },
        ],
      },
      {
        id: 'yt-first',
        title: '2. 最初のShorts',
        subtitle: 'キーワード入りタイトルが命',
        eta: '30分',
        steps: [
          {
            id: 'yt-f1',
            title: '縦動画＋話し言葉タイトル',
            detail: '「〇〇のやり方」「△△ 失敗しない」など検索されやすい文言。',
            appPath: '/magic-creator',
            appLabel: '台本を作る',
          },
          {
            id: 'yt-f2',
            title: '終わりに必ずCTA',
            detail: '「詳しくは概要欄のLINEへ」。BuzzItでキャプション生成。',
          },
        ],
      },
      {
        id: 'yt-auto',
        title: '3. 制作の自動化',
        subtitle: 'ワンソース・マルチ配信',
        eta: '継続',
        steps: [
          {
            id: 'yt-a1',
            title: 'IG/TikTokの勝ち動画をShortsへ',
            detail: 'ロゴなし素材を使い回し。タイトルだけ検索向けに書き換える。',
            appPath: '/magic-creator',
            appLabel: 'タイトル案を生成',
          },
        ],
      },
      {
        id: 'yt-grow',
        title: '4. 再生と登録者',
        subtitle: '登録はシリーズと信頼',
        eta: '継続',
        steps: [
          {
            id: 'yt-g1',
            title: '再生リストでシリーズ化',
            detail: '「初めての方へ」「よくある質問」を作り、次の動画を提案。',
          },
          {
            id: 'yt-g2',
            title: '長尺は余裕ができてから',
            detail: 'まずはShortsで入口。信頼が要る商材は後から解説動画。',
          },
        ],
      },
    ],
    viralPlaybook: [
      'タイトルと冒頭3秒の一致（釣りタイトルは逆効果）',
      '検索ワードを話し言葉で入れる',
      'エバーグリーン（季節を問わない）ネタを半分以上',
      'エンド画面・関連で次のShortsへ繋ぐ',
    ],
    followerGrowth: [
      'チャンネルトレーラー15秒で世界観を伝える',
      '再生リストの並びで「学習の順番」を見せる',
      '概要欄CTAを固定し、登録以外の成果（LINE）も取る',
      'コメントへの返信でコミュニティ感を出す',
    ],
    commonMistakes: [
      'タイトルが抽象的で検索に引っかからない',
      'CTAがなく視聴だけで終わる',
    ],
  },
  {
    id: 'x',
    name: 'X（旧Twitter）',
    priorityNote: '速報・採用・キャンペーン向き。母艦ではなく補助チャネル。',
    signupUrl: 'https://twitter.com/i/flow/signup',
    signupLabel: 'Xに新規登録する',
    helpUrl: 'https://help.x.com/',
    helpLabel: 'Xヘルプセンター',
    firstPostIdea: {
      title: '今日のひとこと＋写真',
      hook: '「本日の空き、あと2枠です」',
      body: '店内写真1枚＋温かい一文。固定ポストにメニューとアクセス。',
      cta: '予約はプロフィールのリンクから',
    },
    stages: [
      {
        id: 'x-register',
        title: '1. アカウント登録',
        subtitle: '公式フローで開設',
        eta: '10分',
        steps: [
          {
            id: 'x-r1',
            title: 'Xアカウントを作成',
            detail: '店舗用ハンドルを取得。プロフィールに地域・業種・予約リンク。',
            externalUrl: 'https://twitter.com/i/flow/signup',
            externalLabel: 'X新規登録',
          },
          {
            id: 'x-r2',
            title: '固定ポストを設定',
            detail: 'メニュー・営業時間・アクセス・予約URLをまとめた1投稿を固定。',
          },
        ],
      },
      {
        id: 'x-first',
        title: '2. 投稿の型',
        subtitle: '鮮度コンテンツ',
        eta: '継続',
        steps: [
          {
            id: 'x-f1',
            title: 'BuzzItでスレッド台本',
            detail: 'ノウハウはスレッド、空き情報は単発。クリエイターのx_threadを活用。',
            appPath: '/magic-creator',
            appLabel: 'スレッド台本',
          },
        ],
      },
      {
        id: 'x-grow',
        title: '3. フォロワーと拡散',
        subtitle: '会話がアルゴリズム',
        eta: '継続',
        steps: [
          {
            id: 'x-g1',
            title: '地域アカウントとリプライ',
            detail: '一方的な告知だけでなく、会話でタイムラインに残る。',
          },
        ],
      },
    ],
    viralPlaybook: [
      '短文＋画像1枚が基本',
      'タイミング（昼前・夕方）の空き告知は刺さりやすい',
      'キャンペーンはハッシュタグを1つに絞る',
      '引用リポストでお客様の声を広げる（許諾必須）',
    ],
    followerGrowth: [
      '毎日1投稿の鮮度で「フォローしている価値」を出す',
      'プロフィールと固定ポストを整える',
      '業界・地域の話題に誠実に絡む',
    ],
    commonMistakes: ['感情的な返信', '他アカウントの無断転載'],
  },
  {
    id: 'facebook-threads',
    name: 'Facebook / Threads',
    priorityNote: 'Meta連携の副次チャネル。IGと同時に整えると効率的。',
    signupUrl: 'https://www.facebook.com/pages/create',
    signupLabel: 'Facebookページを作成',
    helpUrl: 'https://www.facebook.com/business/help',
    helpLabel: 'Metaビジネスヘルプ',
    firstPostIdea: {
      title: 'ページ紹介＋営業時間',
      hook: '「本日オープンしています」',
      body: '外観写真、営業時間、地図。予約ボタンを有効化。',
      cta: '予約・メッセージはページから',
    },
    stages: [
      {
        id: 'fb-register',
        title: '1. ページ作成と接続',
        subtitle: 'Facebookページ ↔ Instagram',
        eta: '25分',
        steps: [
          {
            id: 'fb-r1',
            title: 'Facebookページを作成',
            detail: '店舗名・カテゴリ・住所・電話を正確に。',
            externalUrl: 'https://www.facebook.com/pages/create',
            externalLabel: 'ページ作成',
          },
          {
            id: 'fb-r2',
            title: 'Instagramと接続',
            detail: 'プロフェッショナルダッシュボードまたはMeta Business Suiteでリンク。',
            externalUrl: 'https://business.facebook.com/',
            externalLabel: 'Meta Business Suite',
          },
          {
            id: 'fb-r3',
            title: 'BuzzItでMeta OAuth',
            detail: 'Page / IG / Threads をまとめて連携。',
            appPath: settingsPath({ section: 'meta' }),
            appLabel: 'Meta連携設定',
          },
        ],
      },
      {
        id: 'fb-auto',
        title: '2. 自動投稿',
        subtitle: 'IG制作を横展開',
        eta: '10分',
        steps: [
          {
            id: 'fb-a1',
            title: 'publishMode を meta に',
            detail: 'クリエイターから予約すればFB/Threads側にも届けられる構成へ。',
            appPath: '/magic-creator',
            appLabel: '予約投稿する',
          },
        ],
      },
      {
        id: 'fb-grow',
        title: '3. 地域での認知',
        subtitle: 'イベント・口コミ',
        eta: '継続',
        steps: [
          {
            id: 'fb-g1',
            title: '口コミ返信とイベント告知',
            detail: '地域イベントへの参加表明はFacebookと相性が良い。',
          },
        ],
      },
    ],
    viralPlaybook: [
      '主戦場はIG。FBは再利用で十分',
      '地域の話題・イベントとの親和性を活かす',
      'Threadsは短文Q&A・裏側トーク向き',
    ],
    followerGrowth: [
      'ページの「フォローする理由」（特典・更新頻度）をAboutに書く',
      'IGと同じ世界観のカバー写真',
      'シェアされやすいお役立ち投稿を月数本',
    ],
    commonMistakes: ['Facebookだけに全力投球して母艦が育たない'],
  },
  {
    id: 'gbp',
    name: 'Googleビジネスプロフィール',
    priorityNote: '来店直前層の生命線。「近くの〇〇」検索で選ばれるための必須枠。',
    signupUrl: 'https://www.google.com/business/',
    signupLabel: 'ビジネスプロフィールを開く',
    helpUrl: 'https://support.google.com/business/',
    helpLabel: 'GBPヘルプ',
    firstPostIdea: {
      title: '最新情報：季節メニュー or キャンペーン',
      hook: '「今週末まで〇〇キャンペーン」',
      body: '写真＋短い説明＋予約URL。SNSと同じ訴求に揃える。',
      cta: '予約する',
    },
    stages: [
      {
        id: 'gb-register',
        title: '1. オーナー確認',
        subtitle: '地図に店舗を出す',
        eta: '1〜数日（ハガキの場合あり）',
        steps: [
          {
            id: 'gb-r1',
            title: 'ビジネスプロフィールを登録/管理',
            detail: '店舗を検索し、オーナー確認を完了。ハガキ・電話・メールのいずれか。',
            externalUrl: 'https://www.google.com/business/',
            externalLabel: 'Googleビジネスプロフィール',
          },
          {
            id: 'gb-r2',
            title: '基本情報を正確に',
            detail: 'カテゴリ、営業時間、属性（予約可）、電話、ウェブサイト。SNSと表記ゆれをなくす。',
          },
          {
            id: 'gb-r3',
            title: '写真を15枚以上',
            detail: '外観・内観・メニュー・スタッフ。明るい写真をメインに。',
          },
        ],
      },
      {
        id: 'gb-post',
        title: '2. 投稿と口コミ',
        subtitle: '週1投稿＋返信',
        eta: '継続',
        steps: [
          {
            id: 'gb-p1',
            title: '最新情報を週1投稿',
            detail: 'BuzzItのGBP投稿モード（対応プラン）や管理画面から。',
            appPath: settingsPath({ section: 'gbp' }),
            appLabel: 'GBP設定',
          },
          {
            id: 'gb-p2',
            title: '口コミは48時間以内に返信',
            detail: '感謝＋具体（メニュー名など）。悪い評価も丁寧に事実確認。',
          },
        ],
      },
      {
        id: 'gb-grow',
        title: '3. 来店転換',
        subtitle: 'SNSとメッセージを揃える',
        eta: '継続',
        steps: [
          {
            id: 'gb-g1',
            title: '予約URLをプロフィールと投稿に',
            detail: 'Instagramと同じ予約先に揃えると取りこぼしが減る。',
            appPath: settingsPath({ tab: 'business' }),
            appLabel: '予約URLを設定',
          },
        ],
      },
    ],
    viralPlaybook: [
      'マップに「バズ」は少ない。写真・口コミ・投稿の鮮度が順位とクリックを左右',
      'キーワードはビジネス説明に自然に（詰め込みすぎない）',
      'SNSで認知→マップで最終確認、の流れを意識',
    ],
    followerGrowth: [
      '「フォロー」よりルート検索・電話・予約がKPI',
      '口コミ依頼を来店後LINEステップに組み込む',
      '写真の月次追加で鮮度を維持',
    ],
    commonMistakes: ['営業時間の放置', '口コミ無視', '住所・電話の不一致'],
  },
];

export function getPlatformCompanion(id: string): PlatformCompanion | undefined {
  return platformCompanions.find((p) => p.id === id);
}

export function allCompanionStepIds(companion: PlatformCompanion): string[] {
  return companion.stages.flatMap((s) => s.steps.map((st) => st.id));
}
