/** サイドバー「SNS」配下の媒体定義（伴走ガイド ID と揃える） */

export type SnsNavPlatform = {
  id: string;
  name: string;
  /** 予約ジョブの platform / label / publishMode 照合用 */
  matchTokens: string[];
  publishModes?: string[];
};

export const SNS_NAV_PLATFORMS: SnsNavPlatform[] = [
  {
    id: 'x',
    name: 'X',
    matchTokens: ['x_thread', 'x_free', 'twitter', 'スレッド', 'x投稿'],
    publishModes: ['x_free'],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    matchTokens: ['instagram', 'reels', 'carousel', 'リール', 'カルーセル', 'インスタ'],
    publishModes: ['meta'],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    matchTokens: ['tiktok', 'ティックトック'],
  },
  {
    id: 'facebook-threads',
    name: 'Facebook / Threads',
    matchTokens: ['facebook', 'threads', 'フェイスブック'],
    publishModes: ['meta'],
  },
  {
    id: 'youtube-shorts',
    name: 'YouTube Shorts',
    matchTokens: ['youtube', 'shorts', 'ショート'],
  },
  {
    id: 'line',
    name: 'LINE公式',
    matchTokens: ['line', 'ライン'],
    publishModes: ['line'],
  },
  {
    id: 'gbp',
    name: 'Googleビジネス',
    matchTokens: ['gbp', 'google', 'ビジネスプロフィール'],
    publishModes: ['gbp'],
  },
];

export function getSnsNavPlatform(id: string): SnsNavPlatform | undefined {
  return SNS_NAV_PLATFORMS.find((p) => p.id === id);
}

export function jobMatchesSnsPlatform(
  job: {
    publishMode?: string;
    contents: Array<{ platform?: string; label?: string }>;
  },
  platformId: string,
): boolean {
  const def = getSnsNavPlatform(platformId);
  if (!def) return false;

  if (def.publishModes?.includes(job.publishMode ?? '')) {
    // Meta は IG / FB 両用のため、contents でさらに絞る
    if (job.publishMode === 'meta' && (platformId === 'instagram' || platformId === 'facebook-threads')) {
      return job.contents.some((c) => {
        const hay = `${c.platform ?? ''} ${c.label ?? ''}`.toLowerCase();
        return def.matchTokens.some((t) => hay.includes(t.toLowerCase()));
      });
    }
    return true;
  }

  return job.contents.some((c) => {
    const hay = `${c.platform ?? ''} ${c.label ?? ''}`.toLowerCase();
    return def.matchTokens.some((t) => hay.includes(t.toLowerCase()));
  });
}
