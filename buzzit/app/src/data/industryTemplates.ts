import type { ContentPillar, HookPattern } from './growthRoadmap';

export type IndustryId =
  | 'beauty'
  | 'food'
  | 'fitness'
  | 'retail'
  | 'education'
  | 'medical'
  | 'service'
  | 'professional'
  | 'general';

export type IndustryTemplate = {
  id: IndustryId;
  label: string;
  blurb: string;
  /** 最初に集中すべき媒体 */
  primaryPlatforms: string[];
  /** 推奨導線 */
  funnel: string;
  profileNameExample: string;
  bioExample: string;
  kpi: string;
  weekIdeas: string[];
  hooks: HookPattern[];
  pillars: ContentPillar[];
  startOrder: string[];
};

export const INDUSTRY_STORAGE_KEY = 'buzzit.growthRoadmap.industry.v1';

export const industryTemplates: IndustryTemplate[] = [
  {
    id: 'beauty',
    label: '美容・サロン',
    blurb: 'ビフォーアフターと髪質・肌悩みの教育が最強。HPB×LINEで予約に閉じる。',
    primaryPlatforms: ['Instagram', 'LINE', 'TikTok'],
    funnel: 'リール / TikTok → Instagramプロフィール → LINE or HPB予約',
    profileNameExample: '渋谷｜髪質改善特化サロン ○○',
    bioExample:
      'ダメージレスカラーが得意｜初めての方も安心\nカウンセリング30分〜\nご予約・特典は下のリンクから',
    kpi: 'HPB / 予約サイト経由の新規予約数',
    weekIdeas: [
      'ビフォーアフター（Before→工程→After）',
      '「カラーがすぐ落ちる人」向けケア解説',
      'スタイリストの仕込み風景（ストーリーズ）',
      '今週の空き枠＋LINE限定クーポン',
      'お客様の喜びの声（許諾済み）',
      '季節メニュー（梅雨・紫外線など）',
      '来店の流れを15秒で説明',
    ],
    hooks: [
      { id: 'b1', name: 'ビフォーアフター', example: '最初の1秒で「After」を見せる →「実はこの工程だけ変えた」' },
      { id: 'b2', name: 'ターゲット指定', example: '「ブリーチ履歴がある人だけ見て。次のカラーで失敗しやすい理由」' },
      { id: 'b3', name: '痛み共感', example: '「毎回「前と同じで」って言ってるのに仕上がりが違う…それ、ここが原因」' },
      { id: 'b4', name: '数字', example: '「髪のパサつき、洗い方を3つ変えるだけで翌朝が変わる」' },
    ],
    pillars: [
      {
        id: 'educate',
        name: '教育・ケア知識',
        ratio: '約45%',
        description: '保存されやすく、指名予約につながる専門性を示す。',
        examples: ['カラー持ちを伸ばす自宅ケア', '髪質別おすすめカット', 'NGホームカラーの理由'],
      },
      {
        id: 'relate',
        name: '仕上がり・舞台裏',
        ratio: '約35%',
        description: '世界観と人柄。スタイリスト指名の決め手になる。',
        examples: ['施術タイムラプス', 'スタイリスト紹介', 'サロンの空気感'],
      },
      {
        id: 'offer',
        name: '予約・特典',
        ratio: '約20%',
        description: '空き枠とLINE特典で行動を起こさせる。出しすぎ注意。',
        examples: ['今週の空き', '新規クーポン', '季節メニュー先行案内'],
      },
    ],
    startOrder: [
      'Instagramビジネスアカウント＋プロフィール最適化',
      'BuzzIt で Meta 連携',
      'LINE公式＋リッチメニュー（予約/クーポン）',
      'ビフォーアフターリールを週3本',
      'HPBトラッキングを設定で有効化',
    ],
  },
  {
    id: 'food',
    label: '飲食',
    blurb: 'シズル感と「今日行ける理由」が命。マップ（GBP）と週末需要を意識。',
    primaryPlatforms: ['Instagram', 'Googleマップ', 'LINE'],
    funnel: 'リール / ショート → プロフィール or マップ → 来店・予約・LINEクーポン',
    profileNameExample: '恵比寿｜炭火焼鳥 ○○ — 当日OK',
    bioExample:
      '炭火にこだわった本格焼鳥\nランチ11:30– / 夜は予約優先\n席の空き・クーポンはLINEへ',
    kpi: '週末来店数・予約数・LINEクーポン利用',
    weekIdeas: [
      '本日の一品シズル動画（音あり）',
      '「一人飲み歓迎」の店内雰囲気',
      '仕込み・焼き上がりの冒頭フック',
      'ランチ限定メニュー紹介',
      '席の空き情報（ストーリーズ）',
      '常連さんの推しメニュー（許諾）',
      'アクセス・目印の15秒ガイド',
    ],
    hooks: [
      { id: 'fo1', name: 'シズル先出し', example: '最初の0.5秒で湯気・焼き色・断面をアップで見せる' },
      { id: 'fo2', name: '今日行ける', example: '「今日18時からカウンター2席空いてます」' },
      { id: 'fo3', name: 'あるある', example: '「駅近なのに静かなお店を探してる人へ」' },
      { id: 'fo4', name: '数字', example: '「仕込み4時間、提供は8分。その差が旨さです」' },
    ],
    pillars: [
      {
        id: 'educate',
        name: 'こだわり・選び方',
        ratio: '約30%',
        description: '食材・調理のストーリーでファン化。',
        examples: ['産地紹介', '焼き加減の解説', 'ペアリング提案'],
      },
      {
        id: 'relate',
        name: 'シズル・日常',
        ratio: '約45%',
        description: '食欲と来店動機を直接刺激する主戦場。',
        examples: ['本日の一品', '満席前の店内', 'スタッフの一言'],
      },
      {
        id: 'offer',
        name: '来店促進',
        ratio: '約25%',
        description: '空き・クーポン・期間限定で「今行く理由」を作る。',
        examples: ['今日の空き', 'LINE限定お通し', '季節フェア'],
      },
    ],
    startOrder: [
      'Googleビジネスプロフィールを最新化（写真・営業時間）',
      'Instagramでシズルリール週3',
      'BuzzIt Meta 連携＋予約投稿',
      'LINEで当日クーポン導線',
      '口コミ返信を48時間以内に習慣化',
    ],
  },
  {
    id: 'fitness',
    label: 'ジム・パーソナル',
    blurb: '変化の可視化と「続く仕組み」が信頼になる。体験予約への導線を短く。',
    primaryPlatforms: ['Instagram', 'YouTube Shorts', 'LINE'],
    funnel: 'ショート動画 → 体験予約フォーム / LINE → 継続プラン',
    profileNameExample: '中目黒｜パーソナルジム ○○ — 初心者歓迎',
    bioExample:
      '運動が続かなかった人専門\n初回体験60分\n体の悩み相談はLINEから（押し売りしません）',
    kpi: '体験予約数・体験→入会率',
    weekIdeas: [
      'ビフォーアフター（期間・条件を明示）',
      '自宅でできる1分ストレッチ',
      'よくあるフォームミス解説',
      'トレーナーの人柄紹介',
      '体験の流れをショートで',
      'お客様インタビュー（許諾）',
      '今週の体験枠オープン告知',
    ],
    hooks: [
      { id: 'fi1', name: '変化先出し', example: '「3ヶ月で姿勢がこう変わりました（条件つき）」' },
      { id: 'fi2', name: '痛み共感', example: '「筋トレ始めたのにすぐ挫折する人、原因はこれ」' },
      { id: 'fi3', name: '禁止系', example: '「絶対にやってはいけないスクワット」' },
      { id: 'fi4', name: 'ターゲット', example: '「デスクワークで肩こりが取れない人だけ見て」' },
    ],
    pillars: [
      {
        id: 'educate',
        name: 'ハウツー・フォーム',
        ratio: '約50%',
        description: '保存されやすく、専門家としての権威を作る。',
        examples: ['正しいフォーム', '食事の基本', '休息の重要性'],
      },
      {
        id: 'relate',
        name: '変化・コミュニティ',
        ratio: '約30%',
        description: '「自分にもできそう」を見せる。',
        examples: ['会員の変化', 'トレーニング風景', 'Q&A'],
      },
      {
        id: 'offer',
        name: '体験誘導',
        ratio: '約20%',
        description: '押し売り感を抑え、相談・体験へ自然に誘導。',
        examples: ['体験枠', 'LINE相談', '期間キャンペーン'],
      },
    ],
    startOrder: [
      'プロフィールに体験CTAを明確化',
      'ハウツーShorts / リールを週3',
      'LINEステップで体験前フォロー',
      'BuzzIt で台本→予約投稿',
      '成功事例を月2本ストック',
    ],
  },
  {
    id: 'retail',
    label: '小売・EC',
    blurb: '商品の使い方UGCと「今買う理由」。保存・シェアを狙う教育投稿が効く。',
    primaryPlatforms: ['Instagram', 'TikTok', 'LINE'],
    funnel: 'ショート → プロフィールショップ / LP → LINEでリピート',
    profileNameExample: '肌にやさしい日用品｜○○公式',
    bioExample:
      '敏感肌でも使える〇〇専門\n使い方動画を毎日更新\n限定クーポンはLINE登録で',
    kpi: 'プロフィール経由の購入・LINE経由リピート',
    weekIdeas: [
      '開封・使用シーンのシズル',
      '「こんな人に向いてない」正直レビュー',
      'お客様の使い方UGCリポスト',
      '比較（ビフォー／他商品との違い）',
      '在庫わずかの告知',
      'セット購入の提案',
      'FAQを15秒で回答',
    ],
    hooks: [
      { id: 'r1', name: '意外性', example: '「高い成分より、先にやめるべき習慣があります」' },
      { id: 'r2', name: 'デモ', example: '最初の2秒で「使う前→使った後」の変化を見せる' },
      { id: 'r3', name: 'ターゲット', example: '「ギフト選びに迷ってる人だけ見て」' },
      { id: 'r4', name: '数字', example: '「リピート率◯%の理由を30秒で」' },
    ],
    pillars: [
      {
        id: 'educate',
        name: '使い方・選び方',
        ratio: '約45%',
        description: '保存投稿で長期リーチ。購入前の不安を消す。',
        examples: ['使い方講座', '肌質別おすすめ', '長持ちさせる保管のコツ'],
      },
      {
        id: 'relate',
        name: 'UGC・世界観',
        ratio: '約35%',
        description: '生活に馴染むイメージを量産。',
        examples: ['お客様投稿', 'パッケージのこだわり', '裏側製造'],
      },
      {
        id: 'offer',
        name: '購入・特典',
        ratio: '約20%',
        description: '期限・限定・セットで決断を後押し。',
        examples: ['LINE限定', '残りわずか', 'バンドル'],
      },
    ],
    startOrder: [
      '商品の「使い方」リールを型化',
      'プロフィールに購入導線を1本化',
      'BuzzIt で多媒体にRepurpose',
      'LINEで購入後フォロー配信',
      'UGC許諾の仕組みを作る',
    ],
  },
  {
    id: 'education',
    label: '教育・スクール',
    blurb: '無料で価値提供→信頼→体験/申込。Shortsの検索流入が資産になる。',
    primaryPlatforms: ['YouTube Shorts', 'Instagram', 'LINE'],
    funnel: 'Shorts / リール（ノウハウ） → LINE資料請求 → 体験・申込',
    profileNameExample: '英語が続く塾｜○○ — 社会人歓迎',
    bioExample:
      '三日坊主だった人向けの学習法\n無料ガイド配布中\n相談はLINE（営業電話なし）',
    kpi: '資料請求数・体験申込数',
    weekIdeas: [
      'よくある間違いを30秒で訂正',
      '学習ロードマップの一部公開',
      '生徒の成果インタビュー',
      '講師の人柄・教室の雰囲気',
      '今週の無料相談枠',
      '宿題のコツ',
      '保護者・社会人向けFAQ',
    ],
    hooks: [
      { id: 'e1', name: '常識壊し', example: '「毎日2時間勉強しても伸びない人の共通点」' },
      { id: 'e2', name: '結論先出し', example: '「単語帳、実は◯◯のあとでいい」' },
      { id: 'e3', name: 'ターゲット', example: '「受験まで半年を切った保護者の方へ」' },
      { id: 'e4', name: '数字', example: '「週3回・1回25分で偏差値が上がった理由」' },
    ],
    pillars: [
      {
        id: 'educate',
        name: '無料ノウハウ',
        ratio: '約55%',
        description: '価値の先出しが申込の前提。検索にも強い。',
        examples: ['勉強法', 'よくある誤解', '週間プラン例'],
      },
      {
        id: 'relate',
        name: '成果・人柄',
        ratio: '約25%',
        description: '「ここに任せたい」感情を作る。',
        examples: ['生徒の声', '講師紹介', '教室の一日'],
      },
      {
        id: 'offer',
        name: '体験・資料',
        ratio: '約20%',
        description: '押し売りせず、次の一歩だけ明確に。',
        examples: ['無料ガイド', '体験授業', '説明会'],
      },
    ],
    startOrder: [
      'ノウハウShortsを週3（タイトルにキーワード）',
      'LINEで資料請求ステップを1本',
      'Instagramで世界観と講師の人柄',
      'BuzzIt ボイスドラフトで講義メモ→台本',
      '月1で成果事例をストック',
    ],
  },
  {
    id: 'medical',
    label: '医療・クリニック',
    blurb: '専門性と安心感が信頼の核。予約導線と口コミ（GBP）を丁寧に設計する。',
    primaryPlatforms: ['Instagram', 'Googleマップ', 'LINE'],
    funnel: 'リール / 検索 → プロフィール・GBP → LINE相談 or Web予約',
    profileNameExample: '渋谷｜皮膚科・美容皮膚科 ○○クリニック',
    bioExample:
      '肌のお悩みに寄り添う診療\n初診予約・よくある質問は下のリンクから\n※医療広告ガイドラインに配慮',
    kpi: 'Web予約数・LINE相談数・GBP口コミ数',
    weekIdeas: [
      'よくある症状の正しい知識（誇大表現なし）',
      '初診の流れを30秒で',
      '先生・スタッフの紹介',
      '医院の雰囲気・設備',
      '予約の空き案内（ストーリーズ）',
      '口コミへの丁寧な返信事例',
      '季節の注意（紫外線・花粉など）',
    ],
    hooks: [
      { id: 'm1', name: '不安解消', example: '「初めての方へ。初診で聞くことはこの3つだけです」' },
      { id: 'm2', name: '専門性', example: '「シミとそばかす、見分け方と相談のタイミング」' },
      { id: 'm3', name: 'ターゲット', example: '「仕事が忙しくて通院を後回しにしている方へ」' },
      { id: 'm4', name: '導線', example: '「今日の予約枠、残りわずか。Webから24時間受付」' },
    ],
    pillars: [
      {
        id: 'educate',
        name: '正しい知識',
        ratio: '約50%',
        description: '誇大せず、保存される解説で専門性を示す。',
        examples: ['症状の見分け', 'セルフケアの限界', '受診の目安'],
      },
      {
        id: 'relate',
        name: '安心・人柄',
        ratio: '約30%',
        description: '医院の空気感と人で「相談していい」と思わせる。',
        examples: ['スタッフ紹介', '院内ツアー', '患者さんの声（許諾）'],
      },
      {
        id: 'offer',
        name: '予約・相談',
        ratio: '約20%',
        description: '押し売りせず、次の一歩だけ明確に。',
        examples: ['Web予約', 'LINE相談', '初診ガイド'],
      },
    ],
    startOrder: [
      'Googleビジネスプロフィールを整備',
      'Instagramプロフィールに地域＋診療科目',
      'BuzzIt で Meta / GBP 連携',
      '教育リールを週2＋予約導線',
      '口コミ返信テンプレを設定',
    ],
  },
  {
    id: 'service',
    label: 'サービス・非店舗',
    blurb: '店舗がなくても「誰のどんな悩みを解決するか」を軸に。相談・申込導線を短く。',
    primaryPlatforms: ['X', 'Instagram', 'LINE'],
    funnel: '投稿・スレッド → プロフィール / LINE → 相談・予約・購入',
    profileNameExample: 'オンライン相談｜○○（出張可）',
    bioExample:
      '店舗なしでも全国対応\n無料相談の受付はLINE\n実績・料金は下のリンク',
    kpi: '相談申込数・成約数・リピート率',
    weekIdeas: [
      'よくある相談の答えを短く',
      'ビフォーアフター（成果事例・許諾済み）',
      '作業風景・準備の舞台裏',
      '今週の空き枠',
      'お客様の声',
      '料金・進め方の透明化',
      'FAQストック',
    ],
    hooks: [
      { id: 's1', name: '痛み共感', example: '「店舗がないから不安…という方へ。実はこう進みます」' },
      { id: 's2', name: '結論先出し', example: '「オンライン相談で決めるべきは、この1点だけ」' },
      { id: 's3', name: 'ターゲット', example: '「本業の合間に副業を始めたい人へ」' },
      { id: 's4', name: '数字', example: '「初回相談30分で、次の一手が決まる理由」' },
    ],
    pillars: [
      {
        id: 'educate',
        name: 'ノウハウ・選び方',
        ratio: '約45%',
        description: '信頼の土台。無料で価値を出し、相談のハードルを下げる。',
        examples: ['進め方', '失敗パターン', 'チェックリスト'],
      },
      {
        id: 'relate',
        name: '実績・人柄',
        ratio: '約35%',
        description: '顔とプロセスが見えると非店舗でも安心される。',
        examples: ['事例', '一日の流れ', '想い'],
      },
      {
        id: 'offer',
        name: '相談・申込',
        ratio: '約20%',
        description: 'LINEやフォームへの一歩を明確に。',
        examples: ['無料相談', '空き枠', '限定特典'],
      },
    ],
    startOrder: [
      'プロフィールに「誰向け・何を解決」を明記',
      '主戦場を1つ決める（X or Instagram）',
      'BuzzIt で連携と初投稿',
      'LINE相談導線を1本',
      '週3投稿を4週間継続',
    ],
  },
  {
    id: 'professional',
    label: '士業・専門サービス',
    blurb: '信頼と専門性が先。無料解説→相談→契約。誇大表現を避け、地域名も入れる。',
    primaryPlatforms: ['X', 'Googleマップ', 'LINE'],
    funnel: '解説投稿 → プロフィール / GBP → LINE相談・予約',
    profileNameExample: '港区｜〇〇専門 行政書士○○',
    bioExample:
      'わかりにくい手続きを、かみ砕いて説明します\n初回相談の予約は下のリンクから\n営業電話はしません',
    kpi: '相談予約数・資料請求数',
    weekIdeas: [
      'よくある誤解を1つ訂正',
      '手続きの流れを図解',
      '事例（個人情報に配慮）',
      '今週の相談枠',
      '事務所・人柄の紹介',
      '制度改正の要点',
      'FAQストック',
    ],
    hooks: [
      { id: 'p1', name: '常識壊し', example: '「実は自分でやらなくていい手続き、あります」' },
      { id: 'p2', name: 'ターゲット', example: '「開業準備で何から手を付けるか迷っている方へ」' },
      { id: 'p3', name: '結論先出し', example: '「この書類、提出前に見るべきはここだけ」' },
      { id: 'p4', name: '安心', example: '「相談だけでも大丈夫。押し売りしません」' },
    ],
    pillars: [
      {
        id: 'educate',
        name: '無料解説',
        ratio: '約55%',
        description: '検索・保存される解説が資産になる。',
        examples: ['制度の要点', 'チェックリスト', 'よくある失敗'],
      },
      {
        id: 'relate',
        name: '人柄・信頼',
        ratio: '約25%',
        description: '士業は人で選ばれる。顔出し・価値観を見せる。',
        examples: ['想い', '一日の仕事', 'お客様の声'],
      },
      {
        id: 'offer',
        name: '相談・申込',
        ratio: '約20%',
        description: '次の一歩を1つだけ。',
        examples: ['初回相談', '資料請求', '空き枠'],
      },
    ],
    startOrder: [
      'Googleビジネスプロフィールを整備',
      'X or Instagram で解説投稿を週3',
      'BuzzIt で連携と台本化',
      'LINE相談導線を用意',
      '口コミ・事例を丁寧に蓄積',
    ],
  },
  {
    id: 'general',
    label: 'その他・店舗全般',
    blurb: '迷ったら Instagram＋LINE。地域名を入れ、来店直前層にも届く設計に。',
    primaryPlatforms: ['Instagram', 'LINE', 'Googleマップ'],
    funnel: 'SNS → プロフィール / LINE → 予約・来店・問い合わせ',
    profileNameExample: '地域名｜業種｜店舗名',
    bioExample: '誰のどんな悩みを解決するか\n強みを1行\n次の行動（予約/LINE）',
    kpi: 'プロフィール訪問→LINE追加→来店/予約',
    weekIdeas: [
      'お店の強みを15秒で',
      'お客様のよくある質問',
      'スタッフ紹介',
      'アクセス・駐車場案内',
      '今週の空き・キャンペーン',
      '舞台裏・仕込み',
      '口コミへの感謝（具体的に）',
    ],
    hooks: [
      { id: 'g1', name: 'ターゲット', example: '「〇〇区で△△を探している人へ」' },
      { id: 'g2', name: '結論先出し', example: '「選ぶとき、最初に見るべきはこれです」' },
      { id: 'g3', name: '痛み共感', example: '「ネットで調べても違いが分からない…あるあるです」' },
      { id: 'g4', name: '数字', example: '「初回来店の方の◯%がリピートする理由」' },
    ],
    pillars: [
      {
        id: 'educate',
        name: '教育・選び方',
        ratio: '約40%',
        description: '比較検討中の不安を解消する。',
        examples: ['選び方', 'よくある誤解', '料金の見方'],
      },
      {
        id: 'relate',
        name: '共感・日常',
        ratio: '約35%',
        description: '人柄と空気感でフォロー維持。',
        examples: ['日常', 'スタッフ', 'お客様の声'],
      },
      {
        id: 'offer',
        name: '来店・申込',
        ratio: '約25%',
        description: '明確なCTAで成果につなげる。',
        examples: ['空き枠', '特典', '相談窓口'],
      },
    ],
    startOrder: [
      '目的とKPIを1つ決める',
      'Instagram＋LINEを整備',
      'BuzzIt で連携と初回投稿',
      '週3投稿を4週間継続',
      '週次でファネルを確認',
    ],
  },
];

/** 店舗の industry 文字列や自由入力をテンプレIDへ正規化 */
export function resolveIndustryId(raw?: string | null): IndustryId {
  if (!raw) return 'general';
  const s = raw.trim().toLowerCase();
  if (!s) return 'general';

  const table: Array<{ id: IndustryId; keys: string[] }> = [
    { id: 'beauty', keys: ['beauty', 'salon', 'hair', '美容', 'サロン', 'ヘア', 'ネイル', 'エステ', '眉毛'] },
    { id: 'food', keys: ['food', 'restaurant', 'cafe', '飲食', 'カフェ', 'レストラン', '居酒屋', '焼鳥', 'ラーメン'] },
    { id: 'fitness', keys: ['fitness', 'gym', 'personal', 'ジム', 'フィットネス', 'パーソナル', 'ヨガ', 'トレーニング'] },
    { id: 'retail', keys: ['retail', 'ec', 'shop', '小売', '物販', 'アパレル', '雑貨', '通販'] },
    { id: 'education', keys: ['education', 'school', '塾', '教育', 'スクール', '習い事', '教室', 'レッスン'] },
    {
      id: 'medical',
      keys: ['medical', 'clinic', 'hospital', '医療', 'クリニック', '病院', '歯科', '皮膚科', '整骨', '整体', '薬局'],
    },
    {
      id: 'service',
      keys: ['service', 'online', 'freelance', 'サービス', '非店舗', 'オンライン', '出張', 'フリーランス', 'コンサル'],
    },
    {
      id: 'professional',
      keys: [
        'professional',
        'lawyer',
        '会計',
        '士業',
        '弁護士',
        '税理士',
        '行政書士',
        '社労士',
        '不動産',
        '保険',
        '専門',
      ],
    },
  ];

  for (const row of table) {
    if (row.keys.some((k) => s.includes(k.toLowerCase()))) return row.id;
  }
  return 'general';
}

export function getIndustryTemplate(id: IndustryId): IndustryTemplate {
  return industryTemplates.find((t) => t.id === id) ?? industryTemplates[industryTemplates.length - 1];
}
