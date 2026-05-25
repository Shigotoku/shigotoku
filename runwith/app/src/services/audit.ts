import { auth, isFirebaseConfigured } from '../lib/firebase';
import { writeAuditLog, fetchAuditLogs } from '../lib/firestore';
import type { Database } from '../lib/database.types';

type AuditRow = Database['public']['Tables']['audit_logs']['Row'];

interface AuditEntry {
  companyId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export const auditService = {
  async log(entry: AuditEntry) {
    if (!isFirebaseConfigured) return;

    try {
      await writeAuditLog({
        companyId: entry.companyId,
        userId: auth.currentUser?.uid,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        metadata: entry.metadata,
      });
    } catch {
      // 監査ログの書き込み失敗でアプリを止めない
    }
  },

  async fetchLogs(companyId: string, max = 50): Promise<AuditRow[]> {
    if (!isFirebaseConfigured) return [];
    return fetchAuditLogs(companyId, max);
  },
};
