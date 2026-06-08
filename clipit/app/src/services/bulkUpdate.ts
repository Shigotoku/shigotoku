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

export async function scanBulkMatches(organizationId: string, keyword: string) {
  return apiFetch<{ matches: BulkMatch[]; count: number }>('/v1/bulk-update/scan', {
    method: 'POST',
    body: JSON.stringify({ organizationId, keyword }),
  });
}

export async function proposeBulkChanges(input: {
  organizationId: string;
  instruction: string;
  keyword?: string;
  replaceFrom?: string;
  replaceTo?: string;
  useAi?: boolean;
}) {
  return apiFetch<{ proposals: BulkChangeProposal[]; matchCount: number }>('/v1/bulk-update/propose', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function applyBulkChanges(input: {
  organizationId: string;
  instruction: string;
  changes: BulkChangeProposal[];
}) {
  return apiFetch<{ batchId: string; appliedCount: number; skippedCount: number }>('/v1/bulk-update/apply', {
    method: 'POST',
    body: JSON.stringify(input),
  });
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
