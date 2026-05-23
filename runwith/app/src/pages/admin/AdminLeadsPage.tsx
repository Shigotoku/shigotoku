import { useEffect, useState, useMemo } from "react";
import {
  Mail, Users, TrendingUp, Crown, Loader2, Send,
  ChevronDown, Filter, Clock, CheckCircle, XCircle,
  AlertCircle, Search, MoreHorizontal, ArrowUpRight,
} from "lucide-react";
import { fetchAdminUsers, type AdminUser } from "../../services/admin";
import { isSupabaseConfigured } from "../../lib/supabase";
import { PLAN_LABELS } from "../../store/subscription";
import clsx from "clsx";

type LeadStatus = "new" | "engaged" | "trial" | "converted" | "churned";
type Tab = "overview" | "users" | "campaigns" | "templates";

const STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  new: { label: "新規", color: "bg-blue-100 text-blue-700", icon: <Users className="h-3.5 w-3.5" /> },
  engaged: { label: "アクティブ", color: "bg-amber-100 text-amber-700", icon: <TrendingUp className="h-3.5 w-3.5" /> },
  trial: { label: "検討中", color: "bg-violet-100 text-violet-700", icon: <Clock className="h-3.5 w-3.5" /> },
  converted: { label: "課金済み", color: "bg-emerald-100 text-emerald-700", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  churned: { label: "離脱", color: "bg-red-100 text-red-700", icon: <XCircle className="h-3.5 w-3.5" /> },
};

interface Lead extends AdminUser {
  status: LeadStatus;
  last_active: string;
  login_count: number;
  notes: string;
}

interface Campaign {
  id: string;
  name: string;
  subject: string;
  target: string;
  status: "draft" | "scheduled" | "sent";
  sent_count: number;
  open_rate: number;
  scheduled_at: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  trigger: string;
  enabled: boolean;
}

const DEMO_CAMPAIGNS: Campaign[] = [
  {
    id: "c1",
    name: "ウェルカムシリーズ #1",
    subject: "ランウィズへようこそ！最初の3ステップ",
    target: "新規登録ユーザー",
    status: "sent",
    sent_count: 12,
    open_rate: 78,
    scheduled_at: "2026-03-25T09:00:00Z",
  },
  {
    id: "c2",
    name: "Growthプラン訴求",
    subject: "創業の時間を50%短縮。Growthプランのご案内",
    target: "Free × 7日以上利用",
    status: "scheduled",
    sent_count: 0,
    open_rate: 0,
    scheduled_at: "2026-04-05T09:00:00Z",
  },
  {
    id: "c3",
    name: "非アクティブ復帰",
    subject: "お久しぶりです。新機能をご紹介します",
    target: "7日以上ログインなし",
    status: "draft",
    sent_count: 0,
    open_rate: 0,
    scheduled_at: "",
  },
];

const DEMO_TEMPLATES: EmailTemplate[] = [
  {
    id: "t1",
    name: "ウェルカムメール",
    subject: "ランウィズへようこそ！",
    trigger: "ユーザー登録直後",
    enabled: true,
  },
  {
    id: "t2",
    name: "会社設定リマインド",
    subject: "会社情報の設定がまだ完了していません",
    trigger: "登録後24時間＋会社未設定",
    enabled: true,
  },
  {
    id: "t3",
    name: "3日目チェックイン",
    subject: "ランウィズの活用は進んでいますか？",
    trigger: "登録後3日",
    enabled: true,
  },
  {
    id: "t4",
    name: "Growthアップセル",
    subject: "より高度な機能をお試しください",
    trigger: "登録後7日 ＋ Freeプラン",
    enabled: false,
  },
  {
    id: "t5",
    name: "離脱防止メール",
    subject: "最近ログインがありません。お困りのことはありませんか？",
    trigger: "7日間ログインなし",
    enabled: true,
  },
  {
    id: "t6",
    name: "解約フォロー",
    subject: "貴重なご意見をお聞かせください",
    trigger: "プラン解約時",
    enabled: false,
  },
];

function assignLeadStatus(u: AdminUser): Lead {
  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(u.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  let status: LeadStatus = "new";
  if (u.plan === "growth" || u.plan === "pro") status = "converted";
  else if (daysSinceCreation > 7) status = "engaged";
  else if (daysSinceCreation > 3) status = "trial";

  return {
    ...u,
    status,
    last_active: new Date(Date.now() - Math.random() * 5 * 86400000).toISOString(),
    login_count: Math.floor(Math.random() * 20) + 1,
    notes: "",
  };
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [campaigns] = useState<Campaign[]>(DEMO_CAMPAIGNS);
  const [templates, setTemplates] = useState<EmailTemplate[]>(DEMO_TEMPLATES);

  useEffect(() => {
    fetchAdminUsers().then((users) => {
      setLeads(users.map(assignLeadStatus));
      setLoading(false);
    });
  }, []);

  const stats = useMemo(() => {
    const s = { new: 0, engaged: 0, trial: 0, converted: 0, churned: 0 };
    leads.forEach((l) => s[l.status]++);
    return s;
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q || l.full_name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || l.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [leads, search, statusFilter]);

  const toggleTemplate = (id: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t))
    );
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
            <Mail className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">リード管理</h1>
            <p className="text-sm text-slate-500">
              {isSupabaseConfigured ? "本番データ" : "デモデータ表示中"}
            </p>
          </div>
        </div>
      </div>

      {/* タブ */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
        {(
          [
            { id: "overview", label: "概要" },
            { id: "users", label: "ユーザー状況" },
            { id: "campaigns", label: "キャンペーン" },
            { id: "templates", label: "自動メール" },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              "flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
              tab === t.id
                ? "bg-primary-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 概要タブ */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* ファネル */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map((key) => {
              const cfg = STATUS_CONFIG[key];
              return (
                <button
                  key={key}
                  onClick={() => { setStatusFilter(key); setTab("users"); }}
                  className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm text-left hover:shadow-md transition-shadow"
                >
                  <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.color}`}>
                    {cfg.icon}
                    {cfg.label}
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{stats[key]}</p>
                  <p className="text-xs text-slate-400">
                    {leads.length > 0
                      ? `${Math.round((stats[key] / leads.length) * 100)}%`
                      : "0%"}
                  </p>
                </button>
              );
            })}
          </div>

          {/* コンバージョンファネルビジュアル */}
          <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-900">コンバージョンファネル</h2>
            <div className="space-y-2">
              {(["new", "engaged", "trial", "converted"] as LeadStatus[]).map((key, i) => {
                const cfg = STATUS_CONFIG[key];
                const total = leads.length || 1;
                const cumulative = (["new", "engaged", "trial", "converted"] as LeadStatus[])
                  .slice(i)
                  .reduce((sum, k) => sum + stats[k], 0);
                const pct = Math.round((cumulative / total) * 100);
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-20 text-xs font-medium text-slate-500">{cfg.label}</span>
                    <div className="flex-1 h-8 rounded-lg bg-slate-100 overflow-hidden">
                      <div
                        className={clsx(
                          "h-full rounded-lg transition-all duration-500",
                          key === "new" ? "bg-blue-400" :
                          key === "engaged" ? "bg-amber-400" :
                          key === "trial" ? "bg-violet-400" :
                          "bg-emerald-400"
                        )}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-sm font-bold text-slate-700">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* クイックアクション */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ActionCard
              icon={<Send className="h-5 w-5 text-blue-600" />}
              bg="bg-blue-50"
              title="ウェルカムメール確認"
              desc="新規ユーザーへの自動送信を確認"
              onClick={() => setTab("templates")}
            />
            <ActionCard
              icon={<ArrowUpRight className="h-5 w-5 text-emerald-600" />}
              bg="bg-emerald-50"
              title="アップセルキャンペーン"
              desc="Freeユーザーへ Growth を訴求"
              onClick={() => setTab("campaigns")}
            />
            <ActionCard
              icon={<AlertCircle className="h-5 w-5 text-amber-600" />}
              bg="bg-amber-50"
              title="離脱予防"
              desc="非アクティブユーザーへのフォロー"
              onClick={() => { setStatusFilter("churned"); setTab("users"); }}
            />
          </div>
        </div>
      )}

      {/* ユーザー状況タブ */}
      {tab === "users" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="名前・メールで検索"
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <FilterBtn active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>すべて</FilterBtn>
              {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map((key) => (
                <FilterBtn key={key} active={statusFilter === key} onClick={() => setStatusFilter(key)}>
                  {STATUS_CONFIG[key].label}
                </FilterBtn>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1fr_2fr_2fr_1fr_1fr_1fr_auto] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>ステータス</span>
              <span>名前</span>
              <span>メール</span>
              <span>プラン</span>
              <span>ログイン</span>
              <span>最終活動</span>
              <span />
            </div>
            <div className="divide-y divide-slate-50">
              {filteredLeads.map((l) => {
                const cfg = STATUS_CONFIG[l.status];
                return (
                  <div
                    key={l.id}
                    className="flex flex-col gap-1 px-6 py-3.5 sm:grid sm:grid-cols-[1fr_2fr_2fr_1fr_1fr_1fr_auto] sm:items-center sm:gap-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <span className={`inline-flex self-start items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.color}`}>
                      {cfg.icon}
                      {cfg.label}
                    </span>
                    <p className="font-medium text-slate-900 truncate">{l.full_name || "（未設定）"}</p>
                    <p className="text-sm text-slate-500 truncate">{l.email}</p>
                    <span className={`self-start rounded px-2 py-0.5 text-xs font-semibold ${
                      l.plan === "pro" ? "bg-accent-100 text-accent-700" :
                      l.plan === "growth" ? "bg-primary-100 text-primary-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {PLAN_LABELS[l.plan as keyof typeof PLAN_LABELS] ?? l.plan}
                    </span>
                    <p className="text-sm text-slate-500 text-center">{l.login_count}回</p>
                    <p className="text-xs text-slate-400">
                      {new Date(l.last_active).toLocaleDateString("ja-JP")}
                    </p>
                    <button className="self-start rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-slate-100 px-6 py-3 text-xs text-slate-400">
              {filteredLeads.length} 件 / 全 {leads.length} 件
            </div>
          </div>
        </div>
      )}

      {/* キャンペーンタブ */}
      {tab === "campaigns" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">メールキャンペーンの管理・送信</p>
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors">
              <Send className="h-4 w-4" />
              新規キャンペーン
            </button>
          </div>

          <div className="space-y-3">
            {campaigns.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-slate-900">{c.name}</h3>
                      <span className={clsx(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        c.status === "sent" ? "bg-emerald-100 text-emerald-700" :
                        c.status === "scheduled" ? "bg-blue-100 text-blue-700" :
                        "bg-slate-100 text-slate-600"
                      )}>
                        {c.status === "sent" ? "送信済み" : c.status === "scheduled" ? "予約済み" : "下書き"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">件名：{c.subject}</p>
                    <p className="mt-1 text-xs text-slate-400">対象：{c.target}</p>
                  </div>
                  {c.status === "sent" && (
                    <div className="flex gap-4 text-center">
                      <div>
                        <p className="text-lg font-bold text-slate-900">{c.sent_count}</p>
                        <p className="text-xs text-slate-400">送信数</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-emerald-600">{c.open_rate}%</p>
                        <p className="text-xs text-slate-400">開封率</p>
                      </div>
                    </div>
                  )}
                  {c.status === "scheduled" && c.scheduled_at && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-blue-600">
                        {new Date(c.scheduled_at).toLocaleDateString("ja-JP")}
                      </p>
                      <p className="text-xs text-slate-400">送信予定</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 自動メールタブ */}
      {tab === "templates" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            トリガーに基づいて自動送信されるメール設定。ONにすると該当条件のユーザーに自動送信されます。
          </p>

          <div className="space-y-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-4 rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm"
              >
                <div className={clsx(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  t.enabled ? "bg-emerald-100" : "bg-slate-100"
                )}>
                  <Mail className={clsx(
                    "h-5 w-5",
                    t.enabled ? "text-emerald-600" : "text-slate-400"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900">{t.name}</h3>
                  <p className="text-xs text-slate-500 truncate">件名：{t.subject}</p>
                  <p className="mt-0.5 text-xs text-slate-400">トリガー：{t.trigger}</p>
                </div>
                <button
                  onClick={() => toggleTemplate(t.id)}
                  className={clsx(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200",
                    t.enabled ? "bg-emerald-500" : "bg-slate-300"
                  )}
                >
                  <span
                    className={clsx(
                      "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5",
                      t.enabled ? "translate-x-5 ml-0.5" : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">メール送信について</p>
                <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                  現在はメールテンプレートの設定のみです。実際のメール自動送信には Supabase Edge Functions + Resend（メール配信サービス）の連携が必要です。
                  Stripe 連携後に実装を進めることを推奨します。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionCard({
  icon,
  bg,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  bg: string;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm text-left hover:shadow-md transition-shadow"
    >
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${bg} mb-3`}>
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-xs text-slate-500">{desc}</p>
    </button>
  );
}

function FilterBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "rounded-lg px-3 py-2 text-xs font-semibold transition-all",
        active
          ? "bg-primary-600 text-white"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      )}
    >
      {children}
    </button>
  );
}
