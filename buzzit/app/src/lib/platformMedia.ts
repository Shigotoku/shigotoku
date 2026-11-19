/** crosspostRules.ts の MEDIA_RULE と同期（X 等は画像なし可） */
const MEDIA_RULE: Record<string, 'none' | 'image' | 'video'> = {
  x_thread: 'none',
  instagram: 'image',
  facebook: 'none',
  threads: 'none',
  line: 'none',
  gbp: 'image',
  youtube_shorts: 'video',
  tiktok: 'video',
};

export function mediaRequiredForPlatform(platform: string): boolean {
  const rule = MEDIA_RULE[platform];
  return rule !== 'none' && rule !== undefined;
}

export function mediaRequirementHint(platform: string): string {
  const rule = MEDIA_RULE[platform];
  if (rule === 'image') return 'この媒体では画像が必須です。';
  if (rule === 'video') return 'この媒体では動画が必須です。';
  return '画像・動画は任意です（付けなくても予約できます）。';
}