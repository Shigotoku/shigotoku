export type PlanTier = 'starter' | 'pro' | 'team' | 'growth';

export type Platform = 'reels' | 'carousel' | 'x_thread' | 'line';

export interface RepurposeContent {
  platform: Platform;
  label: string;
  content: string;
  carouselSlides?: string[];
}

export interface GeneratedScript {
  title: string;
  hook: string;
  body: string;
  cta: string;
}

export interface DashboardMetrics {
  healthScore: number;
  healthTrend: number;
  reach: number;
  lineFriends: number;
  lineCvr: number;
  estimatedRevenue: number;
  reachRating: string;
  clickRating: string;
}

export interface TodayMission {
  title: string;
  description: string;
  scriptCount: number;
}

export interface ScheduleResult {
  success: boolean;
  scheduledAt: string;
  platforms: string[];
  message: string;
}
