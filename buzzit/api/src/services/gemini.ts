import { repurposeFromIdea } from './repurpose';
import { shouldApplyWatermark, WATERMARK_SUFFIX } from './planLimits';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface RepurposeResult {
  platform: string;
  label: string;
  content: string;
  carouselSlides?: string[];
}

function applyStarterWatermark(results: RepurposeResult[], plan: string): RepurposeResult[] {
  if (!shouldApplyWatermark(plan)) return results;
  return results.map((r) => ({ ...r, content: `${r.content}${WATERMARK_SUFFIX}` }));
}

function parseGeminiJson(text: string): RepurposeResult[] {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini JSON parse failed');
  const parsed = JSON.parse(jsonMatch[0]) as { results: RepurposeResult[] };
  if (!parsed.results?.length) throw new Error('Empty Gemini results');
  return parsed.results;
}

const REPURPOSE_SCHEMA = `{
  "results": [
    { "platform": "reels", "label": "リール動画・台本", "content": "..." },
    { "platform": "carousel", "label": "Instagram カルーセル", "content": "...", "carouselSlides": ["表紙", "ポイント1", "ポイント2", "CTA"] },
    { "platform": "x_thread", "label": "X (Twitter) スレッド", "content": "..." },
    { "platform": "line", "label": "LINE公式アカウント配信", "content": "..." }
  ]
}`;

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
  const prompt = `あなたは美容室・サロン向けSNSマーケのプロです。
以下のアイデアから4プラットフォーム向けコンテンツをJSONのみで生成してください。

アイデア: ${idea}
${mediaNote}

出力形式（JSONのみ、説明不要）:
${REPURPOSE_SCHEMA}

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
    const results = applyStarterWatermark(parseGeminiJson(text), plan);
    return { results, usedGemini: true };
  } catch (err) {
    console.warn('Gemini fallback:', err);
    return { results: repurposeFromIdea(idea, plan, mediaUrls), usedGemini: false };
  }
}

/** 音声を Gemini マルチモーダルで文字起こしし、同時に4媒体下書きを生成 */
export async function voiceDraftWithGemini(
  audioBase64: string,
  mimeType: string,
  plan: string,
  hint?: string,
): Promise<{ transcript: string; results: RepurposeResult[]; usedGemini: boolean }> {
  const apiKey = process.env.GEMINI_API_KEY;
  const fallbackIdea = hint?.trim() || '今日の施術・接客についてのカウンセリング会話';
  if (!apiKey) {
    const { results } = await generateRepurposeWithGemini(fallbackIdea, plan);
    return { transcript: fallbackIdea, results, usedGemini: false };
  }

  const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');
  const hintNote = hint?.trim() ? `補足ヒント: ${hint.trim()}` : '補足ヒントなし';
  const prompt = `あなたは店舗SNSマーケのプロです。添付の音声を正確に文字起こしし、内容から4プラットフォーム向け投稿案をJSONのみで返してください。

${hintNote}

出力形式（JSONのみ、説明不要）:
{
  "transcript": "音声の文字起こし全文",
  "results": [
    { "platform": "reels", "label": "リール動画・台本", "content": "..." },
    { "platform": "carousel", "label": "Instagram カルーセル", "content": "...", "carouselSlides": ["表紙", "ポイント1", "ポイント2", "CTA"] },
    { "platform": "x_thread", "label": "X (Twitter) スレッド", "content": "..." },
    { "platform": "line", "label": "LINE公式アカウント配信", "content": "..." }
  ]
}

医療・薬機法に抵触する表現は使わないこと。音声が聞き取れない場合は聞こえた範囲だけ文字起こしし、不足はヒントから補完すること。`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: mimeType || 'audio/webm', data: cleanBase64 } },
              { text: prompt },
            ],
          },
        ],
        generationConfig: { temperature: 0.5, maxOutputTokens: 3072 },
      }),
    });

    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Gemini voice JSON parse failed');

    const parsed = JSON.parse(jsonMatch[0]) as { transcript?: string; results?: RepurposeResult[] };
    const transcript = (parsed.transcript ?? '').trim() || fallbackIdea;
    if (!parsed.results?.length) {
      const { results, usedGemini } = await generateRepurposeWithGemini(transcript, plan);
      return { transcript, results, usedGemini };
    }
    return {
      transcript,
      results: applyStarterWatermark(parsed.results, plan),
      usedGemini: true,
    };
  } catch (err) {
    console.warn('Gemini voice-draft fallback:', err);
    const { results } = await generateRepurposeWithGemini(fallbackIdea, plan);
    return { transcript: fallbackIdea, results, usedGemini: false };
  }
}

export interface XSeriesDraftItem {
  text: string;
  tags?: string;
  title?: string;
  linkUrl?: string;
  imageAlt?: string;
}

const X_SERIES_BATCH_SCHEMA = `{
  "items": [
    {
      "text": "ツイート本文（280字以内・フック＋要点）",
      "tags": "#ハッシュタグ（任意）",
      "title": "記事・論文タイトル（任意）",
      "linkUrl": "https://...（任意）",
      "imageAlt": "画像の説明（任意）"
    }
  ]
}`;

/** テーマ・URLリストから X シリーズ用の投稿在庫を一括生成 */
export async function generateXSeriesBatchWithGemini(
  sourceLines: string[],
  plan: string,
  seriesHint?: string,
): Promise<{ items: XSeriesDraftItem[]; usedGemini: boolean }> {
  const lines = sourceLines.map((l) => l.trim()).filter(Boolean).slice(0, 20);
  if (!lines.length) return { items: [], usedGemini: false };

  const apiKey = process.env.GEMINI_API_KEY;
  const fallback = (): XSeriesDraftItem[] =>
    lines.map((line) => ({
      text: line.length > 260 ? `${line.slice(0, 259)}…` : line,
      linkUrl: /^https?:\/\//i.test(line) ? line : undefined,
    }));

  if (!apiKey) {
    return { items: fallback(), usedGemini: false };
  }

  const hint = seriesHint?.trim() ? `シリーズの文脈: ${seriesHint.trim()}` : 'シリーズの文脈: 店舗・専門家向けの信頼性ある発信';
  const prompt = `あなたはSNS運用のプロです。以下の入力（1行1テーマ・URL・論文・ネタ）から、X（Twitter）投稿在庫をJSONのみで生成してください。

${hint}
入力（${lines.length}件）:
${lines.map((l, i) => `${i + 1}. ${l}`).join('\n')}

各 item の text は単体で280字以内。読者の興味を引く要点＋一言コメント。
URLが入力に含まれる場合は linkUrl に入れ、title は記事名・論文名を要約。
tags は1〜3個のハッシュタグ（日本語可）。
医療・薬機法に抵触する表現（完全治癒、必ず治る等）は使わないこと。
入力件数と同じ件数の items を返すこと。

出力形式（JSONのみ）:
${X_SERIES_BATCH_SCHEMA}`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.65, maxOutputTokens: 8192 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Gemini JSON parse failed');
    const parsed = JSON.parse(jsonMatch[0]) as { items?: XSeriesDraftItem[] };
    const items = (parsed.items ?? [])
      .filter((it) => it.text?.trim())
      .map((it) => ({
        text: it.text.trim(),
        tags: it.tags?.trim() || undefined,
        title: it.title?.trim() || undefined,
        linkUrl: it.linkUrl?.trim() || undefined,
        imageAlt: it.imageAlt?.trim() || undefined,
      }));
    if (!items.length) throw new Error('Empty batch');
    return { items, usedGemini: true };
  } catch (err) {
    console.warn('Gemini x-series batch fallback:', err);
    return { items: fallback(), usedGemini: false };
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

export interface GeminiInsightTakeaway {
  type: 'success' | 'warning' | 'tip';
  title: string;
  body: string;
  actionLabel?: string;
  actionPath?: string;
}

/** SNS解析の AI サマリー（Buffer Takeaways / Hootsuite Wisdom 相当） */
export async function generateInsightsTakeawaysWithGemini(input: {
  totals: {
    impressions: number;
    reach: number;
    engagements: number;
    postCount: number;
    clicks: number;
    lineSignups: number;
  };
  byPlatform: Record<string, { impressions: number; engagements: number; postCount: number }>;
  topPosts: Array<{ platform: string; preview: string; impressions: number; engagement: number }>;
  lineFollowers: number | null;
  periodDays: number;
}): Promise<{ takeaways: GeminiInsightTakeaway[]; usedGemini: boolean }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { takeaways: [], usedGemini: false };

  const prompt = `あなたは美容室・サロン向けSNSコンサルタントです。
以下の解析データから、オーナーが今日やるべきことを3件、JSONのみで返してください。

期間: 直近${input.periodDays}日
合計表示: ${input.totals.impressions}
リーチ: ${input.totals.reach}
反応: ${input.totals.engagements}
投稿数: ${input.totals.postCount}
クリック: ${input.totals.clicks}
LINE追加: ${input.totals.lineSignups}
LINE友だち: ${input.lineFollowers ?? '未連携'}
媒体別: ${JSON.stringify(input.byPlatform)}
トップ投稿: ${JSON.stringify(input.topPosts.slice(0, 3))}

出力形式（JSONのみ）:
{
  "takeaways": [
    {
      "type": "success" | "warning" | "tip",
      "title": "短い見出し",
      "body": "具体的な1〜2文のアドバイス",
      "actionLabel": "ボタン文言（任意）",
      "actionPath": "/magic-creator 等のパス（任意）"
    }
  ]
}

医療広告・薬機法に抵触する表現は避け、実行しやすい行動に落とし込むこと。`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.4 },
      }),
    });
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { takeaways: [], usedGemini: false };
    const parsed = JSON.parse(match[0]) as { takeaways?: GeminiInsightTakeaway[] };
    const takeaways = (parsed.takeaways ?? [])
      .filter((t) => t.title && t.body && ['success', 'warning', 'tip'].includes(t.type))
      .slice(0, 3);
    return { takeaways, usedGemini: takeaways.length > 0 };
  } catch {
    return { takeaways: [], usedGemini: false };
  }
}
