import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { Database } from "../lib/database.types";

type AuditRow = Database["public"]["Tables"]["audit_logs"]["Row"];

interface AuditEntry {
  companyId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export const auditService = {
  async log(entry: AuditEntry) {
    if (!isSupabaseConfigured) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      await supabase.from("audit_logs").insert({
        company_id: entry.companyId ?? null,
        user_id: session?.user?.id ?? null,
        action: entry.action,
        resource_type: entry.resourceType ?? null,
        resource_id: entry.resourceId ?? null,
        metadata: (entry.metadata ?? {}) as any,
        user_agent: navigator.userAgent,
      } as any);
    } catch {
      // 監査ログの書き込み失敗でアプリを止めない
    }
  },

  async fetchLogs(companyId: string, limit = 50): Promise<AuditRow[]> {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as AuditRow[];
  },
};
