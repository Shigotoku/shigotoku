import { repurposeFromIdea } from './repurpose';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface RepurposeResult {
  platform: string;
  label: string;
  content: string;
  carouselSlides?: string[];
}

export async function generateRepurposeWithGemini(
  idea: string,
  plan: string,
  mediaUrls?: string[],
): Promise<{ results: RepurposeResult[]; usedGemini: boolean }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { results: repurposeFromIdea(idea, plan, mediaUrls), usedGemini: false };
  }

  const mediaNote = mediaUrls?.length ? `添付素材URL: ${mediaUrls.join(', ')}` : '素材なし';
  const watermark = plan === 'starter' ? '\n\n— Powered by BuzzIt' : '';

  const prompt = `あなたは美容室・サロン向けSNSマーケのプロです。
以下のアイデアから4プラットフォーム向けコンテンツをJSONのみで生成してください。

アイデア: ${idea}
${mediaNote}

出力形式（JSONのみ、説明不要）:
{
  "results": [
    { "platform": "reels", "label": "リール動画・台本", "content": "..." },
    { "platform": "carousel", "label": "Instagram カルーセル", "content": "...", "carouselSlides": ["表紙", "ポイント1", "ポイント2", "CTA"] },
    { "platform": "x_thread", "label": "X (Twitter) スレッド", "content": "..." },
    { "platform": "line", "label": "LINE公式アカウント配信", "content": "..." }
  ]
}

医療・薬機法に抵触する表現（完全治癒、必ず治る等）は使わないこと。`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      }),
    });

    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Gemini JSON parse failed');

    const parsed = JSON.parse(jsonMatch[0]) as { results: RepurposeResult[] };
    if (!parsed.results?.length) throw new Error('Empty Gemini results');

    const results = parsed.results.map((r) => ({
      ...r,
      content: plan === 'starter' ? `${r.content}${watermark}` : r.content,
    }));

    return { results, usedGemini: true };
  } catch (err) {
    console.warn('Gemini fallback:', err);
    return { results: repurposeFromIdea(idea, plan, mediaUrls), usedGemini: false };
  }
}

export async function generateMissionAdvice(metrics: {
  healthScore: number;
  estimatedRevenue: number;
  lineFriends: number;
}): Promise<{ title: string; description: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      title: '本日のリール動画を承認してください',
      description: `健康スコア ${metrics.healthScore}。昨日比で改善余地あり。AIが生成した台本を確認し、15分以内に投稿を完了しましょう。`,
    };
  }

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `美容室SNS担当向けに「今日のミッション」を1件、JSONで返してください。
健康スコア:${metrics.healthScore}, 推定売上:${metrics.estimatedRevenue}, LINE友だち:${metrics.lineFriends}
形式: {"title":"...","description":"..."}`,
          }],
        }],
        generationConfig: { maxOutputTokens: 256 },
      }),
    });
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {
    // fallback below
  }

  return {
    title: '本日の投稿を承認してください',
    description: 'AIが最適な投稿案を用意しました。マジック・クリエイターで確認してください。',
  };
}
