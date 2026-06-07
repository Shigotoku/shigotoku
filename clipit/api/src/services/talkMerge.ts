import type { InstructionTone, TargetAudience } from './gemini.js';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface TalkScreenshotInput {
  imageBase64: string;
  timestamp?: string;
  label?: string;
}

export interface MergedTalkStep {
  title: string;
  instruction: string;
  note?: string;
  type?: 'normal' | 'warning' | 'ng_example' | 'check';
  elementText?: string;
  screenshotIndex: number;
}

export interface TalkMergeResult {
  steps: MergedTalkStep[];
  usedGemini: boolean;
  warnings: string[];
}

const DEFAULT_GLOSSARY = [
  'ClipIt',
  'クリッピット',
  'WebORCA',
  'CLIUS',
  'レセコン',
  '受付リスト',
  '生活習慣病管理料',
  '外来データ提出加算',
  'Google Meet',
  'Google Workspace',
];

export function normalizeGlossary(terms?: string[]): string[] {
  const merged = [...DEFAULT_GLOSSARY, ...(terms ?? [])];
  return [...new Set(merged.map((t) => t.trim()).filter(Boolean))];
}

/** 文字起こしの誤変換を用語辞書で軽く補正（完全一致・部分一致） */
export function applyTermGlossary(text: string, glossary: string[]): string {
  let out = text;
  for (const term of glossary) {
    const broken = term.replace(/\s+/g, '');
    if (broken.length < 3) continue;
    const re = new RegExp(broken.split('').join('\\s*'), 'gi');
    out = out.replace(re, term);
  }
  return out;
}

function parseTimestampToSeconds(ts: string): number | null {
  const m = ts.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = m[1] ? Number(m[1]) : 0;
  const min = Number(m[2]);
  const sec = Number(m[3]);
  return h * 3600 + min * 60 + sec;
}

export function extractTimestampedLines(transcript: string): Array<{ at?: number; text: string }> {
  const lines: Array<{ at?: number; text: string }> = [];
  for (const raw of transcript.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)$/);
    if (m) {
      lines.push({ at: parseTimestampToSeconds(m[1]) ?? undefined, text: m[2].trim() });
    } else {
      lines.push({ text: line });
    }
  }
  return lines;
}

function splitTranscriptEvenly(transcript: string, parts: number): string[] {
  const sentences = transcript
    .split(/(?<=[。．！？\n])/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!sentences.length) return Array.from({ length: parts }, () => transcript.trim());
  const chunkSize = Math.max(1, Math.ceil(sentences.length / parts));
  const chunks: string[] = [];
  for (let i = 0; i < parts; i++) {
    chunks.push(sentences.slice(i * chunkSize, (i + 1) * chunkSize).join(''));
  }
  return chunks;
}

function detectStepType(text: string): MergedTalkStep['type'] {
  if (/押さない|NG|禁止|してはいけない|ダメ/.test(text)) return 'ng_example';
  if (/注意|必ず|黒塗り|個人情報|確認して|間違え/.test(text)) return 'warning';
  if (/確認|チェック|最後に/.test(text)) return 'check';
  return 'normal';
}

function fallbackMerge(
  transcript: string,
  screenshots: TalkScreenshotInput[],
): MergedTalkStep[] {
  const n = Math.max(1, screenshots.length);
  const chunks = splitTranscriptEvenly(transcript, n);
  const lines = extractTimestampedLines(transcript);

  return screenshots.map((shot, i) => {
    let segment = chunks[i] ?? '';
    if (shot.timestamp) {
      const at = parseTimestampToSeconds(shot.timestamp);
      if (at != null) {
        const near = lines.filter((l) => l.at != null && Math.abs((l.at ?? 0) - at) <= 45);
        if (near.length) segment = near.map((l) => l.text).join(' ');
      }
    }
    const firstSentence = segment.split(/(?<=[。．！？])/)[0]?.trim() || `手順 ${i + 1}`;
    return {
      title: firstSentence.slice(0, 40) || `手順 ${i + 1}`,
      instruction: segment || `手順 ${i + 1} の操作を行います。`,
      note: detectStepType(segment) !== 'normal' ? segment : '',
      type: detectStepType(segment),
      elementText: shot.label ?? '',
      screenshotIndex: i,
    };
  });
}

async function mergeWithGemini(
  transcript: string,
  screenshots: TalkScreenshotInput[],
  tone: InstructionTone,
  audience: TargetAudience,
  glossary: string[],
): Promise<MergedTalkStep[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const shotMeta = screenshots
    .map(
      (s, i) =>
        `[画像${i + 1}] timestamp=${s.timestamp ?? 'なし'} label=${s.label ?? ''}`,
    )
    .join('\n');

  const prompt = `あなたは日本の現場向け業務マニュアル編集者です。
Google Meetの文字起こしと、操作のスクリーンショットを対応づけて手順書にしてください。

対象者: ${audience}
文体: ${tone}
用語辞書（そのまま使う）: ${glossary.slice(0, 40).join('、')}

文字起こし:
${transcript}

スクリーンショット一覧（画像は添付順）:
${shotMeta}

ルール:
- スクリーンショット枚数と同じ数の steps を返す（screenshotIndex は 0 始まり）
- 個人名・患者IDは出さない
- 注意・NG・確認は type に warning / ng_example / check を使う
- タイムスタンプがあれば近い説明を対応づける

JSONのみ返す:
{"steps":[{"title":"短い見出し","instruction":"1〜3文","note":"補足または空","type":"normal","elementText":"","screenshotIndex":0}]}`;

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
    { text: prompt },
  ];

  for (const shot of screenshots.slice(0, 8)) {
    const m = shot.imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!m) continue;
    parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
  }

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096, responseMimeType: 'application/json' },
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return null;
    const parsed = JSON.parse(text) as { steps?: MergedTalkStep[] };
    if (!parsed.steps?.length) return null;
    return parsed.steps.map((s, i) => ({
      title: s.title || `手順 ${i + 1}`,
      instruction: s.instruction || '',
      note: s.note ?? '',
      type: s.type ?? 'normal',
      elementText: s.elementText ?? '',
      screenshotIndex:
        typeof s.screenshotIndex === 'number' ? s.screenshotIndex : i,
    }));
  } catch (err) {
    console.warn('talk merge gemini failed:', err);
    return null;
  }
}

export async function mergeTalkSteps(input: {
  transcript: string;
  screenshots: TalkScreenshotInput[];
  tone?: InstructionTone;
  audience?: TargetAudience;
  glossary?: string[];
  useAi?: boolean;
}): Promise<TalkMergeResult> {
  const warnings: string[] = [];
  const tone = input.tone ?? 'simple';
  const audience = input.audience ?? 'new_staff';
  const glossary = normalizeGlossary(input.glossary);
  const transcript = applyTermGlossary(input.transcript.trim(), glossary);

  if (!transcript) {
    throw Object.assign(new Error('文字起こしを入力してください'), { status: 400 });
  }
  if (!input.screenshots.length) {
    throw Object.assign(new Error('スクリーンショットを1枚以上追加してください'), { status: 400 });
  }

  if (/患者名|氏名|ID[:：]\s*\d|マイナンバー/.test(transcript)) {
    warnings.push('個人情報らしき記述があります。公開前にマスキングを確認してください。');
  }

  let steps: MergedTalkStep[] | null = null;
  let usedGemini = false;

  if (input.useAi !== false) {
    steps = await mergeWithGemini(transcript, input.screenshots, tone, audience, glossary);
    if (steps) usedGemini = true;
  }

  if (!steps) {
    steps = fallbackMerge(transcript, input.screenshots);
    warnings.push('AI統合に失敗したため、文字起こしを均等分割して手順を作成しました。編集画面で調整してください。');
  }

  // screenshotIndex を範囲内に
  steps = steps.map((s, i) => ({
    ...s,
    screenshotIndex: Math.min(Math.max(0, s.screenshotIndex ?? i), input.screenshots.length - 1),
  }));

  return { steps, usedGemini, warnings };
}
