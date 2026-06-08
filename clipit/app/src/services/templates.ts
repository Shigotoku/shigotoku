import { templatePlaceholderUrl } from '../lib/templatePlaceholders';
import { TEMPLATE_CATALOG } from './templateCatalog';
import type { ManualTemplate, TemplateCategory, TemplateStepDef } from './templateTypes';

export type { TemplateCategory, ManualTemplate, TemplateStepDef } from './templateTypes';

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  clinic: 'クリニック・医療',
  education: '教育・授業プリント',
  smb: '中小企業・社内',
  web: 'Web・サービス案内',
  hospitality: '接客・店舗',
  general: '汎用',
};

function finalizeTemplate(entry: (typeof TEMPLATE_CATALOG)[number]): ManualTemplate {
  return {
    ...entry,
    steps: entry.steps.map((s, i) => ({
      ...s,
      screenshotUrl: templatePlaceholderUrl(entry.category, i + 1, s.title, entry.title),
      clickX: s.clickX ?? 45,
      clickY: s.clickY ?? 48,
    })),
  };
}

export const MANUAL_TEMPLATES: ManualTemplate[] = TEMPLATE_CATALOG.map(finalizeTemplate);
