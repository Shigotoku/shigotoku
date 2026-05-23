import type { DashboardMetrics, TodayMission } from '../types';

export const mockMetrics: DashboardMetrics = {
  healthScore: 92,
  healthTrend: 12,
  reach: 24500,
  lineFriends: 124,
  lineCvr: 0.5,
  estimatedRevenue: 342000,
  reachRating: 'Excellent',
  clickRating: 'Good',
};

export const mockMission: TodayMission = {
  title: '新作「春カラー」の動画を承認してください',
  description:
    'AIが3パターンの台本とTikTok/Reels用動画を生成しました。確認後、ワンタップで各SNSへ予約投稿されます。',
  scriptCount: 3,
};

export const kpiLabels = {
  awareness: '認知 (リーチ)',
  interest: '興味 (保存・シェア)',
  conversion: '誘導 (URLクリック)',
  leads: '見込み客 (LINE友だち)',
  revenue: '成果 (売上・予約)',
} as const;
