import { siteImages } from '../lib/assets';

export const navItems = [
  { label: 'ミッション', href: '/#mission' },
  { label: 'サービス', href: '/#service' },
  { label: 'お知らせ', href: '/#news' },
  { label: '会社情報', href: '/#company' },
  { label: 'お問い合わせ', href: '/#contact' },
];

export const stats = [
  { value: '30+', label: '搭載ツール数', color: 'text-blue-600' },
  { value: '12+', label: '対応補助金・助成金', color: 'text-violet-600' },
  { value: '60ヶ月', label: '事業シミュレーション', color: 'text-emerald-600' },
  { value: '¥0', label: 'フリープランで始められる', color: 'text-amber-600' },
];

export const missionCards = [
  { img: siteImages.speed, title: '圧倒的な速度', description: 'アイデアから創業、資金調達まで。スタートアップに必要なすべてのプロセスを加速します。' },
  { img: siteImages.ai, title: 'AI × 専門知識', description: 'AIの力とスタートアップ支援の専門知識を組み合わせ、最適な意思決定をサポートします。' },
  { img: siteImages.exit, title: '創業からEXITまで', description: 'アイデア段階からIPO・M&Aまで、成長フェーズに応じたツールと情報を一気通貫で提供します。' },
];

export const companyInfo = [
  { label: '会社名', value: '株式会社シゴトク' },
  { label: '設立', value: '準備中' },
  { label: '代表', value: '徳永 竜馬' },
  { label: '事業内容', value: 'スタートアップ支援SaaSの開発・運営' },
  { label: '所在地', value: '熊本県' },
  { label: 'お問い合わせ', value: 'support@shigotoku.com', isEmail: true },
];

export const tokushohoItems = [
  { label: '販売業者', value: '株式会社シゴトク' },
  { label: '代表者', value: '徳永 竜馬' },
  { label: '所在地', value: '熊本県' },
  { label: '電話番号', value: 'お問い合わせフォームをご利用ください' },
  { label: 'メールアドレス', value: 'support@shigotoku.com', isEmail: true },
  { label: 'サービス名', value: 'ランウィズ (Runwith)' },
  { label: 'サービスURL', value: 'https://shigotoku.com/runwith/', isUrl: true },
  { label: '販売価格', value: '各プランページに記載の通り（税込）' },
  { label: '支払方法', value: 'クレジットカード（Visa・Mastercard・American Express・JCB）' },
  { label: '支払時期', value: '月次または年次、サービス利用開始時に自動決済' },
  { label: 'サービス提供時期', value: '決済完了後、即時ご利用可能' },
  { label: '返金・キャンセル', value: 'サービスの性質上、原則として返金はいたしかねます。ただし、当社の責に帰すべき事由による場合はこの限りではありません。' },
  { label: '動作環境', value: 'Google Chrome、Safari、Firefox、Edge の最新バージョンを推奨' },
  { label: '特別条件', value: 'フリープランは無期限でご利用いただけます。有料プランは月次・年次の自動更新となります。' },
];
