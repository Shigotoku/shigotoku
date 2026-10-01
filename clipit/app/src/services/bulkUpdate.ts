import { apiFetch } from '../lib/api';

export interface BulkMatch {
  manualId: string;
  manualTitle: string;
  stepId?: string;
  stepOrder?: number;
  stepTitle?: string;
  field: string;
  before: string;
  linePreview: string;
}

export interface BulkChangeProposal {
  manualId: string;
  manualTitle: string;
  stepId?: string;
  stepOrder?: number;
  stepTitle?: string;
  field: string;
  before: string;
  after: string;
  risk: 'low' | 'medium' | 'high';
  requiresScreenshotUpdate: boolean;
  reason?: string;
  excluded?: boolean;
}

export interface BulkBatch {
  id: string;
  organizationId: string;
  instruction: string;
  createdBy: string;
  status: 'applied' | 'rolled_back';
  appliedCount: number;
  skippedCount: number;
  createdAt?: { seconds: number };
}

export type BulkUpdateScope = {
  mode?: 'all' | 'selected';
  folderIds?: string[];
  manualIds?: string[];
  includeUncategorized?: boolean;
};

export interface BulkSearchPlan {
  mode: 'keyword_replace' | 'contextual_rewrite' | 'manual_tone_unify';
  keywords: string[];
  regexPatterns: string[];
  replaceFrom?: string;
  replaceTo?: string;
  semanticQuery: string;
  summaryPreview: string;
}

export interface BulkProposeResult {
  proposals: BulkChangeProposal[];
  matchCount: number;
  summary: string;
  searchPlan?: BulkSearchPlan;
  inferredKeywords?: string[];
}

export interface AiUsageInfo {
  aiCalls: number;
  aiLimit: number;
  bulkAiOps: number;
  bulkAiLimit: number;
}

export async function scanBulkMatches(organizationId: string, keyword: string, scope?: BulkUpdateScope) {
  return apiFetch<{ matches: BulkMatch[]; count: number }>('/v1/bulk-update/scan', {
    method: 'POST',
    body: JSON.stringify({ organizationId, keyword, scope }),
  });
}

export async function analyzeBulkUpdate(input: {
  organizationId: string;
  instruction: string;
  scope?: BulkUpdateScope;
}) {
  return apiFetch<{
    searchPlan: BulkSearchPlan;
    matchCount: number;
    inferredKeywords: string[];
    summary: string;
  }>('/v1/bulk-update/analyze', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function proposeBulkChanges(input: {
  organizationId: string;
  instruction: string;
  keyword?: string;
  replaceFrom?: string;
  replaceTo?: string;
  useAi?: boolean;
  scope?: BulkUpdateScope;
  searchPlan?: BulkSearchPlan;
}) {
  return apiFetch<BulkProposeResult>('/v1/bulk-update/propose', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function applyBulkChanges(input: {
  organizationId: string;
  instruction: string;
  changes: BulkChangeProposal[];
}) {
  return apiFetch<{ batchId: string; appliedCount: number; skippedCount: number; summary?: string }>(
    '/v1/bulk-update/apply',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function listBulkBatches(organizationId: string) {
  return apiFetch<{ batches: BulkBatch[] }>(`/v1/bulk-update/batches?organizationId=${encodeURIComponent(organizationId)}`);
}

export async function rollbackBulkBatch(batchId: string, organizationId: string) {
  return apiFetch<{ restored: number }>(`/v1/bulk-update/batches/${batchId}/rollback`, {
    method: 'POST',
    body: JSON.stringify({ organizationId }),
  });
}

export async function fetchAiUsage(organizationId: string) {
  return apiFetch<AiUsageInfo>(`/v1/usage/ai?organizationId=${encodeURIComponent(organizationId)}`);
}

/** マニュアル単位に変更候補をグループ化 */
export function groupProposalsByManual(proposals: BulkChangeProposal[]) {
  const map = new Map<string, { manualTitle: string; items: BulkChangeProposal[] }>();
  for (const p of proposals) {
    const cur = map.get(p.manualId) ?? { manualTitle: p.manualTitle, items: [] };
    cur.items.push(p);
    map.set(p.manualId, cur);
  }
  return [...map.entries()].map(([manualId, { manualTitle, items }]) => ({ manualId, manualTitle, items }));
}
