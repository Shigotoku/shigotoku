import type { PlanTier } from './firestore';

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

const PRO_PLUS = new Set<PlanTier>(['pro', 'team', 'growth', 'enterprise']);
const GROWTH_PLUS = new Set<PlanTier>(['growth', 'enterprise']);

export function xSeriesCapabilities(plan: PlanTier): XSeriesCapabilities {
  if (plan === 'free' || plan === 'line_lite' || plan === 'line_pro') {
    return {
      plan,
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
      upgradeHint: 'Starter（¥4,980）で AI一括生成・CSVエクスポートが使えます',
    };
  }
  if (plan === 'starter') {
    return {
      plan,
      maxSeries: 3,
      maxRulesTotal: 5,
      aiBatchMax: 10,
      pasteBatchMax: 20,
      csvExport: true,
      urlEnrich: true,
      stockAlertWeeks: 0,
      nextPostsPreview: 7,
      dragReorder: true,
      moveBetweenSeries: false,
      voiceBatch: false,
      bulkReview: true,
      staffCannotApprove: false,
      magicCreatorBulkAdd: 5,
      upgradeHint: 'Pro（¥9,800）で在庫アラート・30件AI生成・シリーズ間移動',
    };
  }
  if (PRO_PLUS.has(plan) && !GROWTH_PLUS.has(plan)) {
    return {
      plan,
      maxSeries: 10,
      maxRulesTotal: 20,
      aiBatchMax: 30,
      pasteBatchMax: 100,
      csvExport: true,
      urlEnrich: true,
      stockAlertWeeks: 2,
      nextPostsPreview: 14,
      dragReorder: true,
      moveBetweenSeries: true,
      voiceBatch: false,
      bulkReview: true,
      staffCannotApprove: true,
      magicCreatorBulkAdd: 10,
      upgradeHint: 'Growth OS（¥24,800）で音声→Xリスト一括・50件AI生成',
    };
  }
  return {
    plan,
    maxSeries: 99,
    maxRulesTotal: 99,
    aiBatchMax: 50,
    pasteBatchMax: 200,
    csvExport: true,
    urlEnrich: true,
    stockAlertWeeks: 2,
    nextPostsPreview: 30,
    dragReorder: true,
    moveBetweenSeries: true,
    voiceBatch: true,
    bulkReview: true,
    staffCannotApprove: true,
    magicCreatorBulkAdd: 20,
    upgradeHint: null,
  };
}

export function assertXSeriesFeature(
  plan: PlanTier,
  feature: keyof Omit<XSeriesCapabilities, 'plan' | 'upgradeHint'>,
  value?: number,
): void {
  const caps = xSeriesCapabilities(plan);
  if (feature === 'aiBatchMax' && (caps.aiBatchMax === 0 || (value ?? 0) > caps.aiBatchMax)) {
    throw new Error(
      caps.aiBatchMax === 0
        ? `AI一括生成は Starter 以上の機能です。${caps.upgradeHint ?? ''}`
        : `AI一括生成は最大 ${caps.aiBatchMax} 件まで（${plan}）。アップグレードで上限が上がります`,
    );
  }
  if (feature === 'pasteBatchMax' && (value ?? 0) > caps.pasteBatchMax) {
    throw new Error(`貼り付けは最大 ${caps.pasteBatchMax} 件まで（${plan}）`);
  }
  if (feature === 'csvExport' && !caps.csvExport) {
    throw new Error(`CSVエクスポートは Starter 以上の機能です`);
  }
  if (feature === 'urlEnrich' && !caps.urlEnrich) {
    throw new Error(`URL自動取得は Starter 以上の機能です`);
  }
  if (feature === 'moveBetweenSeries' && !caps.moveBetweenSeries) {
    throw new Error(`シリーズ間移動は Pro 以上の機能です`);
  }
  if (feature === 'voiceBatch' && !caps.voiceBatch) {
    throw new Error(`音声→Xリスト一括は Growth OS の機能です`);
  }
  if (feature === 'stockAlertWeeks' && !caps.stockAlertWeeks) {
    throw new Error(`在庫アラートは Pro 以上の機能です`);
  }
}
