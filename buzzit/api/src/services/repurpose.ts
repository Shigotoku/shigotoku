import { shouldApplyWatermark, WATERMARK_SUFFIX } from './planLimits';

const NG_WORDS = [
  '完全治癒',
  '必ず治る',
  '100%効果',
  '副作用なし',
  '医師推奨',
  '永久脱毛',
];

export function checkBrandSafety(text: string) {
  const violations = NG_WORDS.filter((word) => text.includes(word));
  return { safe: violations.length === 0, violations };
}

function extractTopic(idea: string): string {
  const trimmed = idea.trim();
  if (!trimmed) return '新作メニュー';
  const match = trimmed.match(/[「『](.+?)[」』]/);
  return match?.[1] ?? trimmed.slice(0, 24);
}

function generateScript(idea: string) {
  const topic = extractTopic(idea);
  return {
    title: `【悲報】${topic}、知らないと損します`,
    hook: `「${topic}に興味あるけど、失敗したくない…」そんなお悩み、ありませんか？`,
    body: `実は${topic}は、選び方ひとつで仕上がりが全然変わります。\n\n当店では現場の声をもとに、再現性の高い施術フローを整えています。`,
    cta: '詳細はプロフィールのLINEから。限定クーポン配布中✨',
  };
}

function withWatermark(text: string, plan: string) {
  if (shouldApplyWatermark(plan)) return `${text}${WATERMARK_SUFFIX}`;
  return text;
}

export function repurposeFromIdea(idea: string, plan: string, mediaUrls?: string[]) {
  const script = generateScript(idea);
  const topic = script.title.replace(/【.*?】/, '').trim() || idea.slice(0, 20);
  const mediaNote = mediaUrls?.length ? `\n\n[添付素材: ${mediaUrls.length}件]` : '';

  return [
    {
      platform: 'reels',
      label: 'リール動画・台本',
      content: withWatermark(
        `【タイトル】${script.title}\n\n【フック】${script.hook}\n\n【本編】\n${script.body}\n\n【CTA】${script.cta}${mediaNote}`,
        plan,
      ),
    },
    {
      platform: 'carousel',
      label: 'Instagram カルーセル',
      content: withWatermark(`${topic}の3つのポイント`, plan),
      carouselSlides: [
        `表紙: ${script.title}`,
        `ポイント1: ${script.hook}`,
        `ポイント2: ${script.body.split('\n')[0]}`,
        `CTA: ${script.cta}`,
      ],
    },
    {
      platform: 'x_thread',
      label: 'X (Twitter) スレッド',
      content: withWatermark(
        [
          `${script.title}\n\n${script.hook}`,
          '理由は3つ。\n① 現場の声を反映\n② 再現性の高いフロー\n③ アフターケアまで設計',
          script.cta,
        ].join('\n\n---\n\n'),
        plan,
      ),
    },
    {
      platform: 'line',
      label: 'LINE公式アカウント配信',
      content: withWatermark(
        `こんにちは！\n\n今日はお友だち限定で「${topic}」のご案内です。\n\n${script.body}\n\n${script.cta}`,
        plan,
      ),
    },
  ];
}

export const ACCEPTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
