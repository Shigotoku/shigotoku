import crypto from 'crypto';
import { generateRepurposeWithGemini } from './gemini';

export function verifySlackSignature(
  signingSecret: string,
  timestamp: string,
  body: string,
  signature: string,
): boolean {
  const base = `v0:${timestamp}:${body}`;
  const hmac = crypto.createHmac('sha256', signingSecret).update(base).digest('hex');
  return signature === `v0=${hmac}`;
}

export async function postToSlackWebhook(
  webhookUrl: string,
  text: string,
  blocks?: unknown[],
): Promise<boolean> {
  if (!webhookUrl) return false;

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(blocks ? { text, blocks } : { text }),
  });

  return res.ok;
}

export async function formatSlackIdeaReply(ideaText: string, plan: string): Promise<string> {
  const { results } = await generateRepurposeWithGemini(ideaText, plan);
  const reels = results.find((r) => r.platform === 'reels');
  return reels?.content ?? ideaText;
}

export type NotificationSlot = 'morning' | 'noon' | 'evening';

export function buildStrategicNotification(
  slot: NotificationSlot,
  metrics: { healthScore: number; estimatedRevenue: number; lineFriends: number },
): string {
  switch (slot) {
    case 'morning':
      return `☀️ *【朝の全社レポート】*\n健康スコア: ${metrics.healthScore}点\n推定売上: ¥${metrics.estimatedRevenue.toLocaleString()}\nLINE友だち: ${metrics.lineFriends}件\n\n💡 今日は「保存率」を上げるフックから始めましょう。`;
    case 'noon':
      return `🍽 *【昼の承認依頼】*\n本日の投稿案が生成されました。\nBuzzIt で内容を確認し、承認してください。\n👉 https://app.buzzit.shigotoku.com/magic-creator`;
    case 'evening':
      return `🌙 *【夜のバズ通知】*\n本日の投稿が伸び始めています！\nチーム全員でエンゲージメントを増やしましょう 🔥`;
    default:
      return 'BuzzIt 通知';
  }
}
