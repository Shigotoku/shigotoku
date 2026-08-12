import { listAudit, clearAudit } from "../lib/audit";
import { formatInTz } from "../lib/demoStore";
import { canManageSettings } from "../lib/roles";

/** SEC-005: Audit Trail */
export default function AuditPage() {
  const items = listAudit();
  const canClear = canManageSettings();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">Security</p>
          <h1 className="font-display mt-1 text-3xl font-bold">Audit Log</h1>
          <p className="mt-2 text-sm text-ink/60">重要操作の actor / action / entity 履歴</p>
        </div>
        {canClear && (
          <button
            type="button"
            className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold"
            onClick={() => {
              if (!window.confirm("Audit をクリアしますか？")) return;
              clearAudit();
              window.location.reload();
            }}
          >
            クリア
          </button>
        )}
      </div>
      <ul className="space-y-2">
        {items.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-ink/20 bg-white p-8 text-sm text-ink/50">
            まだ監査ログがありません。投稿や Status 変更で記録されます。
          </li>
        ) : (
          items.map((a) => (
            <li key={a.id} className="rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2 text-xs text-ink/45">
                <span>{formatInTz(a.at)}</span>
                <span>{a.actor}</span>
              </div>
              <p className="mt-1 font-medium">
                {a.action} · {a.entity}
                {a.entityId ? ` · ${a.entityId.slice(0, 8)}` : ""}
              </p>
              {(a.before || a.after) && (
                <p className="mt-1 text-xs text-ink/55">
                  {a.before ? `${a.before} → ` : ""}
                  {a.after}
                </p>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
