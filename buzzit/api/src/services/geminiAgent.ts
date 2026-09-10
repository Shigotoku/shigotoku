/**
 * Gemini 戦略エージェント（Phase 8 スキャフォールド）
 */
import { generateRepurposeWithGemini } from './gemini';
import { getMetrics, getPosts, getUserSettings } from './firestore';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function runStrategyAgent(
  uid: string,
  messages: AgentMessage[],
): Promise<{ reply: string; suggestions: string[]; usedGemini: boolean }> {
  const settings = await getUserSettings(uid);
  const metrics = await getMetrics(uid);
  const posts = await getPosts(uid);
  const topPost = posts.sort((a, b) => b.reach - a.reach)[0];

  const context = `
店舗プラン: ${settings.plan}
業種: ${settings.industry ?? 'salon'}
健康スコア: ${metrics.healthScore}
LINE友だち: ${metrics.funnel.lineSignups}
推計売上: ¥${metrics.funnel.revenue.toLocaleString()}
直近ベスト投稿: ${topPost?.title ?? 'なし'}（リーチ ${topPost?.reach ?? 0})
`;

  const apiKey = process.env.GEMINI_API_KEY;
  const lastUser = messages.filter((m) => m.role === 'user').pop()?.content ?? '今日のSNS戦略を教えて';

  if (!apiKey) {
    const { results } = await generateRepurposeWithGemini(lastUser, settings.plan);
    const reels = results.find((r) => r.platform === 'reels');
    return {
      reply: `（オフラインモード）健康スコア ${metrics.healthScore}。まずは「${reels?.content.slice(0, 80) ?? '新作メニュー'}」を投稿しましょう。`,
      suggestions: ['リールを1本投稿', 'LINEセグメント配信を検討', 'トレンドを確認'],
      usedGemini: false,
    };
  }

  const history = messages
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'ユーザー' : 'BuzzIt'}: ${m.content}`)
    .join('\n');

  const prompt = `あなたは店舗SNS・LINEの経営アドバイザーです。以下の店舗データを踏まえ、短く具体的に日本語で回答してください。

${context}

会話:
${history}

出力形式（JSONのみ）:
{
  "reply": "200文字以内の回答",
  "suggestions": ["次のアクション1", "次のアクション2", "次のアクション3"]
}`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 1024 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('parse failed');
    const parsed = JSON.parse(jsonMatch[0]) as { reply?: string; suggestions?: string[] };
    return {
      reply: parsed.reply ?? '本日は承認待ち投稿の確認から始めましょう。',
      suggestions: parsed.suggestions ?? [],
      usedGemini: true,
    };
  } catch {
    return {
      reply: `健康スコア ${metrics.healthScore}。今日は1本リールを投稿し、LINEの空き枠を案内しましょう。`,
      suggestions: ['マジック・クリエイターで台本生成', 'ダッシュボードで承認待ち確認'],
      usedGemini: false,
    };
  }
}
