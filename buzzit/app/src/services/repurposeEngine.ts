import { WATERMARK } from '../constants/brand';
import type { GeneratedScript, PlanTier, RepurposeContent } from '../types';
import { formatScriptForVideo } from './scriptGenerator';

function withWatermark(text: string, plan: PlanTier): string {
  if (plan === 'starter') {
    return `${text}\n\n— ${WATERMARK}`;
  }
  return text;
}

export function repurposeContent(
  idea: string,
  script: GeneratedScript,
  plan: PlanTier = 'starter',
): RepurposeContent[] {
  const topic = script.title.replace(/【.*?】/, '').trim() || idea.slice(0, 20);

  return [
    {
      platform: 'reels',
      label: 'リール動画・台本',
      content: withWatermark(formatScriptForVideo(script), plan),
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
          `理由は3つ。\n① 現場の声を反映\n② 再現性の高いフロー\n③ アフターケアまで設計`,
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

export async function scheduleToAyrshare(
  contents: RepurposeContent[],
  scheduledAt: Date,
): Promise<{ success: boolean; message: string }> {
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const platforms = contents.map((c) => c.label);
  return {
    success: true,
    message: `${platforms.length}件の投稿を ${scheduledAt.toLocaleString('ja-JP')} に予約しました（Ayrshare連携デモ）`,
  };
}
