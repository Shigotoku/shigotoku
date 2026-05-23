import { Link } from "react-router-dom";
import {
  Building2, Banknote, LineChart, CreditCard, Landmark,
  Presentation, Users, ArrowRight, CheckCircle2,
  Circle, TrendingUp, FileText, BarChart3,
  CalendarClock, Scale, Target, Crown, ScrollText, Shield,
  Handshake, Lightbulb, Map, Rocket, Settings,
  ChevronRight, PlusCircle, AlertCircle,
} from "lucide-react";
import { useCompanyStore, PHASE_LABELS } from "../../store/company";
import { useAuthStore } from "../../store/auth";
import { useProgressStore, TASK_GROUPS, TASK_IDS } from "../../store/progress";
import { useState, useEffect } from "react";

const quickActions = [
  { icon: Building2, label: "会社設立ナビ", path: "/incorporation", color: "bg-blue-50 text-blue-600 hover:bg-blue-100" },
  { icon: FileText, label: "届出・手続き", path: "/notifications", color: "bg-teal-50 text-teal-600 hover:bg-teal-100" },
  { icon: Banknote, label: "補助金検索", path: "/funding", color: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" },
  { icon: LineChart, label: "事業シミュレーション", path: "/simulator", color: "bg-violet-50 text-violet-600 hover:bg-violet-100" },
  { icon: Presentation, label: "ピッチ資料", path: "/pitch", color: "bg-pink-50 text-pink-600 hover:bg-pink-100" },
  { icon: BarChart3, label: "KPIトラッカー", path: "/kpi-tracker", color: "bg-amber-50 text-amber-600 hover:bg-amber-100" },
  { icon: Map, label: "ジャーニーマップ", path: "/journey", color: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100" },
  { icon: Handshake, label: "投資家マッチング", path: "/investor", color: "bg-rose-50 text-rose-600 hover:bg-rose-100" },
];

const nextActions = [
  { id: TASK_IDS.INC_ARTICLES, label: "定款を作成する", link: "/incorporation", category: "設立" },
  { id: TASK_IDS.INC_REGISTRATION, label: "法人登記を申請する", link: "/incorporation", category: "設立" },
  { id: TASK_IDS.NOTIF_BLUE_RETURN, label: "青色申告承認申請書を提出", link: "/notifications", category: "届出" },
  { id: TASK_IDS.NOTIF_TAX_ESTABLISHMENT, label: "法人設立届出書を提出", link: "/notifications", category: "届出" },
  { id: TASK_IDS.BANK_OPENED, label: "法人口座を開設する", link: "/bank", category: "基盤" },
  { id: TASK_IDS.CREDIT_APPLIED, label: "法人カードを申し込む", link: "/credit", category: "基盤" },
  { id: TASK_IDS.NOTIF_HEALTH_PENSION, label: "社会保険の加入手続き", link: "/notifications", category: "労務" },
  { id: TASK_IDS.ACC_SOFTWARE, label: "会計ソフトを導入する", link: "/settings", category: "基盤" },
];

interface KpiSnapshot {
  mrr: number;
  customers: number;
  churn: number;
}

const allTools = [
  { icon: Building2, label: "会社設立ナビ", path: "/incorporation" },
  { icon: FileText, label: "届出・手続きナビ", path: "/notifications" },
  { icon: Landmark, label: "銀行口座開設", path: "/bank" },
  { icon: CreditCard, label: "法人カード", path: "/credit" },
  { icon: ScrollText, label: "契約書テンプレート", path: "/contracts" },
  { icon: CalendarClock, label: "税務カレンダー", path: "/tax-calendar" },
  { icon: Shield, label: "労務管理ガイド", path: "/labor" },
  { icon: Banknote, label: "補助金・助成金", path: "/funding" },
  { icon: LineChart, label: "事業シミュレーション", path: "/simulator" },
  { icon: BarChart3, label: "KPIトラッカー", path: "/kpi-tracker" },
  { icon: Scale, label: "知財管理", path: "/ip-management" },
  { icon: Presentation, label: "ピッチ資料作成", path: "/pitch" },
  { icon: Handshake, label: "投資家マッチング", path: "/investor" },
  { icon: Target, label: "DD対策", path: "/dd-preparation" },
  { icon: Crown, label: "IPOロードマップ", path: "/ipo-roadmap" },
  { icon: Users, label: "チーム管理", path: "/team" },
  { icon: Scale, label: "知財ポートフォリオ", path: "/ip-management" },
];

export default function DashboardPage() {
  const { company } = useCompanyStore();
  const { user } = useAuthStore();
  const { isDone, getCompletedCount } = useProgressStore();
  const [kpiSnapshot, setKpiSnapshot] = useState<KpiSnapshot | null>(null);

  const incDone = getCompletedCount(TASK_GROUPS.incorporation);
  const notifDone = getCompletedCount(TASK_GROUPS.notifications);
  const bankDone = getCompletedCount(TASK_GROUPS.bankAndCard);
  const accDone = getCompletedCount(TASK_GROUPS.accounting);

  const totalDone = incDone + notifDone + bankDone + accDone;
  const totalTasks = TASK_GROUPS.incorporation.length + TASK_GROUPS.notifications.length + TASK_GROUPS.bankAndCard.length + TASK_GROUPS.accounting.length;

  const pendingActions = nextActions.filter((t) => !isDone(t.id));
  const doneActions = nextActions.filter((t) => isDone(t.id));
  const nextMilestone = pendingActions[0];

  // KPIデータをlocalStorageから取得
  useEffect(() => {
    try {
      const saved = localStorage.getItem("runwith-kpi-data");
      if (saved) {
        const entries = JSON.parse(saved);
        if (entries.length > 0) {
          const latest = entries[entries.length - 1];
          setKpiSnapshot({
            mrr: latest.mrr || 0,
            customers: latest.customers || 0,
            churn: latest.churnRate || 0,
          });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const setupPercent = Math.round((totalDone / totalTasks) * 100);

  const categoryColors: Record<string, string> = {
    設立: "bg-blue-100 text-blue-700",
    届出: "bg-teal-100 text-teal-700",
    基盤: "bg-emerald-100 text-emerald-700",
    労務: "bg-violet-100 text-violet-700",
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            おかえりなさい、{user?.name?.split(" ")[0] || "ユーザー"}さん
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {company?.name ? `${company.name} のダッシュボード` : "会社情報を設定してスタートしましょう"}
          </p>
        </div>
        {company && (
          <div className="hidden items-center gap-2 sm:flex">
            <span className="rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700">
              {PHASE_LABELS[company.phase]}
            </span>
            {company.isMedicalMode && (
              <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                医療モード
              </span>
            )}
          </div>
        )}
      </div>

      {/* 会社未設定の場合のオンボーディング */}
      {!company && (
        <div className="rounded-2xl border-2 border-dashed border-primary-200 bg-primary-50/50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100">
              <PlusCircle className="h-5 w-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">まず会社情報を設定しましょう</h3>
              <p className="mt-1 text-sm text-slate-500">
                会社名、業種、フェーズを入力することで、補助金マッチングや投資家検索が最適化されます。
              </p>
              <Link
                to="/settings"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                会社情報を設定する <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* クイックアクション */}
      <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-8">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.path}
              to={action.path}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200/60 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${action.color}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <span className="text-center text-[10px] font-medium leading-tight text-slate-600">{action.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          {/* KPIスナップショット（データがある場合） */}
          {kpiSnapshot && (
            <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">KPIスナップショット</h2>
                <Link to="/kpi-tracker" className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700">
                  詳細 <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <p className="text-xl font-bold text-slate-900">
                    ¥{kpiSnapshot.mrr >= 10000
                      ? `${(kpiSnapshot.mrr / 10000).toFixed(1)}万`
                      : kpiSnapshot.mrr.toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">月次収益（MRR）</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <p className="text-xl font-bold text-slate-900">{kpiSnapshot.customers.toLocaleString()}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">顧客数</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <p className={`text-xl font-bold ${kpiSnapshot.churn <= 2 ? "text-emerald-600" : kpiSnapshot.churn <= 5 ? "text-amber-600" : "text-red-600"}`}>
                    {kpiSnapshot.churn}%
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">チャーンレート</p>
                </div>
              </div>
            </div>
          )}

          {/* やることリスト */}
          <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">やることリスト</h2>
              <Link to="/journey" className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700">
                ジャーニーマップ <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-1.5">
              {doneActions.slice(0, 2).map((task) => (
                <div key={task.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <p className="flex-1 text-sm text-slate-400 line-through">{task.label}</p>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${categoryColors[task.category] || "bg-slate-100 text-slate-500"}`}>
                    {task.category}
                  </span>
                </div>
              ))}
              {pendingActions.slice(0, 6).map((task, i) => (
                <div key={task.id} className={`flex items-center gap-3 rounded-xl px-4 py-2.5 ${
                  i === 0 ? "border border-primary-200 bg-primary-50/50" : "hover:bg-slate-50"
                }`}>
                  {i === 0 ? (
                    <TrendingUp className="h-4 w-4 shrink-0 text-primary-500" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-slate-300" />
                  )}
                  <p className="flex-1 text-sm text-slate-800">{task.label}</p>
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${categoryColors[task.category] || "bg-slate-100 text-slate-500"}`}>
                      {task.category}
                    </span>
                    <Link
                      to={task.link}
                      className="rounded-lg bg-primary-50 px-2.5 py-1 text-[11px] font-medium text-primary-600 hover:bg-primary-100"
                    >
                      開始
                    </Link>
                  </div>
                </div>
              ))}
              {pendingActions.length === 0 && (
                <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center">
                  <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-500" />
                  <p className="mt-1 text-sm font-medium text-emerald-700">初期セットアップ完了！</p>
                  <p className="text-xs text-emerald-600">ジャーニーマップで次のフェーズに進みましょう</p>
                </div>
              )}
            </div>
          </div>

          {/* セットアップ進捗 */}
          <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">セットアップ進捗</h2>
              <span className="text-xs font-semibold text-slate-700">{setupPercent}%</span>
            </div>
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-700"
                style={{ width: `${setupPercent}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "会社設立", done: incDone, total: TASK_GROUPS.incorporation.length, color: "#6366f1", link: "/incorporation" },
                { label: "届出・手続き", done: notifDone, total: TASK_GROUPS.notifications.length, color: "#0ea5e9", link: "/notifications" },
                { label: "口座・カード", done: bankDone, total: TASK_GROUPS.bankAndCard.length, color: "#10b981", link: "/bank" },
                { label: "会計設定", done: accDone, total: TASK_GROUPS.accounting.length, color: "#8b5cf6", link: "/settings" },
              ].map((item) => {
                const pct = item.total > 0 ? (item.done / item.total) * 100 : 0;
                return (
                  <Link key={item.label} to={item.link} className="group rounded-xl bg-slate-50 p-3 hover:bg-slate-100 transition-colors">
                    <div className="relative mx-auto mb-2 h-14 w-14">
                      <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
                        <path fill="none" stroke="#e2e8f0" strokeWidth="3.5"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path fill="none" stroke={item.done === item.total ? "#22c55e" : item.color} strokeWidth="3.5"
                          strokeLinecap="round"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          strokeDasharray={`${pct}, 100`}
                          style={{ transition: "stroke-dasharray 0.7s ease" }}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
                        {item.done}/{item.total}
                      </span>
                    </div>
                    <p className="text-center text-[11px] font-medium text-slate-600 group-hover:text-slate-900">{item.label}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* 次のアクション */}
          {nextMilestone ? (
            <div className="rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-accent-50 p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Rocket className="h-4 w-4 text-primary-600" />
                <h3 className="text-sm font-bold text-slate-900">次にやること</h3>
              </div>
              <p className="text-sm font-semibold text-slate-800">{nextMilestone.label}</p>
              <p className="mt-1 text-xs text-slate-500">カテゴリ: {nextMilestone.category}</p>
              <Link
                to={nextMilestone.link}
                className="mt-3 flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white hover:bg-primary-700"
              >
                今すぐ開始 <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-emerald-800">初期タスク完了！</h3>
              </div>
              <p className="text-xs text-emerald-700">次の成長フェーズに向けてジャーニーマップを確認しましょう。</p>
              <Link
                to="/journey"
                className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-900"
              >
                ジャーニーマップを見る <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {/* 未設定の警告 */}
          {!company && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <p className="text-xs font-semibold text-amber-800">会社情報が未設定です</p>
                  <p className="mt-0.5 text-[11px] text-amber-700">補助金マッチングや投資家検索を最適化するため、設定を完了してください。</p>
                  <Link to="/settings" className="mt-2 flex items-center gap-1 text-[11px] font-medium text-amber-800 hover:text-amber-900">
                    <Settings className="h-3 w-3" /> 設定を開く
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* 全ツール */}
          <div className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">全ツール</h3>
              <Lightbulb className="h-3.5 w-3.5 text-slate-300" />
            </div>
            <div className="space-y-0.5">
              {allTools.slice(0, 15).map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.path + item.label} to={item.path} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {item.label}
                    <ChevronRight className="ml-auto h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
