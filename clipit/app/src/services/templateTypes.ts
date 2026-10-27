import type { TargetAudience } from '../types';

export type TemplateCategory =
  | 'clinic'
  | 'education'
  | 'smb'
  | 'web'
  | 'hospitality'
  | 'general';

export type TemplateScope = 'company' | 'personal';

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
  scope: TemplateScope;
  targetAudience: TargetAudience[];
  description: string;
  tags: string[];
  imageHint: string;
  steps: TemplateStep[];
}
