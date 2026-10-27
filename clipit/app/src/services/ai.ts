import { apiFetch } from '../lib/api';
import type { ManualStep } from '../types';
import type { TargetAudience } from '../types';

export type InstructionTone = 'simple' | 'formal' | 'manual' | 'short' | 'detailed';

export type PolishInstructionItem = {
  title?: string;
  instruction?: string;
  elementText?: string;
};

/** 説明文をまとめて整形（1クォータ・テキストのみ） */
export async function polishInstructionsWithApi(
  organizationId: string,
  items: PolishInstructionItem[],
  tone: InstructionTone = 'simple',
  audience: TargetAudience = 'new_staff',
): Promise<{ instructions: string[]; usedGemini: boolean }> {
  return apiFetch('/v1/ai/polish-instructions', {
    method: 'POST',
    body: JSON.stringify({ organizationId, items, tone, audience }),
  });
}

export async function generateStepWithApi(
  step: ManualStep,
  tone: InstructionTone,
  audience: TargetAudience = 'new_staff',
  organizationId: string,
): Promise<string> {
  const res = await apiFetch<{ instruction: string }>('/v1/ai/generate-step', {
    method: 'POST',
    body: JSON.stringify({
      organizationId,
      step: {
        title: step.title,
        elementText: step.elementText,
        pageTitle: step.pageTitle,
        pageUrl: step.pageUrl,
        note: step.note,
      },
      tone,
      audience,
      useAi: true,
    }),
  });
  return res.instruction;
}

export async function generateAllStepsWithApi(
  steps: ManualStep[],
  tone: InstructionTone,
  audience: TargetAudience = 'new_staff',
  organizationId: string,
): Promise<string[]> {
  const res = await apiFetch<{ instructions: string[] }>('/v1/ai/generate-steps', {
    method: 'POST',
    body: JSON.stringify({
      organizationId,
      steps: steps.map((s) => ({
        title: s.title,
        elementText: s.elementText,
        pageTitle: s.pageTitle,
        pageUrl: s.pageUrl,
        note: s.note,
      })),
      tone,
      audience,
      useAi: true,
    }),
  });
  return res.instructions;
}
