/** Google Meet ドキュメント貼り付け用の前処理・手順分割 */

export type ParsedMeetTranscript = {
  body: string;
  startedAtSec?: number;
  endedAtSec?: number;
  durationSec?: number;
  segments: string[];
  suggestedStepCount: number;
};

export function parseTimestampToSeconds(ts: string): number | null {
  const m = ts.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = m[1] ? Number(m[1]) : 0;
  const min = Number(m[2]);
  const sec = Number(m[3]);
  return h * 3600 + min * 60 + sec;
}

/** VTT / プレーンテキストから文字起こし本文を抽出 */
export function parseTranscriptFile(content: string, filename?: string): string {
  const name = (filename ?? '').toLowerCase();
  if (name.endsWith('.vtt') || content.trimStart().startsWith('WEBVTT')) {
    return content
      .replace(/\r\n/g, '\n')
      .split('\n')
      .filter((line) => {
        const t = line.trim();
        if (!t) return false;
        if (t === 'WEBVTT') return false;
        if (/^\d+$/.test(t)) return false;
        if (t.includes('-->')) return false;
        if (/^\d{2}:\d{2}:\d{2}/.test(t)) return false;
        if (/^NOTE/.test(t)) return false;
        return true;
      })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return content.replace(/\r\n/g, '\n').trim();
}

/** Google ドキュメントの Meet 文字起こしから本文だけ抽出 */
export function cleanMeetTranscript(raw: string): {
  body: string;
  startedAtSec?: number;
  endedAtSec?: number;
} {
  let work = raw.replace(/\r\n/g, '\n').trim();

  const endMatch = work.match(/(\d{1,2}:\d{2}:\d{2})\s*より後に文字起こしが終了/);
  const endedAtSec = endMatch ? parseTimestampToSeconds(endMatch[1]) ?? undefined : undefined;

  work = work.replace(/この編集可能な文字起こし[\s\S]*$/g, '').trim();
  work = work.replace(/\d{1,2}:\d{2}:\d{2}\s*より後に文字起こしが終了[^\n]*/g, '').trim();

  const startMatch = work.match(/(\d{1,2}:\d{2}:\d{2})/);
  const startedAtSec = startMatch ? parseTimestampToSeconds(startMatch[1]) ?? undefined : undefined;

  const speakerMatch = work.match(
    /\d{1,2}:\d{2}:\d{2}\s*\n+[^\n：:]+[：:]\s*([\s\S]+)/,
  );
  if (speakerMatch) {
    return { body: speakerMatch[1].trim(), startedAtSec, endedAtSec };
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
  return { body: body.trim(), startedAtSec, endedAtSec };
}

const FILLER_ONLY = /^(はい|あ+|えっと|お願いします|以上|うん|ん)[。．!！?？\s]*$/i;
const FILLER_START = /^(はい|あ+|えっと|お願いします|以上|うん|ん)([、,。\s]|$)/;
const ACTION_HINT = /まず|押す|検索|印刷|ボタン|画面|入力|選択|開く|クリック|ここに|ここで|ダッシュボード/;

function isFillerSegment(s: string): boolean {
  const t = s.trim();
  if (!t || t.length < 2) return true;
  if (FILLER_ONLY.test(t)) return true;
  const compact = t.replace(/[、,\s]/g, "");
  if (/^あ+$/.test(compact) || /^ああ+$/.test(compact)) return true;
  if (t.length < 18 && FILLER_START.test(t) && !ACTION_HINT.test(t)) return true;
  if (/^それだけです[。．]?$/.test(t)) return true;
  return false;
}

const ACTION_SPLIT =
  /(?<=[。．！？])\s*|(?<=ます)(?=\s*そうすると)|(?<=ます)(?=\s*押すと)|(?<=ます)(?=\s*ここに)|(?<=ます)(?=\s*ここで)|(?<=します)(?=\s*押すと)|(?<=します)(?=\s*そうすると)|(?<=[。．])(?=\s*まず)/;

/** 操作説明らしい文に分割（Meet の1ブロック形式向け） */
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

/** 手順数に合わせてセグメントを束ねる */
export function bucketSegments(segments: string[], stepCount: number): string[] {
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

export function parseMeetTranscript(raw: string, screenshotCount = 0): ParsedMeetTranscript {
  const { body, startedAtSec, endedAtSec } = cleanMeetTranscript(raw);
  const segments = segmentTranscriptByActions(body);
  const durationSec =
    startedAtSec != null && endedAtSec != null ? Math.max(0, endedAtSec - startedAtSec) : undefined;
  const suggestedStepCount = Math.max(1, segments.length || (screenshotCount > 0 ? screenshotCount : 3));

  return {
    body,
    startedAtSec,
    endedAtSec,
    durationSec,
    segments,
    suggestedStepCount,
  };
}

/** スクショ枚数に合わせたラベル候補（タイムスタンプ不要） */
export function suggestLabelsFromTranscript(raw: string, screenshotCount: number): string[] {
  if (!screenshotCount) return [];
  const { segments } = parseMeetTranscript(raw, screenshotCount);
  const buckets = bucketSegments(segments, screenshotCount);
  return buckets.map((text, i) => {
    if (!text) return `手順 ${i + 1}`;
    const first = text.split(/(?<=[。．])/)[0]?.trim() || text;
    return first.slice(0, 48);
  });
}
