import type { StepImageAlign } from '../types';

export const IMAGE_WIDTH_MIN = 25;
export const IMAGE_WIDTH_MAX = 100;

export type StepLayoutFields = {
  imageWidthPct?: number;
  imageAlign?: StepImageAlign;
};

export function stepImageWidthPct(step: StepLayoutFields): number {
  const w = step.imageWidthPct ?? 100;
  return Math.max(IMAGE_WIDTH_MIN, Math.min(IMAGE_WIDTH_MAX, w));
}

export function stepImageAlign(step: StepLayoutFields): StepImageAlign {
  return step.imageAlign ?? 'center';
}

export function stepUsesFloatLayout(step: StepLayoutFields): boolean {
  const w = stepImageWidthPct(step);
  const align = stepImageAlign(step);
  return w < 100 && (align === 'left' || align === 'right');
}

export function imageAlignClass(align: StepImageAlign): string {
  if (align === 'left') return 'mr-4 mb-3 float-left';
  if (align === 'right') return 'ml-4 mb-3 float-right';
  return 'mx-auto mb-3 block';
}
