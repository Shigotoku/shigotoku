import type { TargetAudience } from '../types';

export type TemplateCategory =
  | 'clinic'
  | 'education'
  | 'smb'
  | 'web'
  | 'hospitality'
  | 'general';

export interface TemplateStepDef {
  title: string;
  instruction: string;
  type: 'normal' | 'warning' | 'check';
  note?: string;
  clickX?: number;
  clickY?: number;
}

export interface TemplateStep extends TemplateStepDef {
  screenshotUrl: string;
}

export interface ManualTemplate {
  id: string;
  title: string;
  category: TemplateCategory;
  targetAudience: TargetAudience[];
  description: string;
  tags: string[];
  imageHint: string;
  steps: TemplateStep[];
}
