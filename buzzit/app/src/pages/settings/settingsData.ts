import { WATERMARK } from '../../constants/brand';
import type { PlanTier } from '../../types';

/** SNS連携タブ: 1度に1サービスだけ表示する */
export const SNS_PANELS = [
  { id: 'meta', label: 'Instagram / Facebook' },
  { id: 'x', label: 'X' },
  { id: 'line', label: 'LINE' },
  { id: 'gbp', label: 'Googleビジネス' },
  { id: 'hpb', label: 'ホットペッパー' },
  { id: 'insights', label: 'インプレッション取得' },
  { id: 'publish-mode', label: '投稿方法' },
  { id: 'ayrshare', label: 'TikTok / YouTube' },
  { id: 'slack', label: 'Slack・通知' },
];

export const lineCrmPlans: { id: PlanTier; name: string; price: string; tagline: string; features: string[]; promo?: string }[] = [
  {
    id: 'line_lite',
    name: 'LINE CRM Lite',
    price: '¥500/月',
    promo: '初回3ヶ月 → 以降 ¥980',
    tagline: 'LINEだけ・小規模',
    features: ['ブロードキャスト', 'タグ〜10', '流入〜3', '友だち500まで'],
  },
  {
    id: 'line_pro',
    name: 'LINE CRM Pro',
    price: '¥4,980/月',
    tagline: 'Lステップ Standard 代替',
    features: ['Liteの全機能', 'セグメント配信', 'ステップ〜3', 'リッチメニュー5', '配信コスト試算'],
  },
];

export const fullStackPlans: { id: PlanTier; name: string; price: string; tagline: string; features: string[] }[] = [
  {
    id: 'free',
    name: 'Free',
    price: '¥0',
    tagline: 'まず5分体験',
    features: ['AI台本（月5投稿）', 'SNS健康診断', 'ボイスドラフト', `${WATERMARK} 透かし`],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '¥4,980/月',
    tagline: '個人店向け',
    features: ['無制限投稿', 'Meta/LINE 自動投稿', 'GBP 自動投稿', 'トレンド波乗り', '透かし削除'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '¥9,800/月',
    tagline: '小規模チーム',
    features: ['Starterの全機能', 'Slack連携', '承認フロー', 'LINEセグメント基本', 'A/Bテスト'],
  },
  {
    id: 'growth',
    name: 'Growth OS',
    price: '¥24,800/月',
    tagline: '美容・多店舗',
    features: ['Proの全機能', 'Auto Mode', 'HPB予約トラッキング', 'LINEセグメント高度＋ステップ', 'MEOダッシュボード'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '要見積',
    tagline: 'チェーン',
    features: ['多店舗統合（〜100）', '横断KPI/改ざん検知', '専任CSM・SLA', 'SSO/カスタムAPI'],
  },
];
