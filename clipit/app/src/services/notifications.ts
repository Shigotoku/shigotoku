import { apiFetch } from '../lib/api';

export interface OrgNotification {
  id: string;
  organizationId: string;
  type: string;
  message: string;
  manualId?: string;
  manualIds?: string[];
  appliedCount?: number;
  batchId?: string;
  createdAt?: { seconds: number };
}

export async function listOrgNotifications(organizationId: string) {
  return apiFetch<{ notifications: OrgNotification[] }>(
    `/v1/notifications?organizationId=${encodeURIComponent(organizationId)}`,
  );
}
