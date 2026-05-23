import { useEffect, useState } from "react";
import { Search, Loader2, Users } from "lucide-react";
import { fetchAdminUsers, type AdminUser } from "../../services/admin";
import { PLAN_LABELS } from "../../store/subscription";

const PLAN_COLORS: Record<string, string> = {
  free: "bg-slate-100 text-slate-600",
  growth: "bg-primary-100 text-primary-700",
  pro: "bg-accent-100 text-accent-700",
};

type PlanFilter = "all" | "free" | "growth" | "pro";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all");

  useEffect(() => {
    fetchAdminUsers().then((u) => {
      setUsers(u);
      setLoading(false);
    });
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.company_name.toLowerCase().includes(q);
    const matchPlan = planFilter === "all" || u.plan === planFilter;
    return matchSearch && matchPlan;
  });

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
          <Users className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ユーザー管理</h1>
          <p className="text-sm text-slate-500">登録ユーザー一覧</p>
        </div>
      </div>

      {/* フィルター */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="名前・メール・会社名で検索"
            className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "free", "growth", "pro"] as PlanFilter[]).map((p) => (
            <button
              key={p}
              onClick={() => setPlanFilter(p)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                planFilter === p
                  ? "bg-primary-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p === "all" ? "すべて" : PLAN_LABELS[p as keyof typeof PLAN_LABELS]}
            </button>
          ))}
        </div>
      </div>

      {/* ユーザーテーブル */}
      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-400">
            <Users className="h-8 w-8" />
            <p className="text-sm">該当するユーザーがいません</p>
          </div>
        ) : (
          <>
            {/* テーブルヘッダー（デスクトップのみ） */}
            <div className="hidden grid-cols-[1fr_2fr_2fr_1fr_1fr_auto] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 sm:grid">
              <span>プラン</span>
              <span>名前</span>
              <span>メール</span>
              <span>会社</span>
              <span>会社数</span>
              <span>登録日</span>
            </div>

            <div className="divide-y divide-slate-50">
              {filtered.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-col gap-1 px-6 py-4 sm:grid sm:grid-cols-[1fr_2fr_2fr_1fr_1fr_auto] sm:items-center sm:gap-4"
                >
                  <span
                    className={`self-start rounded px-2 py-0.5 text-xs font-semibold ${
                      PLAN_COLORS[u.plan] ?? PLAN_COLORS.free
                    }`}
                  >
                    {PLAN_LABELS[u.plan as keyof typeof PLAN_LABELS] ?? u.plan}
                  </span>
                  <p className="font-medium text-slate-900">{u.full_name || "（未設定）"}</p>
                  <p className="truncate text-sm text-slate-500">{u.email}</p>
                  <p className="truncate text-sm text-slate-500">{u.company_name}</p>
                  <p className="text-center text-sm text-slate-500">{u.companies_count}</p>
                  <p className="text-xs text-slate-400 sm:text-right">
                    {new Date(u.created_at).toLocaleDateString("ja-JP")}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 px-6 py-3 text-xs text-slate-400">
              {filtered.length} 件 / 全 {users.length} 件
            </div>
          </>
        )}
      </div>
    </div>
  );
}
