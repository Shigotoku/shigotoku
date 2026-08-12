import { apiFetch } from '../lib/api';
import type { InstructionTone } from './ai';
import type { TargetAudience } from '../types';

export interface TalkScreenshotPayload {
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

export async function mergeTalkStepsWithApi(input: {
  organizationId: string;
  transcript: string;
  screenshots: TalkScreenshotPayload[];
  tone?: InstructionTone;
  audience?: TargetAudience;
}): Promise<{
  steps: MergedTalkStep[];
  usedGemini: boolean;
  mergeMode: 'rules' | 'text_ai';
  ruleConfidence: number;
  warnings: string[];
}> {
  return apiFetch('/v1/ai/merge-talk-steps', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function ingestTalkSteps(
  manualId: string,
  steps: Array<{
    title: string;
    instruction: string;
    note?: string;
    type?: string;
    elementText?: string;
    screenshotBase64?: string;
  }>,
): Promise<{ stepCount: number }> {
  return apiFetch(`/v1/manuals/${manualId}/ingest`, {
    method: 'POST',
    body: JSON.stringify({ steps }),
  });
}
