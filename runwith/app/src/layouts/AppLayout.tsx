import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Suspense, useState, useEffect } from "react";
import {
  LayoutDashboard, Map, Building2, Banknote, Landmark, CreditCard,
  LineChart, Presentation, Users, Handshake, Settings,
  Menu, X, LogOut, ChevronLeft, ChevronRight, FileText,
  ScrollText, CalendarClock, Shield, Scale, BarChart3,
  Target, Crown, Lock, Star, ArrowLeft, ArrowRight, ShieldCheck,
  ChevronDown, Mail, Megaphone, Mic, MessageSquare, Search,
} from "lucide-react";
import { useAuthStore } from "../store/auth";
import { useCompanyStore } from "../store/company";
import { useSubscriptionStore, PLAN_LABELS } from "../store/subscription";
import CompanySwitcher from "../components/CompanySwitcher";
import PageLoader from "../components/PageLoader";
import { prefetchRoute } from "../lib/routePrefetch";
import { isAdminUser } from "../lib/admin";
import clsx from "clsx";

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  plan?: "growth" | "pro";
}
interface NavSection {
  label: string;
  collapsible: boolean;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: "メイン",
    collapsible: false,
    items: [
      { path: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
      { path: "/journey", label: "ジャーニーマップ", icon: Map },
    ],
  },
  {
    label: "設立・基盤",
    collapsible: true,
    items: [
      { path: "/naming/generate", label: "ネーミング", icon: Star },
      { path: "/naming", label: "商標チェック", icon: Search },
      { path: "/incorporation", label: "会社設立ナビ", icon: Building2 },
      { path: "/journey/post-registration", label: "登記後の手続き", icon: FileText },
      { path: "/notifications", label: "届出・手続きナビ", icon: ScrollText },
      { path: "/bank", label: "銀行口座開設", icon: Landmark },
      { path: "/credit", label: "法人カード", icon: CreditCard },
      { path: "/labor", label: "労務管理ガイド", icon: Shield, plan: "growth" },
      { path: "/contracts", label: "契約書テンプレート", icon: ScrollText, plan: "growth" },
      { path: "/tax-calendar", label: "税務カレンダー", icon: CalendarClock, plan: "growth" },
    ],
  },
  {
    label: "資金・成長",
    collapsible: true,
    items: [
      { path: "/simulator", label: "事業シミュレーション", icon: LineChart },
      { path: "/funding", label: "補助金・助成金", icon: Banknote, plan: "growth" },
      { path: "/business-plan", label: "事業計画書", icon: FileText },
      { path: "/ip-management", label: "知財管理", icon: Scale, plan: "growth" },
      { path: "/kpi-tracker", label: "KPIトラッカー", icon: BarChart3, plan: "growth" },
      { path: "/marketing", label: "マーケティング", icon: Megaphone },
    ],
  },
  {
    label: "調達・Exit",
    collapsible: true,
    items: [
      { path: "/pitch", label: "ピッチ資料作成", icon: Presentation, plan: "growth" },
      { path: "/pitch-practice", label: "ピッチ練習", icon: Mic },
      { path: "/investor", label: "投資家マッチング", icon: Handshake, plan: "pro" },
      { path: "/team", label: "チーム管理", icon: Users },
      { path: "/team/invite", label: "メンバー招待", icon: Users, plan: "growth" },
      { path: "/dd-preparation", label: "DD対策", icon: Target, plan: "pro" },
      { path: "/ipo-roadmap", label: "IPOロードマップ", icon: Crown, plan: "pro" },
    ],
  },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isDemo, logout } = useAuthStore();
  const isAdmin = isAdminUser(user?.email);
  const { company } = useCompanyStore();
  const { plan } = useSubscriptionStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [fromJourney, setFromJourney] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (label: string) => {
    setOpenSection((prev) => (prev === label ? null : label));
  };

  const [journeyReturnPhase, setJourneyReturnPhase] = useState<string | null>(null);

  useEffect(() => {
    prefetchRoute(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const state = location.state as { fromJourney?: boolean; returnPhase?: string } | null;
    if (state?.fromJourney) {
      setFromJourney(true);
      if (state.returnPhase) {
        setJourneyReturnPhase(state.returnPhase);
      }
    }
    if (location.pathname === "/journey") {
      setFromJourney(false);
      setJourneyReturnPhase(null);
    }
  }, [location]);

  const ideaSteps = [
    { path: "/journey/business-idea", label: "ビジネスアイデア整理" },
    { path: "/journey/market-size", label: "市場規模算定" },
    { path: "/journey/competitor-analysis", label: "競合分析" },
    { path: "/journey/persona", label: "ペルソナ設計" },
    { path: "/journey/bmc", label: "BMC作成" },
    { path: "/journey/pharma-check", label: "薬機法チェック" },
  ];
  const preFoundingSteps = [
    { path: "/journey/company-basics", label: "基本事項の決定" },
    { path: "/incorporation", label: "定款作成・認証・登記" },
    { path: "/journey/post-registration", label: "登記後の手続き" },
    { path: "/bank", label: "法人口座開設" },
    { path: "/credit", label: "法人カード作成" },
  ];
  const allSteps = [...ideaSteps, ...preFoundingSteps];
  const currentStepIdx = allSteps.findIndex(s => s.path === location.pathname);
  const currentIdeaIdx = ideaSteps.findIndex(s => s.path === location.pathname);
  const currentPreIdx = preFoundingSteps.findIndex(s => s.path === location.pathname);

  let nextIdeaStep: { path: string; label: string } | null = null;
  if (currentIdeaIdx >= 0 && currentIdeaIdx < ideaSteps.length - 1) {
    nextIdeaStep = ideaSteps[currentIdeaIdx + 1];
  }
  let nextPreStep: { path: string; label: string } | null = null;
  if (currentPreIdx >= 0 && currentPreIdx < preFoundingSteps.length - 1) {
    nextPreStep = preFoundingSteps[currentPreIdx + 1];
  }
  const nextStep = nextIdeaStep || nextPreStep;

  const planLevel = (p: string) => p === "pro" ? 3 : p === "growth" ? 2 : 1;
  const currentLevel = planLevel(plan);

  const prefetchOnIntent = (path: string) => () => prefetchRoute(path);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200/60 bg-white transition-all duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen",
          collapsed ? "w-[68px]" : "w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className={clsx("flex items-center border-b border-slate-100 px-4 py-3", collapsed ? "justify-center" : "justify-between")}>
          {!collapsed && (
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src="/icon.png" alt="ランウィズ" className="h-8 w-8 object-contain" />
              <span className="text-sm font-bold text-slate-900">ランウィズ</span>
            </Link>
          )}
          {collapsed && (
            <Link to="/dashboard">
              <img src="/icon.png" alt="ランウィズ" className="h-8 w-8 object-contain" />
            </Link>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="hidden rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:block">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {company && (
          <div className="border-b border-slate-100 px-3 py-2.5">
            <CompanySwitcher collapsed={collapsed} />
            {!collapsed && (
              <div className="mt-2 flex items-center gap-1.5 px-1">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                  plan === "pro" ? "bg-accent-100 text-accent-700" :
                  plan === "growth" ? "bg-primary-100 text-primary-700" :
                  "bg-slate-100 text-slate-600"
                }`}>
                  {PLAN_LABELS[plan]}
                </span>
                {company.isMedicalMode && (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">医療</span>
                )}
              </div>
            )}
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navSections.map((section) => {
            const isSectionOpen = !section.collapsible || openSection === section.label;
            const hasActiveItem = section.items.some(
              (item) => location.pathname === item.path || location.pathname.startsWith(item.path + "/")
            );

            return (
              <div key={section.label} className="mb-1">
                {!collapsed && section.collapsible ? (
                  <button
                    onClick={() => toggleSection(section.label)}
                    className={clsx(
                      "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[11px] font-bold tracking-wider uppercase transition-colors",
                      hasActiveItem && !isSectionOpen
                        ? "text-primary-600"
                        : section.label === "設立・基盤"
                        ? "text-blue-500 hover:text-blue-700"
                        : section.label === "資金・成長"
                        ? "text-emerald-500 hover:text-emerald-700"
                        : section.label === "調達・Exit"
                        ? "text-violet-500 hover:text-violet-700"
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <span>{section.label}</span>
                    <ChevronDown
                      className={clsx(
                        "h-3.5 w-3.5 transition-transform duration-200",
                        isSectionOpen && "rotate-180"
                      )}
                    />
                  </button>
                ) : (
                  !collapsed && (
                    <p className="mb-1 px-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                      {section.label}
                    </p>
                  )
                )}

                <div
                  className={clsx(
                    "space-y-0.5 overflow-hidden transition-all duration-200",
                    !isSectionOpen && !collapsed ? "max-h-0" : "max-h-[500px]",
                    isSectionOpen && "mt-0.5 mb-2"
                  )}
                >
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
                    const isLocked = !isDemo && item.plan && planLevel(item.plan) > currentLevel;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        onMouseEnter={prefetchOnIntent(item.path)}
                        onFocus={prefetchOnIntent(item.path)}
                        title={collapsed ? item.label : undefined}
                        className={clsx(
                          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all",
                          collapsed && "justify-center",
                          isActive
                            ? "bg-primary-50 text-primary-700"
                            : isLocked
                            ? "text-slate-400 hover:bg-slate-50"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        )}
                      >
                        <Icon className="h-[18px] w-[18px] shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate">{item.label}</span>
                            {isLocked && <Lock className="h-3 w-3 text-slate-300" />}
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* 管理者メニュー（admin@shigotoku.com のみ表示） */}
        {isAdmin && (
          <div className="border-t border-rose-100 px-3 py-3">
            {!collapsed && (
              <p className="mb-1 px-2 text-[11px] font-semibold tracking-wider text-rose-400 uppercase">
                管理者
              </p>
            )}
            <div className="space-y-0.5">
              {[
                { path: "/admin", label: "管理ダッシュボード", icon: ShieldCheck },
                { path: "/admin/users", label: "ユーザー管理", icon: Users },
                { path: "/admin/leads", label: "リード管理", icon: Mail },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    onMouseEnter={prefetchOnIntent(item.path)}
                    onFocus={prefetchOnIntent(item.path)}
                    title={collapsed ? item.label : undefined}
                    className={clsx(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all",
                      collapsed && "justify-center",
                      isActive
                        ? "bg-rose-50 text-rose-700"
                        : "text-rose-600 hover:bg-rose-50 hover:text-rose-800"
                    )}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="border-t border-slate-100 px-3 py-3">
          <Link
            to="/community"
            onMouseEnter={prefetchOnIntent('/community')}
            onFocus={prefetchOnIntent('/community')}
            className={clsx(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all",
              collapsed && "justify-center",
              location.pathname === "/community"
                ? "bg-violet-50 text-violet-700"
                : "text-violet-600 hover:bg-violet-50 hover:text-violet-800"
            )}
          >
            <MessageSquare className="h-[18px] w-[18px]" />
            {!collapsed && "コミュニティ"}
          </Link>
        </div>
        <div className="border-t border-slate-100 px-3 py-3">
          <Link
            to="/settings"
            onMouseEnter={prefetchOnIntent('/settings')}
            onFocus={prefetchOnIntent('/settings')}
            className={clsx(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-100",
              collapsed && "justify-center"
            )}
          >
            <Settings className="h-[18px] w-[18px]" />
            {!collapsed && "設定"}
          </Link>
          <button
            onClick={async () => { try { if (isDemo) { logout(); } else { await signOut(); } } catch { /* ignore */ } finally { navigate("/"); } }}
            className={clsx(
              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-100",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="h-[18px] w-[18px]" />
            {!collapsed && "ログアウト"}
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/60 bg-white/80 px-4 py-3 backdrop-blur-xl lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden lg:block">
            {company && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="rounded-md bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                  {company.phase === "idea" ? "アイデア段階" :
                   company.phase === "pre_founding" ? "創業準備" :
                   company.phase === "founded" ? "設立済み" :
                   company.phase === "seed" ? "シード" :
                   company.phase === "early" ? "アーリー" :
                   company.phase === "series_a" ? "シリーズA" :
                   company.phase === "series_b_plus" ? "シリーズB+" :
                   company.phase === "pre_ipo" ? "IPO準備" :
                   company.phase}
                </span>
                {company.isMedicalMode && (
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">医療モード</span>
                )}
              </div>
            )}
          </div>

          <Link to="/settings" className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 transition-colors hover:bg-slate-100">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover border border-slate-200" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                {user?.name?.[0] || "U"}
              </div>
            )}
            <span className="hidden text-sm font-medium text-slate-700 sm:block">
              {user?.name || "ユーザー"}<span className="text-slate-400 font-normal"> さん</span>
            </span>
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
          {fromJourney && location.pathname !== "/journey" && (
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Link
                to="/journey"
                state={journeyReturnPhase ? { scrollToPhase: journeyReturnPhase } : undefined}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-sm font-medium text-primary-700 transition-all hover:bg-primary-100 sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4" />
                ジャーニーマップに戻る
              </Link>
              {nextStep && (
                <Link
                  to={nextStep.path}
                  state={{ fromJourney: true }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-100 sm:w-auto"
                >
                  <span className="truncate">次へ：{nextStep.label}</span>
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </Link>
              )}
            </div>
          )}
          <div className="mx-auto max-w-6xl">
            <Suspense fallback={<PageLoader compact />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
