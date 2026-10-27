import type { PlanTier } from '../types';

export interface XSeriesCapabilities {
  plan: PlanTier;
  maxSeries: number;
  maxRulesTotal: number;
  aiBatchMax: number;
  pasteBatchMax: number;
  csvExport: boolean;
  urlEnrich: boolean;
  stockAlertWeeks: number;
  nextPostsPreview: number;
  dragReorder: boolean;
  moveBetweenSeries: boolean;
  voiceBatch: boolean;
  bulkReview: boolean;
  staffCannotApprove: boolean;
  magicCreatorBulkAdd: number;
  upgradeHint: string | null;
}

export const DEFAULT_X_CAPS: XSeriesCapabilities = {
  plan: 'free',
  maxSeries: 1,
  maxRulesTotal: 1,
  aiBatchMax: 0,
  pasteBatchMax: 5,
  csvExport: false,
  urlEnrich: false,
  stockAlertWeeks: 0,
  nextPostsPreview: 3,
  dragReorder: false,
  moveBetweenSeries: false,
  voiceBatch: false,
  bulkReview: false,
  staffCannotApprove: false,
  magicCreatorBulkAdd: 1,
  upgradeHint: 'StarterでAI一括生成が使えます',
};
