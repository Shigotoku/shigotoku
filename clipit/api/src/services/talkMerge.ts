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

const FILLER_ONLY = /^(はい|あ+|えっと|お願いします|以上|うん|ん)[。．!！?？\s]*$/i;
const FILLER_START = /^(はい|あ+|えっと|お願いします|以上|うん|ん)([、,。\s]|$)/;
const ACTION_HINT = /まず|押す|検索|印刷|ボタン|画面|入力|選択|開く|クリック|ここに|ここで|ダッシュボード/;

function isFillerSegment(s: string): boolean {
  const t = s.trim();
  if (!t || t.length < 2) return true;
  if (FILLER_ONLY.test(t)) return true;
  const compact = t.replace(/[、,\s]/g, '');
  if (/^あ+$/.test(compact) || /^ああ+$/.test(compact)) return true;
  if (t.length < 18 && FILLER_START.test(t) && !ACTION_HINT.test(t)) return true;
  if (/^それだけです[。．]?$/.test(t)) return true;
  return false;
}
const ACTION_SPLIT =
  /(?<=[。．！？])\s*|(?<=ます)(?=\s*そうすると)|(?<=ます)(?=\s*押すと)|(?<=ます)(?=\s*ここに)|(?<=ます)(?=\s*ここで)|(?<=します)(?=\s*押すと)|(?<=します)(?=\s*そうすると)|(?<=[。．])(?=\s*まず)/;

function cleanMeetTranscript(raw: string): { body: string; isMeetFormat: boolean } {
  const hasMeetFooter = /より後に文字起こしが終了/.test(raw);
  const hasSpeakerLine = /\d{1,2}:\d{2}:\d{2}\s*\n+[^\n：:]+[：:]/.test(raw);
  const isMeetFormat = hasMeetFooter || hasSpeakerLine;

  let work = raw.replace(/\r\n/g, '\n').trim();
  work = work.replace(/この編集可能な文字起こし[\s\S]*$/g, '').trim();
  work = work.replace(/\d{1,2}:\d{2}:\d{2}\s*より後に文字起こしが終了[^\n]*/g, '').trim();

  const speakerMatch = work.match(
    /\d{1,2}:\d{2}:\d{2}\s*\n+[^\n：:]+[：:]\s*([\s\S]+)/,
  );
  if (speakerMatch) {
    return { body: speakerMatch[1].trim(), isMeetFormat: true };
  }

  const lines = work
    .split('\n')
    .map((l) => l.trim())
    .filter((t) => {
      if (!t) return false;
      if (/^\d{1,2}:\d{2}:\d{2}$/.test(t)) return false;
      if (/会議.*文字起こし/.test(t)) return false;
      if (/^\d{1,2}月\s*\d{1,2},?\s*\d{4}/.test(t)) return false;
      if (/より後に文字起こし/.test(t)) return false;
      if (/コンピュータが生成/.test(t)) return false;
      return true;
    });

  let body = lines.join(' ');
  body = body.replace(/^[^：:]+[：:]\s*/, '');
  return { body: body.trim() || raw.trim(), isMeetFormat };
}

function segmentTranscriptByActions(body: string): string[] {
  const normalized = body.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  let parts = normalized.split(ACTION_SPLIT).map((s) => s.trim()).filter((s) => s.length > 2);
  const refined: string[] = [];
  for (const p of parts) {
    if (p.length > 100) {
      refined.push(...p.split(/(?<=[。．])/).map((s) => s.trim()).filter((s) => s.length > 2));
    } else {
      refined.push(p);
    }
  }
  return refined.filter((s) => !isFillerSegment(s));
}

function bucketSegments(segments: string[], stepCount: number): string[] {
  if (stepCount <= 0 || !segments.length) return [];
  if (segments.length <= stepCount) {
    const out = [...segments];
    while (out.length < stepCount) out.push('');
    return out;
  }
  const per = Math.ceil(segments.length / stepCount);
  const buckets: string[] = [];
  for (let i = 0; i < stepCount; i++) {
    buckets.push(segments.slice(i * per, (i + 1) * per).join(''));
  }
  return buckets;
}

function pickSegmentForLabel(segments: string[], label: string, used: Set<number>): string | null {
  const keywords = label.replace(/[。．\s]+/g, ' ').trim().split(/\s+/).filter((w) => w.length > 1);
  if (!keywords.length) return null;
  let bestIdx = -1;
  let bestScore = 0;
  for (let i = 0; i < segments.length; i++) {
    if (used.has(i)) continue;
    const score = keywords.filter((k) => segments[i].includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  if (bestIdx < 0 || bestScore === 0) return null;
  used.add(bestIdx);
  return segments[bestIdx];
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
  body: string,
): MergedTalkStep[] {
  const n = Math.max(1, screenshots.length);
  const segments = segmentTranscriptByActions(body);
  const semanticChunks =
    segments.length >= 2 ? bucketSegments(segments, n) : splitTranscriptEvenly(body, n);
  const lines = extractTimestampedLines(transcript);
  const usedSegments = new Set<number>();

  return screenshots.map((shot, i) => {
    let segment = semanticChunks[i] ?? '';

    if (shot.label?.trim()) {
      const matched = pickSegmentForLabel(segments, shot.label.trim(), usedSegments);
      if (matched) segment = matched;
    }

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
  body: string,
  segments: string[],
  isMeetFormat: boolean,
): Promise<MergedTalkStep[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const shotMeta = screenshots
    .map(
      (s, i) =>
        `[画像${i + 1}] 撮影順=${i + 1} timestamp=${s.timestamp ?? 'なし'} 画面メモ=${s.label ?? '（未入力）'}`,
    )
    .join('\n');

  const segmentBlock =
    segments.length > 0
      ? `\n操作説明の分割候補（時系列順）:\n${segments.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
      : '';

  const meetNote = isMeetFormat
    ? `\n重要: これは Google Meet の文字起こしです。多くの場合、冒頭に1つだけタイムスタンプがあり本文は1ブロックです。タイムスタンプでの対応づけはできません。
代わりに (1) 各画像の画面内容（添付画像を見る） (2) 各画像の「画面メモ」 (3) 文字起こしの操作順序（まず→押すと→ここに→そうすると 等）で対応づけてください。
画像は説明の順にアップロードされています。`
    : '';

  const prompt = `あなたは日本の現場向け業務マニュアル編集者です。
Google Meetの文字起こしと、操作のスクリーンショットを対応づけて手順書にしてください。

対象者: ${audience}
文体: ${tone}
用語辞書（そのまま使う）: ${glossary.slice(0, 40).join('、')}
${meetNote}

文字起こし（本文）:
${body}

元の貼り付け全文（参考）:
${transcript.slice(0, 2000)}
${segmentBlock}

スクリーンショット一覧（画像は添付順＝説明の順）:
${shotMeta}

ルール:
- スクリーンショット枚数と同じ数の steps を返す（screenshotIndex は 0 始まり）
- 個人名・患者IDは出さない
- 注意・NG・確認は type に warning / ng_example / check を使う
- 画面メモがあれば最優先でその画像に対応づける
- タイムスタンプが行ごとに無い場合は、画像のUI要素と操作順序で判断する

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
  const rawTranscript = input.transcript.trim();
  const { body: cleanedBody, isMeetFormat } = cleanMeetTranscript(rawTranscript);
  const body = applyTermGlossary(cleanedBody, glossary);
  const transcript = applyTermGlossary(rawTranscript, glossary);
  const segments = segmentTranscriptByActions(body);

  if (!transcript) {
    throw Object.assign(new Error('文字起こしを入力してください'), { status: 400 });
  }
  if (!input.screenshots.length) {
    throw Object.assign(new Error('スクリーンショットを1枚以上追加してください'), { status: 400 });
  }

  if (isMeetFormat) {
    warnings.push(
      'Google Meet の文字起こしは詳細なタイムスタンプがないため、画像の画面内容・撮影順・各画像の「画面メモ」で説明と対応づけしています。',
    );
  }

  if (/患者名|氏名|ID[:：]\s*\d|マイナンバー/.test(transcript)) {
    warnings.push('個人情報らしき記述があります。公開前にマスキングを確認してください。');
  }

  let steps: MergedTalkStep[] | null = null;
  let usedGemini = false;

  if (input.useAi !== false) {
    steps = await mergeWithGemini(
      transcript,
      input.screenshots,
      tone,
      audience,
      glossary,
      body,
      segments,
      isMeetFormat,
    );
    if (steps) usedGemini = true;
  }

  if (!steps) {
    steps = fallbackMerge(transcript, input.screenshots, body);
    warnings.push(
      isMeetFormat
        ? 'AI統合に失敗したため、文字起こしを操作の区切りで分割して手順を作成しました。編集画面で調整してください。'
        : 'AI統合に失敗したため、文字起こしを均等分割して手順を作成しました。編集画面で調整してください。',
    );
  }

  // screenshotIndex を範囲内に
  steps = steps.map((s, i) => ({
    ...s,
    screenshotIndex: Math.min(Math.max(0, s.screenshotIndex ?? i), input.screenshots.length - 1),
  }));

  return { steps, usedGemini, warnings };
}
