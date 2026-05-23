import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Building2, TrendingUp, Crown, Loader2, ShieldCheck } from "lucide-react";
import { fetchAdminStats, fetchAdminUsers, type AdminStats, type AdminUser } from "../../services/admin";
import { isSupabaseConfigured } from "../../lib/supabase";
import { PLAN_LABELS } from "../../store/subscription";

const PLAN_COLORS: Record<string, string> = {
  free: "bg-slate-100 text-slate-600",
  growth: "bg-primary-100 text-primary-700",
  pro: "bg-accent-100 text-accent-700",
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [s, u] = await Promise.all([fetchAdminStats(), fetchAdminUsers()]);
      setStats(s);
      setRecentUsers(u.slice(0, 5));
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
          <ShieldCheck className="h-5 w-5 text-rose-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">管理ダッシュボード</h1>
          <p className="text-sm text-slate-500">
            {isSupabaseConfigured ? "本番データ" : "デモデータ表示中"}
          </p>
        </div>
      </div>

      {/* 統計カード */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="総ユーザー数"
            value={stats.total_users}
            icon={<Users className="h-5 w-5 text-blue-600" />}
            bg="bg-blue-50"
          />
          <StatCard
            label="総会社数"
            value={stats.total_companies}
            icon={<Building2 className="h-5 w-5 text-emerald-600" />}
            bg="bg-emerald-50"
          />
          <StatCard
            label="今週の新規"
            value={stats.new_users_this_week}
            icon={<TrendingUp className="h-5 w-5 text-primary-600" />}
            bg="bg-primary-50"
          />
          <StatCard
            label="Proプラン"
            value={stats.plan_breakdown.pro}
            icon={<Crown className="h-5 w-5 text-accent-600" />}
            bg="bg-accent-50"
          />
        </div>
      )}

      {/* プラン内訳 */}
      {stats && (
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">プラン内訳</h2>
          <div className="flex items-end gap-6">
            {(["free", "growth", "pro"] as const).map((plan) => {
              const count = stats.plan_breakdown[plan];
              const total = stats.total_users || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={plan} className="flex-1 text-center">
                  <div className="mx-auto mb-2 flex h-24 w-full items-end justify-center rounded-lg bg-slate-50">
                    <div
                      className={`w-10 rounded-t-md ${
                        plan === "free"
                          ? "bg-slate-300"
                          : plan === "growth"
                          ? "bg-primary-400"
                          : "bg-accent-400"
                      }`}
                      style={{ height: `${Math.max(pct, 4)}%`, minHeight: "8px" }}
                    />
                  </div>
                  <p className="text-lg font-bold text-slate-900">{count}人</p>
                  <p className="text-xs text-slate-500">{PLAN_LABELS[plan]}（{pct}%）</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 最近のユーザー */}
      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">最近登録したユーザー</h2>
          <Link
            to="/admin/users"
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            すべて見る →
          </Link>
        </div>
        <div className="divide-y divide-slate-50">
          {recentUsers.map((u) => (
            <div key={u.id} className="flex items-center gap-4 px-6 py-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                {u.full_name?.[0] || u.email[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{u.full_name}</p>
                <p className="truncate text-xs text-slate-400">{u.email}</p>
              </div>
              <div className="hidden sm:block text-xs text-slate-400 shrink-0">
                {u.company_name}
              </div>
              <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${PLAN_COLORS[u.plan] ?? PLAN_COLORS.free}`}>
                {PLAN_LABELS[u.plan as keyof typeof PLAN_LABELS] ?? u.plan}
              </span>
              <span className="shrink-0 text-xs text-slate-400">
                {new Date(u.created_at).toLocaleDateString("ja-JP")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  bg,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  bg: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value.toLocaleString()}</p>
      <p className="mt-0.5 text-xs text-slate-500">{label}</p>
    </div>
  );
}
