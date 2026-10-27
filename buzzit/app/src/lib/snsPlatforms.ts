/** サイドバー「SNS」配下の媒体定義 */

export type SnsNavPlatform = {
  id: string;
  name: string;
  shortLabel: string;
  brandColor: string;
  brandGradient: string;
  matchTokens: string[];
  publishModes?: string[];
};

export const SNS_NAV_PLATFORMS: SnsNavPlatform[] = [
  { id: 'x', name: 'X', shortLabel: 'X', brandColor: '#000000', brandGradient: 'linear-gradient(135deg, #1a1a1a, #404040)', matchTokens: ['x_thread', 'x_free', 'twitter', 'スレッド', 'x投稿'], publishModes: ['x_free'] },
  { id: 'instagram', name: 'Instagram', shortLabel: 'IG', brandColor: '#E1306C', brandGradient: 'linear-gradient(135deg, #833AB4, #E1306C, #F77737)', matchTokens: ['instagram', 'reels', 'carousel', 'リール', 'カルーセル', 'インスタ'], publishModes: ['meta'] },
  { id: 'tiktok', name: 'TikTok', shortLabel: 'TT', brandColor: '#010101', brandGradient: 'linear-gradient(135deg, #010101, #FE2C55)', matchTokens: ['tiktok', 'ティックトック'] },
  { id: 'facebook-threads', name: 'Facebook / Threads', shortLabel: 'FB', brandColor: '#1877F2', brandGradient: 'linear-gradient(135deg, #1877F2, #0866FF)', matchTokens: ['facebook', 'threads', 'フェイスブック'], publishModes: ['meta'] },
  { id: 'youtube-shorts', name: 'YouTube Shorts', shortLabel: 'YT', brandColor: '#FF0000', brandGradient: 'linear-gradient(135deg, #FF0000, #CC0000)', matchTokens: ['youtube', 'shorts', 'ショート'] },
  { id: 'line', name: 'LINE公式', shortLabel: 'LINE', brandColor: '#06C755', brandGradient: 'linear-gradient(135deg, #06C755, #05A648)', matchTokens: ['line', 'ライン'], publishModes: ['line'] },
  { id: 'gbp', name: 'Googleビジネス', shortLabel: 'GBP', brandColor: '#4285F4', brandGradient: 'linear-gradient(135deg, #4285F4, #34A853)', matchTokens: ['gbp', 'google', 'ビジネスプロフィール'], publishModes: ['gbp'] },
];

export function getSnsNavPlatform(id: string) {
  return SNS_NAV_PLATFORMS.find((p) => p.id === id);
}

export function jobMatchesSnsPlatform(job: { publishMode?: string; contents: Array<{ platform?: string; label?: string }> }, platformId: string) {
  const def = getSnsNavPlatform(platformId);
  if (!def) return false;
  if (def.publishModes?.includes(job.publishMode ?? '')) {
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

export function detectJobPlatformId(job: { publishMode?: string; contents: Array<{ platform?: string; label?: string }> }) {
  for (const p of SNS_NAV_PLATFORMS) {
    if (jobMatchesSnsPlatform(job, p.id)) return p.id;
  }
  return null;
}

export function repurposePlatformToSnsId(platform: string) {
  const map: Record<string, string> = { reels: 'instagram', carousel: 'instagram', x_thread: 'x', line: 'line' };
  return map[platform] ?? null;
}
