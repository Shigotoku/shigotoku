export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  entity: string;
  entityId?: string;
  before?: string;
  after?: string;
}

const KEY = "shapeit:audit:v1";

export function listAudit(): AuditEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as AuditEntry[];
  } catch {
    return [];
  }
}

export function pushAudit(input: Omit<AuditEntry, "id" | "at" | "actor"> & { actor?: string }) {
  const items = listAudit();
  items.unshift({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    actor: input.actor || "self",
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    before: input.before,
    after: input.after,
  });
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, 200)));
}

export function clearAudit() {
  localStorage.removeItem(KEY);
}
