import type { TargetAudience } from '../types';

export type TemplateCategory =
  | 'clinic'
  | 'education'
  | 'smb'
  | 'web'
  | 'hospitality'
  | 'general';

export interface ManualTemplate {
  id: string;
  title: string;
  category: TemplateCategory;
  targetAudience: TargetAudience[];
  description: string;
  tags: string[];
  /** 編集画面で各手順にスクショを入れると完成しやすい旨 */
  imageHint: string;
  steps: { title: string; instruction: string; type: 'normal' | 'warning' | 'check' }[];
}

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  clinic: 'クリニック・医療',
  education: '教育・授業プリント',
  smb: '中小企業・社内',
  web: 'Web・サービス案内',
  hospitality: '接客・店舗',
  general: '汎用',
};

const IMG = '【ここにスクショまたは画像を挿入】';

export const MANUAL_TEMPLATES: ManualTemplate[] = [
  {
    id: 'clinic-reception',
    title: '新患受付の手順',
    category: 'clinic',
    targetAudience: ['new_staff'],
    description: '受付での新患対応の基本フロー',
    tags: ['受付', '新患'],
    imageHint: '受付画面・保険証・問診票の写真を各手順に入れてください',
    steps: [
      { type: 'normal', title: '受付票の確認', instruction: `保険証と受付票を確認します。${IMG}` },
      { type: 'normal', title: '患者情報の登録', instruction: `レセコン／電子カルテに基本情報を登録します。${IMG}` },
      { type: 'check', title: '問診・待合案内', instruction: `問診票を渡し、待合へ案内して完了です。${IMG}` },
    ],
  },
  {
    id: 'clinic-accounting',
    title: '会計・レセプト入力',
    category: 'clinic',
    targetAudience: ['new_staff', 'admin'],
    description: '診察後の会計処理',
    tags: ['会計', 'レセコン'],
    imageHint: '会計画面のスクショを順に挿入',
    steps: [
      { type: 'normal', title: '診療内容の確認', instruction: `カルテと会計画面の内容が一致しているか確認します。${IMG}` },
      { type: 'warning', title: '未収・特例の確認', instruction: `自己負担額や特例措置を確認します。${IMG}` },
      { type: 'check', title: '会計完了', instruction: `領収書を渡し、次回予約を確認します。${IMG}` },
    ],
  },
  {
    id: 'clinic-consent',
    title: 'インフォームドコンセント説明',
    category: 'clinic',
    targetAudience: ['patient'],
    description: '処置・検査前の説明と同意取得',
    tags: ['同意書', '患者説明'],
    imageHint: '説明用スライドや同意書の写真を挿入',
    steps: [
      { type: 'normal', title: '目的の説明', instruction: `検査・処置の目的とメリットを説明します。${IMG}` },
      { type: 'warning', title: 'リスク・代替案', instruction: `起こりうるリスクと代替治療を説明します。${IMG}` },
      { type: 'check', title: '同意の確認', instruction: `質問に答え、同意書に署名をもらいます。${IMG}` },
    ],
  },
  {
    id: 'clinic-hygiene',
    title: '院内感染対策チェック',
    category: 'clinic',
    targetAudience: ['new_staff'],
    description: '手洗い・消毒・廃棄物の基本',
    tags: ['感染対策'],
    imageHint: '消毒手順や正しい廃棄方法の写真',
    steps: [
      { type: 'normal', title: '手洗い・手指消毒', instruction: `診療前後に所定の手順で消毒します。${IMG}` },
      { type: 'normal', title: '器具・環境の清拭', instruction: `使用箇所を清拭・消毒します。${IMG}` },
      { type: 'check', title: '廃棄物の分別', instruction: `医療廃棄物を区分ごとに廃棄します。${IMG}` },
    ],
  },
  {
    id: 'edu-print',
    title: '授業プリント（解説＋確認問題）',
    category: 'education',
    targetAudience: ['new_staff'],
    description: '授業用ワークシートのひな形',
    tags: ['プリント', 'ワークシート'],
    imageHint: '図解・板書・教材画面のスクショを各セクションに',
    steps: [
      { type: 'normal', title: '学習目標', instruction: `本時の目標：{{講座名}} — {{単元名}}。${IMG}` },
      { type: 'normal', title: '解説パート', instruction: `ポイントを図解で説明します。${IMG}` },
      { type: 'normal', title: '例題', instruction: `例題を解きながら考え方を示します。${IMG}` },
      { type: 'check', title: '確認問題', instruction: `理解度チェック（3問）。${IMG}` },
    ],
  },
  {
    id: 'edu-test',
    title: '小テスト・答案用紙',
    category: 'education',
    targetAudience: ['new_staff'],
    description: '定期試験・小テストのレイアウト',
    tags: ['テスト', '答案'],
    imageHint: '出題例や配点表の画像を挿入',
    steps: [
      { type: 'normal', title: '試験情報', instruction: `科目・実施日・制限時間・配点を記載。${IMG}` },
      { type: 'normal', title: '大問1（知識）', instruction: `用語説明・選択問題。${IMG}` },
      { type: 'normal', title: '大問2（応用）', instruction: `記述・計算問題。${IMG}` },
      { type: 'check', title: '解答・採点基準', instruction: `模範解答と部分点の目安（教員用）。${IMG}` },
    ],
  },
  {
    id: 'edu-experiment',
    title: '理科・実験レポート',
    category: 'education',
    targetAudience: ['new_staff'],
    description: '実験手順と考察の記録フォーマット',
    tags: ['実験', 'レポート'],
    imageHint: '実験器具配置・結果グラフの写真',
    steps: [
      { type: 'normal', title: '目的・仮説', instruction: `実験の目的と予想する結果を書きます。${IMG}` },
      { type: 'normal', title: '器具と手順', instruction: `使用器具と操作手順を順に記載。${IMG}` },
      { type: 'normal', title: '結果', instruction: `観察結果・測定値を表やグラフで示す。${IMG}` },
      { type: 'check', title: '考察', instruction: `結果からわかることと課題をまとめる。${IMG}` },
    ],
  },
  {
    id: 'edu-parent',
    title: '保護者向けお便り',
    category: 'education',
    targetAudience: ['patient'],
    description: '行事案内・持ち物・提出物のお知らせ',
    tags: ['保護者', 'お便り'],
    imageHint: '行事の写真や持ち物リストのイメージ',
    steps: [
      { type: 'normal', title: 'ご挨拶', instruction: `保護者の皆様への挨拶と本便りの目的。${IMG}` },
      { type: 'normal', title: '日程・場所', instruction: `日時・集合場所・持ち物を明記。${IMG}` },
      { type: 'normal', title: 'お願い事項', instruction: `提出期限・連絡方法を記載。${IMG}` },
      { type: 'normal', title: 'お問い合わせ', instruction: `{{snippet:contact}}` },
    ],
  },
  {
    id: 'edu-lesson-plan',
    title: '授業計画（1コマ）',
    category: 'education',
    targetAudience: ['new_staff'],
    description: '導入・展開・まとめの授業設計シート',
    tags: ['授業計画', '指導案'],
    imageHint: '板書計画や教材のキャプチャ',
    steps: [
      { type: 'normal', title: '単元・目標', instruction: `単元名と到達目標を記載。${IMG}` },
      { type: 'normal', title: '導入（5分）', instruction: `動機づけ・既習の確認。${IMG}` },
      { type: 'normal', title: '展開（30分）', instruction: `活動内容と教師の支援。${IMG}` },
      { type: 'check', title: 'まとめ・評価', instruction: `振り返りと形成的評価。${IMG}` },
    ],
  },
  {
    id: 'smb-expense',
    title: '経費精算の申請',
    category: 'smb',
    targetAudience: ['customer'],
    description: '社内経費精算の基本手順',
    tags: ['経費', '申請'],
    imageHint: '経費システム画面のスクショ',
    steps: [
      { type: 'normal', title: '領収書の撮影', instruction: `領収書を撮影しシステムにアップロード。${IMG}` },
      { type: 'normal', title: '科目・金額入力', instruction: `勘定科目と用途を入力。${IMG}` },
      { type: 'check', title: '申請送信', instruction: `上長承認フローに回して完了。${IMG}` },
    ],
  },
  {
    id: 'smb-onboarding',
    title: '新入社員オンボーディング',
    category: 'smb',
    targetAudience: ['new_staff'],
    description: '初日〜1週間の業務セットアップ',
    tags: ['人事', 'オンボーディング'],
    imageHint: '社内ツールのログイン画面など',
    steps: [
      { type: 'normal', title: 'アカウント発行', instruction: `メール・チャット・勤怠のIDを確認。${IMG}` },
      { type: 'normal', title: '必須ツールの設定', instruction: `2段階認証・VPNなどを設定。${IMG}` },
      { type: 'normal', title: '初日の業務', instruction: `担当者と顔合わせ、権限確認。${IMG}` },
      { type: 'check', title: '1週間チェック', instruction: `不明点の洗い出しとフォロー。${IMG}` },
    ],
  },
  {
    id: 'smb-customer-reply',
    title: 'お客様問い合わせ対応',
    category: 'smb',
    targetAudience: ['customer'],
    description: '問い合わせ受付から回答まで',
    tags: ['サポート', 'CS'],
    imageHint: 'CRM・チケット画面のスクショ',
    steps: [
      { type: 'normal', title: '受付・分類', instruction: `内容をカテゴリ分けし優先度を設定。${IMG}` },
      { type: 'warning', title: '個人情報の取り扱い', instruction: `本人確認を行い、必要最小限の情報のみ記録。${IMG}` },
      { type: 'normal', title: '回答作成', instruction: `テンプレをベースに状況に合わせて回答。${IMG}` },
      { type: 'check', title: 'クローズ', instruction: `解決確認後にチケットを完了。${IMG}` },
    ],
  },
  {
    id: 'web-faq',
    title: 'FAQ（よくある質問）',
    category: 'web',
    targetAudience: ['customer'],
    description: 'Webサービス向けQ&Aページ',
    tags: ['FAQ', 'ヘルプ'],
    imageHint: '該当画面のスクショを各回答に',
    steps: [
      { type: 'normal', title: 'アカウント・ログイン', instruction: `ログインできない場合の確認事項。${IMG}` },
      { type: 'normal', title: '料金・プラン', instruction: `プラン変更・請求に関する質問。${IMG}` },
      { type: 'normal', title: '操作方法', instruction: `主要機能の使い方。${IMG}` },
      { type: 'check', title: 'お問い合わせ先', instruction: `解決しない場合の連絡先。${IMG}` },
    ],
  },
  {
    id: 'web-howto',
    title: 'Webサービス操作ガイド',
    category: 'web',
    targetAudience: ['developer'],
    description: '画面キャプチャ付きの使い方マニュアル',
    tags: ['チュートリアル', 'SaaS'],
    imageHint: '各ステップにUIのスクショを必ず挿入',
    steps: [
      { type: 'normal', title: 'ログイン', instruction: `URLにアクセスしログインします。${IMG}` },
      { type: 'normal', title: 'ダッシュボード', instruction: `主要メニューの見方。${IMG}` },
      { type: 'normal', title: '基本操作', instruction: `最初に行う設定・登録。${IMG}` },
      { type: 'check', title: '完了確認', instruction: `期待どおりの状態か確認。${IMG}` },
    ],
  },
  {
    id: 'web-landing-section',
    title: 'LP・サービス紹介（3ブロック）',
    category: 'web',
    targetAudience: ['customer'],
    description: '特徴・使い方・料金の紹介構成',
    tags: ['LP', 'マーケ'],
    imageHint: 'サービス画面・実績画像を各ブロックに',
    steps: [
      { type: 'normal', title: '課題と解決', instruction: `ユーザーの課題と提供価値。${IMG}` },
      { type: 'normal', title: '3つの特徴', instruction: `差別化ポイントを3つ。${IMG}` },
      { type: 'check', title: '始め方・CTA', instruction: `無料試用・問い合わせへの導線。${IMG}` },
    ],
  },
  {
    id: 'web-changelog',
    title: 'リリースノート・更新履歴',
    category: 'web',
    targetAudience: ['developer'],
    description: 'バージョンごとの変更点まとめ',
    tags: ['changelog', '更新'],
    imageHint: '変更箇所のビフォーアフター画像',
    steps: [
      { type: 'normal', title: 'バージョン概要', instruction: `vX.Y.Z のリリース日と概要。${IMG}` },
      { type: 'normal', title: '新機能', instruction: `追加された機能と使い方。${IMG}` },
      { type: 'warning', title: '破壊的変更', instruction: `移行が必要な変更点。${IMG}` },
      { type: 'check', title: '既知の問題', instruction: `対応予定の不具合。${IMG}` },
    ],
  },
  {
    id: 'hospitality-order',
    title: '店舗・注文対応マニュアル',
    category: 'hospitality',
    targetAudience: ['new_staff'],
    description: 'レジ・オーダー・提供の流れ',
    tags: ['飲食', '接客'],
    imageHint: 'POS画面・メニュー写真',
    steps: [
      { type: 'normal', title: '挨拶・席案内', instruction: `来店時の挨拶と席への案内。${IMG}` },
      { type: 'normal', title: '注文受付', instruction: `POSへの入力方法。${IMG}` },
      { type: 'check', title: '提供・会計', instruction: `提供確認と会計手順。${IMG}` },
    ],
  },
  {
    id: 'hospitality-complaint',
    title: 'クレーム対応フロー',
    category: 'hospitality',
    targetAudience: ['admin'],
    description: 'お客様の不満への初動対応',
    tags: ['クレーム', '接客'],
    imageHint: 'エスカレーション連絡先リストなど',
    steps: [
      { type: 'warning', title: '傾聴と謝罪', instruction: `感情を受け止め、事実を確認。${IMG}` },
      { type: 'normal', title: '一次対応', instruction: `現場でできる解決策を提案。${IMG}` },
      { type: 'check', title: '報告・記録', instruction: `管理者へ報告し記録を残す。${IMG}` },
    ],
  },
  {
    id: 'general-checklist',
    title: '業務チェックリスト（汎用）',
    category: 'general',
    targetAudience: ['new_staff'],
    description: '開店前・退勤前などの確認リスト',
    tags: ['チェックリスト'],
    imageHint: '確認箇所の写真を各項目に',
    steps: [
      { type: 'check', title: '開始前確認', instruction: `環境・備品・連絡事項を確認。${IMG}` },
      { type: 'normal', title: '本番作業', instruction: `手順どおりに作業を進める。${IMG}` },
      { type: 'check', title: '終了時確認', instruction: `片付け・報告・鍵の施錠など。${IMG}` },
    ],
  },
  {
    id: 'general-sop',
    title: '標準作業手順書（SOP）',
    category: 'general',
    targetAudience: ['new_staff'],
    description: '品質を揃えるための標準手順',
    tags: ['SOP', '品質'],
    imageHint: '作業工程の写真を順番に',
    steps: [
      { type: 'normal', title: '目的・適用範囲', instruction: `この手順の目的と対象業務。${IMG}` },
      { type: 'normal', title: '準備', instruction: `必要な道具・権限・事前確認。${IMG}` },
      { type: 'normal', title: '手順', instruction: `ステップごとの操作。${IMG}` },
      { type: 'warning', title: '注意・禁止事項', instruction: `やってはいけないこと。${IMG}` },
      { type: 'check', title: '完了基準', instruction: `正しく完了したかの確認。${IMG}` },
    ],
  },
];
