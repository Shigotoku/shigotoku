/**
 * 他SNSへの「形式整え」（AI不使用・ルールベース）。
 * 元の投稿本文を、各媒体の文字数・ハッシュタグ・メディア要件に合わせて変換する。
 */

export type TargetPlatform =
  | 'x_thread'
  | 'instagram'
  | 'facebook'
  | 'threads'
  | 'line'
  | 'gbp'
  | 'youtube_shorts'
  | 'tiktok';

export const TARGET_PLATFORMS: TargetPlatform[] = [
  'x_thread',
  'instagram',
  'facebook',
  'threads',
  'line',
  'gbp',
  'youtube_shorts',
  'tiktok',
];

export const PLATFORM_LABEL: Record<TargetPlatform, string> = {
  x_thread: 'Xポスト',
  instagram: 'Instagramキャプション',
  facebook: 'Facebook投稿',
  threads: 'Threads投稿',
  line: 'LINE配信',
  gbp: 'Googleビジネス投稿',
  youtube_shorts: 'YouTube Shorts',
  tiktok: 'TikTok',
};

/** 画像/動画の要件 */
const MEDIA_RULE: Record<TargetPlatform, 'none' | 'image' | 'video'> = {
  x_thread: 'none',
  instagram: 'image',
  facebook: 'none',
  threads: 'none',
  line: 'none',
  gbp: 'image',
  youtube_shorts: 'video',
  tiktok: 'video',
};

const HASHTAG_RE = /[#＃][^\s#＃]+/g;
const MENTION_RE = /(^|\s)@[A-Za-z0-9_]+/g;

function clip(text: string, max: number): string {
  const chars = [...text];
  return chars.length <= max ? text : `${chars.slice(0, max - 1).join('')}…`;
}

/** 280字を超える段落を文末（。！？\n）で区切ってスレッド化。最大5投稿 */
function toThread(body: string, max = 280): string {
  const parts: string[] = [];
  let cur = '';
  for (const sentence of body.split(/(?<=[。！？!?\n])/)) {
    if ([...cur + sentence].length > max && cur.trim()) {
      parts.push(cur.trim());
      cur = sentence;
    } else {
      cur += sentence;
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts
    .slice(0, 5)
    .map((p) => clip(p, max))
    .join('\n---\n');
}

export interface SourceInfo {
  body: string;
  hashtags: string[];
  hasMedia: boolean;
  mediaKind: 'none' | 'image' | 'video';
}

export function parseSource(text: string, mediaUrls: string[] = []): SourceInfo {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n---\n/g, '\n\n').trim();
  const hashtags = [...new Set(normalized.match(HASHTAG_RE) ?? [])].map((h) => h.replace('＃', '#'));
  const body = normalized
    .replace(HASHTAG_RE, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const isVideo = (u: string) => /\.(mp4|mov|webm)(\?|$)/i.test(u);
  const mediaKind = mediaUrls.some(isVideo) ? 'video' : mediaUrls.length ? 'image' : 'none';
  return { body, hashtags, hasMedia: mediaUrls.length > 0, mediaKind };
}

export interface AdaptResult {
  platform: TargetPlatform;
  label: string;
  content: string;
  warnings: string[];
  /** この媒体に引き継ぐメディア */
  mediaUrls: string[];
}

export function adaptForPlatform(
  src: SourceInfo,
  target: TargetPlatform,
  mediaUrls: string[] = [],
): AdaptResult {
  const warnings: string[] = [];
  const need = MEDIA_RULE[target];
  let media = mediaUrls;
  if (need === 'video') {
    media = mediaUrls.filter((u) => /\.(mp4|mov|webm)(\?|$)/i.test(u));
    if (!media.length) warnings.push('動画が必要です。upload_media で動画を追加してから予約してください。');
  } else if (need === 'image') {
    media = mediaUrls.filter((u) => !/\.(mp4|mov|webm)(\?|$)/i.test(u));
    if (!media.length) warnings.push('画像が必要です。upload_media で画像を追加してください。');
  } else {
    media = mediaUrls.filter((u) => !/\.(mp4|mov|webm)(\?|$)/i.test(u)).slice(0, 4);
  }

  let content = '';
  const tags = src.hashtags;
  switch (target) {
    case 'x_thread': {
      const keep = tags.slice(0, 2).join(' ');
      content = toThread(src.body + (keep ? `\n${keep}` : ''));
      if (tags.length > 2) warnings.push(`ハッシュタグはXでは2個までに絞りました（${tags.length}→2）。`);
      break;
    }
    case 'instagram': {
      const kept = tags.slice(0, 30);
      content = clip(src.body, 2200 - (kept.join(' ').length + 2)) + (kept.length ? `\n\n${kept.join(' ')}` : '');
      if (!kept.length) warnings.push('ハッシュタグがありません。発見されやすくするため5〜10個の追加を推奨します。');
      if (/https?:\/\//.test(content)) warnings.push('Instagramのキャプション内URLはクリックできません。プロフィールリンクへ誘導してください。');
      break;
    }
    case 'facebook':
      content = clip(src.body + (tags.length ? `\n\n${tags.slice(0, 5).join(' ')}` : ''), 2000);
      break;
    case 'threads':
      content = clip(src.body + (tags[0] ? `\n${tags[0]}` : ''), 500);
      if (tags.length > 1) warnings.push('Threadsはトピックタグ1個が基本のため、最初の1個だけ残しました。');
      break;
    case 'line':
      content = clip(src.body.replace(MENTION_RE, '$1'), 500);
      if (tags.length) warnings.push('LINEではハッシュタグを削除しました。');
      break;
    case 'gbp':
      content = clip(src.body.replace(MENTION_RE, '$1'), 1500);
      if (tags.length) warnings.push('Googleビジネスではハッシュタグを削除しました。');
      if (!/https?:\/\//.test(content) && !/(電話|予約|ご来院|お問い合わせ|詳しく)/.test(content)) {
        warnings.push('行動を促す一言（予約・電話・詳細リンク）を足すと反応が上がります。');
      }
      break;
    case 'youtube_shorts': {
      const firstLine = src.body.split('\n')[0] ?? '';
      const title = clip(firstLine, 95);
      const rest = src.body.slice(firstLine.length).trim();
      content = `${title}\n\n${clip(rest || src.body, 4800)}\n\n${[...new Set(['#Shorts', ...tags])].slice(0, 5).join(' ')}`;
      break;
    }
    case 'tiktok':
      content = clip(src.body, 2000) + (tags.length ? `\n${tags.slice(0, 5).join(' ')}` : '');
      break;
  }
  return { platform: target, label: PLATFORM_LABEL[target], content, warnings, mediaUrls: media };
}
