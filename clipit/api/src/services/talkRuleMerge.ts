import type { InstructionTone, TargetAudience } from './instructionRules.js';
import type { MergedTalkStep, TalkScreenshotInput } from './talkMergeTypes.js';

/** 手順の区切りとして使える口語（Meet 文字起こし向け） */
const STEP_MARKER =
  /(?:^|[。．！？\s、,])(?:次(?:の画面|の手順|に|は)?|続いて|では次|では|さて|ここから|次のスライド|(?:\d+)枚目|画面(?:が|を)|スライド(?:が|を)?|いきます|移ります|進みます)(?=[、,。\s]|$)/gi;

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

export function segmentTranscriptByActions(body: string): string[] {
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

/** 「次」「続いて」等で文字起こしを手順単位に分割 */
export function splitByStepMarkers(body: string): string[] {
  const normalized = body.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const parts = normalized
    .split(STEP_MARKER)
    .map((s) => s.trim())
    .filter((s) => s.length > 2 && !isFillerSegment(s));

  return parts;
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

function splitTranscriptEvenly(body: string, parts: number): string[] {
  const sentences = body
    .split(/(?<=[。．！？\n])/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!sentences.length) return Array.from({ length: parts }, () => body.trim());
  const chunkSize = Math.max(1, Math.ceil(sentences.length / parts));
  const chunks: string[] = [];
  for (let i = 0; i < parts; i++) {
    chunks.push(sentences.slice(i * chunkSize, (i + 1) * chunkSize).join(''));
  }
  return chunks;
}

function parseTimestampToSeconds(ts: string): number | null {
  const m = ts.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = m[1] ? Number(m[1]) : 0;
  const min = Number(m[2]);
  const sec = Number(m[3]);
  return h * 3600 + min * 60 + sec;
}

function extractTimestampedLines(transcript: string): Array<{ at?: number; text: string }> {
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

function detectStepType(text: string): MergedTalkStep['type'] {
  if (/押さない|NG|禁止|してはいけない|ダメ/.test(text)) return 'ng_example';
  if (/注意|必ず|黒塗り|個人情報|確認して|間違え/.test(text)) return 'warning';
  if (/確認|チェック|最後に/.test(text)) return 'check';
  return 'normal';
}

function polishInstruction(
  segment: string,
  shot: TalkScreenshotInput,
): string {
  const base = segment.trim();
  if (!base) {
    return shot.label?.trim()
      ? `「${shot.label.trim()}」の操作を行います。`
      : '手順の操作を行います。';
  }
  const label = shot.label?.trim();
  if (label && !base.includes(label)) {
    const end = /[。．！？]$/.test(base) ? base : `${base}。`;
    return `${end.slice(0, -1)}（画面：${label}）。`;
  }
  return /[。．！？]$/.test(base) ? base : `${base}。`;
}

export type RuleMergeMethod = 'markers' | 'labels' | 'segments' | 'even';

export interface RuleMergeResult {
  steps: MergedTalkStep[];
  confidence: number;
  method: RuleMergeMethod;
}

export function scoreRuleMerge(
  chunks: string[],
  screenshotCount: number,
  method: RuleMergeMethod,
  labelMatchCount: number,
): number {
  let score = 0;
  const nonEmpty = chunks.filter((c) => c.trim().length > 8).length;

  if (method === 'markers') score += 0.45;
  else if (method === 'labels') score += 0.35;
  else if (method === 'segments') score += 0.25;
  else score += 0.1;

  if (chunks.length === screenshotCount) score += 0.2;
  else if (Math.abs(chunks.length - screenshotCount) <= 1) score += 0.1;

  if (nonEmpty >= screenshotCount) score += 0.15;
  else if (nonEmpty >= screenshotCount * 0.7) score += 0.08;

  score += Math.min(0.2, (labelMatchCount / Math.max(1, screenshotCount)) * 0.2);

  return Math.min(1, score);
}

/** 画像AIなし — 文字起こし・区切り語・画面メモ・撮影順で手順化 */
export function ruleBasedTalkMerge(input: {
  transcript: string;
  body: string;
  screenshots: TalkScreenshotInput[];
  tone: InstructionTone;
  audience: TargetAudience;
}): RuleMergeResult {
  const n = Math.max(1, input.screenshots.length);
  const segments = segmentTranscriptByActions(input.body);
  const markerParts = splitByStepMarkers(input.body);
  const lines = extractTimestampedLines(input.transcript);
  const usedSegments = new Set<number>();
  let method: RuleMergeMethod = 'even';
  let chunks: string[] = [];

  if (markerParts.length >= n && markerParts.length <= n + 2) {
    chunks = bucketSegments(markerParts, n);
    method = 'markers';
  } else if (markerParts.length >= 2) {
    chunks = bucketSegments(markerParts, n);
    method = 'markers';
  } else if (segments.length >= n) {
    chunks = bucketSegments(segments, n);
    method = 'segments';
  } else {
    chunks = splitTranscriptEvenly(input.body, n);
    method = 'even';
  }

  let labelMatchCount = 0;

  const steps = input.screenshots.map((shot, i) => {
    let segment = chunks[i] ?? '';

    if (shot.label?.trim()) {
      const matched = pickSegmentForLabel(segments, shot.label.trim(), usedSegments);
      if (matched) {
        segment = matched;
        labelMatchCount += 1;
        if (method === 'even') method = 'labels';
      }
    }

    if (shot.timestamp) {
      const at = parseTimestampToSeconds(shot.timestamp);
      if (at != null) {
        const near = lines.filter((l) => l.at != null && Math.abs((l.at ?? 0) - at) <= 45);
        if (near.length) {
          segment = near.map((l) => l.text).join(' ');
          labelMatchCount += 1;
        }
      }
    }

    const instruction = polishInstruction(segment, shot);
    const firstSentence = segment.split(/(?<=[。．！？])/)[0]?.trim() || shot.label?.trim() || `手順 ${i + 1}`;

    return {
      title: firstSentence.slice(0, 40) || `手順 ${i + 1}`,
      instruction,
      note: detectStepType(segment) !== 'normal' ? segment.slice(0, 120) : '',
      type: detectStepType(segment),
      elementText: shot.label ?? '',
      screenshotIndex: i,
    };
  });

  const confidence = scoreRuleMerge(chunks, n, method, labelMatchCount);

  return { steps, confidence, method };
}

/** ルール統合だけで Gemini を省略してよいか */
export const RULE_MERGE_CONFIDENCE_THRESHOLD = 0.62;
