import type { OrgType } from '../types';
import { templatePlaceholderUrl } from '../lib/templatePlaceholders';
import { TEMPLATE_CATALOG, type TemplateCatalogEntry } from './templateCatalog';
import { TEMPLATE_CATALOG_EXTRA } from './templateCatalogExtra';
import type { ManualTemplate, TemplateCategory, TemplateScope, TemplateStepDef } from './templateTypes';

export type { TemplateCategory, TemplateScope, ManualTemplate, TemplateStepDef } from './templateTypes';

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  clinic: 'クリニック・医療',
  education: '教育・授業プリント',
  smb: '中小企業・社内',
  web: 'Web・サービス案内',
  hospitality: '接客・店舗',
  general: '汎用',
};

export const TEMPLATE_SCOPE_LABELS: Record<TemplateScope, string> = {
  company: '会社向け',
  personal: '個人向け',
};

const PERSONAL_IDS = new Set(['edu-parent', 'edu-experiment']);
const SCHOOL_EDU_IDS = new Set(['edu-print', 'edu-test', 'edu-lesson-plan']);

function resolveScope(entry: TemplateCatalogEntry): TemplateScope {
  if (entry.scope) return entry.scope;
  if (PERSONAL_IDS.has(entry.id)) return 'personal';
  if (entry.category === 'education' && !SCHOOL_EDU_IDS.has(entry.id)) return 'personal';
  return 'company';
}

function finalizeTemplate(entry: TemplateCatalogEntry): ManualTemplate {
  const { scope: _omit, ...rest } = entry;
  return {
    ...rest,
    scope: resolveScope(entry),
    steps: entry.steps.map((s, i) => ({
      ...s,
      screenshotUrl: templatePlaceholderUrl(entry.category, i + 1, s.title, entry.title),
      clickX: s.clickX ?? 45,
      clickY: s.clickY ?? 48,
    })),
  };
}

export const MANUAL_TEMPLATES: ManualTemplate[] = [...TEMPLATE_CATALOG, ...TEMPLATE_CATALOG_EXTRA].map(finalizeTemplate);

/** 組織タイプに合うテンプレートカテゴリ（優先順） */
export function recommendedCategoriesForOrg(orgType?: OrgType): TemplateCategory[] {
  switch (orgType) {
    case 'clinic':
      return ['clinic', 'general', 'smb'];
    case 'developer':
      return ['web', 'general', 'smb'];
    case 'agency':
      return ['smb', 'web', 'general'];
    case 'startup':
      return ['web', 'smb', 'general'];
    case 'smb':
    default:
      return ['smb', 'general', 'hospitality'];
  }
}
