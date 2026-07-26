import type { InstructionTone, TargetAudience } from './gemini.js';
import { polishTalkInstructionsBatch } from './gemini.js';
import { ruleBasedTalkMerge } from './talkRuleMerge.js';
import type { MergedTalkStep, TalkMergeResult, TalkScreenshotInput } from './talkMergeTypes.js';

export type { MergedTalkStep, TalkMergeResult, TalkScreenshotInput } from './talkMergeTypes.js';

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

function ruleMergeHint(method: string, isMeetFormat: boolean): string {
  if (method === 'markers') {
    return '「次」「続いて」等の区切りで文字起こしとスクショを対応づけました。';
  }
  if (isMeetFormat) {
    return '文字起こしの操作の区切りでスクショと対応づけました。';
  }
  return '文字起こしを分割してスクショと対応づけました。';
}

export async function mergeTalkSteps(input: {
  transcript: string;
  screenshots: TalkScreenshotInput[];
  tone?: InstructionTone;
  audience?: TargetAudience;
  glossary?: string[];
  organizationId?: string;
  userEmail?: string | null;
}): Promise<TalkMergeResult> {
  const warnings: string[] = [];
  const tone = input.tone ?? 'simple';
  const audience = input.audience ?? 'new_staff';
  const glossary = normalizeGlossary(input.glossary);
  const rawTranscript = input.transcript.trim();
  const { body: cleanedBody, isMeetFormat } = cleanMeetTranscript(rawTranscript);
  const body = applyTermGlossary(cleanedBody, glossary);
  const transcript = applyTermGlossary(rawTranscript, glossary);

  if (!transcript) {
    throw Object.assign(new Error('文字起こしを入力してください'), { status: 400 });
  }
  if (!input.screenshots.length) {
    throw Object.assign(new Error('スクリーンショットを1枚以上追加してください'), { status: 400 });
  }

  if (isMeetFormat) {
    warnings.push(
      'Google Meet の文字起こしは、撮影順・区切り語（「次」等）・各画像の「画面メモ」で手順に対応づけしています。',
    );
  }

  if (/患者名|氏名|ID[:：]\s*\d|マイナンバー/.test(transcript)) {
    warnings.push('個人情報らしき記述があります。公開前にマスキングを確認してください。');
  }

  const ruleResult = ruleBasedTalkMerge({
    transcript,
    body,
    screenshots: input.screenshots,
    tone,
    audience,
  });

  warnings.push(ruleMergeHint(ruleResult.method, isMeetFormat));
  warnings.push('説明文は編集後、「AIで文案を整える」から整形できます。');

  const steps = ruleResult.steps.map((s, i) => ({
    ...s,
    screenshotIndex: Math.min(Math.max(0, s.screenshotIndex ?? i), input.screenshots.length - 1),
  }));

  return {
    steps,
    usedGemini: false,
    mergeMode: 'rules',
    ruleConfidence: ruleResult.confidence,
    warnings,
  };
}
